import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { bookShipment, calculateTotalWeight } from "@/lib/icarry";
import { saveOrderWithHistory } from "@/lib/orders";
import { Resend } from "resend";
import type {
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  OrderItemData,
} from "@/lib/checkout-types";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const ICARRY_PICKUP_ADDRESS_ID = parseInt(
  process.env.ICARRY_PICKUP_ADDRESS_ID || "0",
  10
);
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "";

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
 * POST /api/checkout/payment-verify
 *
 * Called by the client immediately after the Razorpay modal reports a
 * successful payment.
 *
 * Security model:
 *  1. Verify Razorpay HMAC-SHA256 signature.
 *  2. Idempotency check — if a Strapi order already exists for this
 *     razorpayOrderId (e.g., from the webhook), return it immediately.
 *  3. Re-fetch live product prices from Strapi and recompute the total
 *     to ensure the client payload has not been tampered with.
 *  4. Verify the recalculated amount matches the Razorpay order amount
 *     (rounded to paise) to prevent under-payment exploits.
 *  5. Create the Strapi order with paymentStatus = "paid".
 *  6. Book a DRAFT iCarry shipment (save_only=1).
 *  7. Send admin notification email.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<VerifyPaymentResponse>(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body: VerifyPaymentRequest = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      items,
      paymentMethod,
      notes: customerNotes,
    } = body;

    // ─── 1. Verify Razorpay signature ──────────────────────────────────
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json<VerifyPaymentResponse>(
        { success: false, error: "Missing payment details." },
        { status: 400 }
      );
    }

    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      console.error(
        `Invalid Razorpay signature for order ${razorpayOrderId} / payment ${razorpayPaymentId}`
      );
      return NextResponse.json<VerifyPaymentResponse>(
        { success: false, error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // ─── 2. Idempotency check ───────────────────────────────────────────
    // If the webhook already created the order (e.g., browser closed mid-flow),
    // return the existing order to avoid duplicates.
    const existingOrderRes = await fetch(
      `${STRAPI_URL}/api/orders?filters[paymentGatewayOrderId][$eq]=${encodeURIComponent(razorpayOrderId)}&fields[0]=orderId&fields[1]=orderStatus&fields[2]=totalAmount`,
      {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        cache: "no-store",
      }
    );

    if (existingOrderRes.ok) {
      const existingJson = await existingOrderRes.json();
      if (existingJson.data?.length > 0) {
        const existing = existingJson.data[0];
        console.log(
          `[payment-verify] Idempotency hit — order ${existing.orderId} already exists for razorpay order ${razorpayOrderId}`
        );
        return NextResponse.json<VerifyPaymentResponse>({
          success: true,
          data: {
            orderId: existing.orderId,
            orderStatus: existing.orderStatus,
            totalAmount: existing.totalAmount,
          },
        });
      }
    }

    // ─── 3. Re-fetch live prices from Strapi ───────────────────────────
    if (!items?.length || !customerName || !customerPhone || !shippingAddress) {
      return NextResponse.json<VerifyPaymentResponse>(
        { success: false, error: "Missing required order information." },
        { status: 400 }
      );
    }

    const productIds = [...new Set(items.map((i) => i.product))];
    const filterParams = productIds
      .map((id, idx) => `filters[$or][${idx}][id][$eq]=${id}`)
      .join("&");

    const productsRes = await fetch(
      `${STRAPI_URL}/api/products?${filterParams}&fields[0]=id&fields[1]=price&fields[2]=productName&fields[3]=slug`,
      {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!productsRes.ok) {
      return NextResponse.json<VerifyPaymentResponse>(
        { success: false, error: "System is currently in maintenance mode." },
        { status: 503 }
      );
    }

    const productsJson = await productsRes.json();
    const productMap = new Map<number, any>(); // id → product data
    for (const p of productsJson.data ?? []) {
      productMap.set(p.id, p);
    }

    for (const item of items) {
      if (!productMap.has(item.product)) {
        return NextResponse.json<VerifyPaymentResponse>(
          { success: false, error: `Product ID ${item.product} not found.` },
          { status: 400 }
        );
      }
    }

    const subtotal = items.reduce((sum, item) => {
      return sum + (productMap.get(item.product)?.price ?? 0) * item.quantity;
    }, 0);
    const serverShippingCost = subtotal < 499 ? 80 : 0;
    const totalAmount = subtotal + serverShippingCost;
    const amountInPaise = Math.round(totalAmount * 100);

    // ─── 4. Verify the amount was not under-paid ────────────────────────
    // We stored the correct amount in the Razorpay order during /create-razorpay-order.
    // The client cannot alter it — mismatch here means tampering.
    // We re-fetch from Razorpay to compare.
    const rzpOrderRes = await fetch(
      `https://api.razorpay.com/v1/orders/${razorpayOrderId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    if (rzpOrderRes.ok) {
      const rzpOrder = await rzpOrderRes.json();
      if (rzpOrder.amount && rzpOrder.amount !== amountInPaise) {
        console.error(
          `[payment-verify] Amount mismatch: Razorpay=${rzpOrder.amount} paise, Server recalculated=${amountInPaise} paise. Order ${razorpayOrderId}`
        );
        return NextResponse.json<VerifyPaymentResponse>(
          {
            success: false,
            error: "Payment amount mismatch. Please contact support.",
          },
          { status: 400 }
        );
      }
    }

    // ─── 5. Build enriched order items using fresh Strapi data ─────────
    const enrichedItems: OrderItemData[] = items.map((item) => {
      const product = productMap.get(item.product);
      return {
        product: item.product,
        productName: product?.productName ?? item.productName ?? "",
        slug: product?.slug ?? item.slug ?? "",
        price: product?.price ?? item.price,
        quantity: item.quantity,
        imageUrl: product?.mainImageUrl ?? item.imageUrl ?? "",
      };
    });

    // ─── 6. Create Strapi order ─────────────────────────────────────────
    const orderId = generateOrderId();

    const payloadData = {
      orderId,
      paymentMethod: "online",
      paymentStatus: "paid",
      customerEmail: customerEmail || null,
      subtotal,
      shippingCost: serverShippingCost,
      totalAmount,
      customer: session.customerId,
      paymentGatewayOrderId: razorpayOrderId,
      paymentGatewayPaymentId: razorpayPaymentId,
      paymentGatewaySignature: razorpaySignature,
      shippingAddress: {
        name: customerName,
        mobile: customerPhone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || "",
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country || "India",
      },
      orderItem: enrichedItems.map((item) => ({
        product: item.product,
        productName: item.productName,
        slug: item.slug,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      })),
      notes: customerNotes || null,
    };

    let strapiResponseJson;
    try {
      strapiResponseJson = await saveOrderWithHistory(
        null,
        null,
        null,
        "confirmed",
        "system",
        "Online payment verified",
        payloadData
      );
    } catch (err: any) {
      require("fs").appendFileSync("d:/Desktop/CSC/aaushadhi/aaushadhi-web/error.log", "Strapi order creation failed: " + (err.message || String(err)) + "\n");
      console.error("[payment-verify] Strapi order creation failed:", err);
      return NextResponse.json<VerifyPaymentResponse>(
        { success: false, error: "System is currently in maintenance mode." },
        { status: 503 }
      );
    }

    const documentId = strapiResponseJson?.data?.documentId;

    // ─── 7. Book draft iCarry shipment (save_only=1) ────────────────────
    try {
      const totalWeight = calculateTotalWeight(enrichedItems);
      const productDescription = enrichedItems
        .map((item) => `${item.productName} x${item.quantity}`)
        .join(", ");

      const bookingResult = await bookShipment({
        consigneeName: customerName,
        consigneePhone: customerPhone,
        consigneeAddress: `${shippingAddress.addressLine1}${
          shippingAddress.addressLine2
            ? ", " + shippingAddress.addressLine2
            : ""
        }`,
        consigneeCity: shippingAddress.city,
        consigneeState: shippingAddress.state,
        consigneePincode: shippingAddress.pincode,
        orderValue: totalAmount,
        isCod: false, // Prepaid online order
        totalWeightGrams: totalWeight,
        orderId,
        productDescription,
        pickupAddressId: ICARRY_PICKUP_ADDRESS_ID,
      });

      const isICarryShipmentId =
        process.env.FETCH_ICARRY_SHIPMENT_ID === "true";

      if (isICarryShipmentId && bookingResult.shipment_id && documentId) {
        await fetch(`${STRAPI_URL}/api/orders/${documentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_TOKEN}`,
          },
          body: JSON.stringify({
            data: { icarryShipmentId: String(bookingResult.shipment_id) },
          }),
        }).catch(() => {});
      }
    } catch (bookingError) {
      // Non-fatal — order is already paid. Flag for the cron job's orphan recovery pass.
      console.error(
        "[payment-verify] iCarry draft booking failed (order still created):",
        bookingError
      );
      if (documentId) {
        await fetch(`${STRAPI_URL}/api/orders/${documentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_TOKEN}`,
          },
          body: JSON.stringify({ data: { needsManualReview: true } }),
        }).catch((err) =>
          console.error("[payment-verify] Failed to set needsManualReview:", err)
        );
      }
    }

    // ─── 8. Notify admin ────────────────────────────────────────────────
    if (adminEmail) {
      const itemsHtml = enrichedItems
        .map(
          (item) =>
            `<tr>
              <td style="padding:6px 12px;border-bottom:1px solid #eee">${item.productName}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
            </tr>`
        )
        .join("");

      resend.emails
        .send({
          from: `Aaushadhi Wellness <${fromEmail}>`,
          to: [adminEmail],
          subject: `💳 New Online Order: ${orderId} — ₹${totalAmount.toLocaleString("en-IN")}`,
          html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
            <h2 style="color:#5C6B2E;margin-bottom:4px">New Online Order Received</h2>
            <p style="color:#888;font-size:13px;margin-top:0">Aaushadhi Wellness Admin Alert</p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
              <tr><td style="padding:6px 12px;color:#888;width:140px">Order ID</td><td style="padding:6px 12px;font-weight:bold">${orderId}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Customer</td><td style="padding:6px 12px">${customerName}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Email</td><td style="padding:6px 12px">${customerEmail || "—"}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Phone</td><td style="padding:6px 12px">${customerPhone}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Payment</td><td style="padding:6px 12px;text-transform:uppercase;font-weight:bold;color:#5C6B2E">ONLINE (PAID)</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Razorpay ID</td><td style="padding:6px 12px;font-size:12px">${razorpayPaymentId}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Total</td><td style="padding:6px 12px;font-size:16px;font-weight:bold">₹${totalAmount.toLocaleString("en-IN")}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Address</td><td style="padding:6px 12px">${shippingAddress.addressLine1}${shippingAddress.addressLine2 ? ", " + shippingAddress.addressLine2 : ""}, ${shippingAddress.city}, ${shippingAddress.state} — ${shippingAddress.pincode}</td></tr>
            </table>

            <h3 style="color:#5C6B2E;margin-bottom:8px;font-size:14px">Items Ordered</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#f5f5f0">
                  <th style="padding:6px 12px;text-align:left">Product</th>
                  <th style="padding:6px 12px;text-align:center">Qty</th>
                  <th style="padding:6px 12px;text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            ${customerNotes ? `<p style="margin-top:16px;font-size:13px;color:#555"><strong>Customer Note:</strong> ${customerNotes}</p>` : ""}

            <p style="margin-top:24px;font-size:12px;color:#aaa">This is an automated notification from Aaushadhi Wellness.</p>
          </div>
        `,
        })
        .catch((err: Error) =>
          console.error("[payment-verify] Admin email failed:", err)
        );
    }

    return NextResponse.json<VerifyPaymentResponse>({
      success: true,
      data: {
        orderId,
        orderStatus: "confirmed",
        totalAmount,
      },
    });
  } catch (error: any) {
    require("fs").appendFileSync("d:/Desktop/CSC/aaushadhi/aaushadhi-web/error.log", "Unexpected error: " + (error.message || String(error)) + "\n" + (error.stack || "") + "\n");
    console.error("[payment-verify] Unexpected error:", error);
    return NextResponse.json<VerifyPaymentResponse>(
      { success: false, error: "System is currently in maintenance mode." },
      { status: 503 }
    );
  }
}
