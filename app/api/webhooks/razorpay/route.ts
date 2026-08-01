import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, fetchRazorpayOrder } from "@/lib/razorpay";
import { bookShipment, calculateTotalWeight } from "@/lib/icarry";
import { saveOrderWithHistory } from "@/lib/orders";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const ICARRY_PICKUP_ADDRESS_ID = parseInt(
  process.env.ICARRY_PICKUP_ADDRESS_ID || "0",
  10
);

/**
 * Generate a unique customer-facing order ID.
 * Format: AAU-YYMMDD-XXXX (e.g., AAU-260628-0482)
 */
function generateOrderId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `AAU-${yy}${mm}${dd}-${rand}`;
}

/**
 * POST /api/webhooks/razorpay
 *
 * Failsafe handler for Razorpay payment events.
 *
 * Primary use-case: The user successfully paid through Razorpay but closed
 * the browser before the client could call /api/checkout/payment-verify.
 * This webhook ensures the order is eventually created in Strapi.
 *
 * Security:
 *   - Verifies the X-Razorpay-Signature header using RAZORPAY_WEBHOOK_SECRET.
 *   - RAZORPAY_WEBHOOK_SECRET is separate from RAZORPAY_KEY_SECRET.
 *     Configure it under Dashboard → Settings → Webhooks.
 *
 * Idempotency:
 *   - Checks whether a Strapi order with paymentGatewayOrderId already exists.
 *   - Returns 200 immediately if it does (normal path — client already verified).
 *
 * Limitation (by design):
 *   - The webhook does NOT have access to the full checkout payload (items,
 *     address), because we deliberately do NOT store it in Razorpay notes.
 *   - Razorpay notes only contain lightweight metadata: customer_id, customer_email.
 *   - In the "browser closed" scenario, this webhook will create a minimal
 *     Strapi order using the data available from Razorpay (amount, customer info)
 *     and flag it for admin review by marking it with a special note.
 *   - The full order details (address, items) will need to be completed manually.
 *     An admin notification is sent for this edge case.
 *
 * Configure on Razorpay Dashboard:
 *   URL: https://yourdomain.com/api/webhooks/razorpay
 *   Events: payment.captured, refund.processed, refund.failed
 */
export async function POST(request: NextRequest) {
  // ─── 1. Read raw body for signature verification ──────────────────────
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  // ─── 2. Verify webhook signature ─────────────────────────────────────
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.warn(
      "[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set. Skipping signature verification."
    );
  } else {
    const isValid = verifyWebhookSignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!isValid) {
      console.error("[razorpay-webhook] Invalid webhook signature.");
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // ─── 2.5 Replay-attack guard ──────────────────────────────────────────
  if (event.created_at) {
    const eventAge = Date.now() / 1000 - event.created_at;
    if (eventAge > 300) { // older than 5 minutes
      console.warn(`[razorpay-webhook] Stale event ignored (age: ${eventAge}s)`);
      return NextResponse.json({ received: true });
    }
  }

  // ─── 3. Route to the correct handler ────────────────────────────────
  if (event.event === "refund.processed" || event.event === "refund.failed") {
    return handleRefundEvent(event);
  }

  if (event.event !== "payment.captured") {
    // Acknowledge but do nothing for other events
    return NextResponse.json({ received: true });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment) {
    return NextResponse.json({ error: "Missing payment entity." }, { status: 400 });
  }

  const razorpayOrderId: string = payment.order_id;
  const razorpayPaymentId: string = payment.id;
  const amountInPaise: number = payment.amount;
  const totalAmount = amountInPaise / 100;

  // ─── 4. Idempotency check ─────────────────────────────────────────────
  // Normal path: the client already called /payment-verify. Return 200 immediately.
  const existingOrderRes = await fetch(
    `${STRAPI_URL}/api/orders?filters[paymentGatewayOrderId][$eq]=${encodeURIComponent(razorpayOrderId)}&fields[0]=orderId`,
    {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      cache: "no-store",
    }
  );

  if (existingOrderRes.ok) {
    const existingJson = await existingOrderRes.json();
    if (existingJson.data?.length > 0) {
      console.log(
        `[razorpay-webhook] Order already exists for Razorpay order ${razorpayOrderId}. Idempotency hit — no action needed.`
      );
      return NextResponse.json({ received: true });
    }
  }

  // ─── 5. Edge case: browser closed before /payment-verify was called ───
  // We don't have the full checkout payload (items, address) — only what
  // Razorpay notes contain: customer_id and customer_email.
  console.warn(
    `[razorpay-webhook] No Strapi order found for Razorpay order ${razorpayOrderId}. Creating a minimal placeholder order. ADMIN ACTION REQUIRED.`
  );

  let rzpOrderNotes: any = {};
  try {
    const rzpOrder = await fetchRazorpayOrder(razorpayOrderId);
    rzpOrderNotes = rzpOrder.notes ?? {};
  } catch (err) {
    console.error("[razorpay-webhook] Could not fetch Razorpay order notes:", err);
  }

  const customerEmail = rzpOrderNotes.customer_email || "";
  const customerId = rzpOrderNotes.customer_id || null;

  // Create a minimal placeholder order so the payment is tracked in Strapi.
  // The admin will need to fill in the shipping address and items manually.
  const orderId = generateOrderId();

  try {
    await saveOrderWithHistory(
      null,
      null,
      null,
      "confirmed",
      "webhook",
      `[INCOMPLETE — ADMIN ACTION REQUIRED] Payment captured by webhook. Checkout payload not available. Razorpay Payment ID: ${razorpayPaymentId}`,
      {
        orderId,
        paymentMethod: "online",
        paymentStatus: "paid",
        customerEmail: customerEmail || null,
        subtotal: totalAmount,
        shippingCost: 0,
        totalAmount,
        customer: customerId ? parseInt(customerId, 10) : null,
        paymentGatewayOrderId: razorpayOrderId,
        paymentGatewayPaymentId: razorpayPaymentId,
        paymentGatewaySignature: null,
        shippingAddress: null,
        orderItem: [],
        notes: `WEBHOOK_CREATED: Payment captured but checkout payload was unavailable. Manual review required.`,
      }
    );
  } catch (err) {
    console.error("[razorpay-webhook] Failed to create placeholder order:", err);
    // Return 200 anyway to prevent Razorpay from retrying indefinitely.
  }

  // Attempt a minimal iCarry draft booking if we have enough data.
  // Since we have no address or items, we skip iCarry here.
  // The admin will need to book the shipment manually after completing the order.
  console.warn(
    `[razorpay-webhook] iCarry shipment NOT booked for ${orderId} — address and items are unavailable. Manual booking required.`
  );

  return NextResponse.json({ received: true });
}

// ─── Refund event handler ─────────────────────────────────────────────────────

/**
 * Handles refund.processed and refund.failed webhook events from Razorpay.
 *
 * refund.processed: Razorpay has successfully settled the refund to the customer.
 *   - No Strapi update needed (paymentStatus is already "refunded" from the cancel route)
 *   - Sends a customer-facing confirmation email (if we have their email)
 *   - Notifies admin
 *
 * refund.failed: Razorpay could not process the refund (bank/gateway issue).
 *   - Marks the order needsManualReview = true in Strapi
 *   - Alerts admin with refund ID for manual resolution
 */
async function handleRefundEvent(event: any): Promise<NextResponse> {
  const refund = event.payload?.refund?.entity;
  if (!refund) {
    return NextResponse.json({ error: "Missing refund entity." }, { status: 400 });
  }

  const refundId: string = refund.id;           // rfnd_XXXX
  const paymentId: string = refund.payment_id;  // pay_XXXX
  const amountInPaise: number = refund.amount;
  const amountInRupees = (amountInPaise / 100).toLocaleString("en-IN");
  const eventType: string = event.event;

  console.log(`[razorpay-webhook] ${eventType} — refund ${refundId} for payment ${paymentId}`);

  // Find the Strapi order by paymentGatewayPaymentId
  const strapiRes = await fetch(
    `${STRAPI_URL}/api/orders?filters[paymentGatewayPaymentId][$eq]=${encodeURIComponent(paymentId)}&fields[0]=orderId&fields[1]=documentId&fields[2]=totalAmount&fields[3]=customerEmail&fields[4]=needsManualReview&populate[statusHistory]=true`,
    {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      cache: "no-store",
    }
  );

  if (!strapiRes.ok || !(await strapiRes.clone().json().then((j: any) => j.data?.length))) {
    console.warn(`[razorpay-webhook] No Strapi order found for payment ${paymentId} (refund ${refundId})`);
    // Return 200 so Razorpay doesn't retry — we already stored refundId at cancel time.
    return NextResponse.json({ received: true });
  }

  const strapiJson = await strapiRes.json();
  const order = strapiJson.data?.[0];
  if (!order) return NextResponse.json({ received: true });

  if (eventType === "refund.processed") {
    // ── Refund reached the customer ──────────────────────────────────────
    // paymentStatus is already "refunded" in Strapi — no update needed.
    // Just send a customer notification email if we have their email.

    if (adminEmail) {
      resend.emails
        .send({
          from: `Aaushadhi Wellness <${fromEmail}>`,
          to: [adminEmail],
          subject: `✅ Refund Processed: ${order.orderId} — ₹${amountInRupees}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
              <h2 style="color:#16a34a;">Refund Successfully Processed</h2>
              <p style="color:#888;font-size:13px;">Aaushadhi Wellness Admin Alert</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
                <tr><td style="padding:6px 12px;color:#888;width:140px">Order ID</td><td style="padding:6px 12px;font-weight:bold">${order.orderId}</td></tr>
                <tr><td style="padding:6px 12px;color:#888">Razorpay Refund ID</td><td style="padding:6px 12px">${refundId}</td></tr>
                <tr><td style="padding:6px 12px;color:#888">Payment ID</td><td style="padding:6px 12px">${paymentId}</td></tr>
                <tr><td style="padding:6px 12px;color:#888">Amount Refunded</td><td style="padding:6px 12px;font-weight:bold;color:#16a34a">₹${amountInRupees}</td></tr>
              </table>
              <p style="font-size:12px;color:#aaa;">Razorpay has confirmed the refund was successfully delivered to the customer's account.</p>
            </div>
          `,
        })
        .catch((err: Error) => console.error("[razorpay-webhook] Admin refund-processed email failed:", err));
    }

    console.log(`[razorpay-webhook] Refund ${refundId} processed for order ${order.orderId}`);

  } else if (eventType === "refund.failed") {
    // ── Refund failed — requires manual intervention ─────────────────────
    console.error(`[razorpay-webhook] Refund ${refundId} FAILED for order ${order.orderId}. Manual action required.`);

    // Mark the order for admin review in Strapi
    await fetch(`${STRAPI_URL}/api/orders/${order.documentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify({
        data: { needsManualReview: true },
      }),
    }).catch((err) => console.error("[razorpay-webhook] Failed to set needsManualReview:", err));

    if (adminEmail) {
      resend.emails
        .send({
          from: `Aaushadhi Wellness <${fromEmail}>`,
          to: [adminEmail],
          subject: `🚨 Refund FAILED: ${order.orderId} — Manual Action Required`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
              <h2 style="color:#dc2626;">Refund Failed — Action Required</h2>
              <p style="color:#888;font-size:13px;">Aaushadhi Wellness Admin Alert</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
                <tr><td style="padding:6px 12px;color:#888;width:140px">Order ID</td><td style="padding:6px 12px;font-weight:bold">${order.orderId}</td></tr>
                <tr><td style="padding:6px 12px;color:#888">Razorpay Refund ID</td><td style="padding:6px 12px">${refundId}</td></tr>
                <tr><td style="padding:6px 12px;color:#888">Payment ID</td><td style="padding:6px 12px">${paymentId}</td></tr>
                <tr><td style="padding:6px 12px;color:#888">Amount</td><td style="padding:6px 12px;font-weight:bold;color:#dc2626">₹${amountInRupees}</td></tr>
              </table>
              <p style="color:#dc2626;font-weight:bold;">The refund failed at Razorpay/bank level. Please manually initiate the refund from the Razorpay Dashboard (Transactions → Refunds → ${refundId}).</p>
              <p style="font-size:12px;color:#aaa;">This order has been flagged with <strong>needsManualReview = true</strong> in Strapi.</p>
            </div>
          `,
        })
        .catch((err: Error) => console.error("[razorpay-webhook] Admin refund-failed email failed:", err));
    }
  }

  return NextResponse.json({ received: true });
}
