import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { bookShipment, calculateTotalWeight } from "@/lib/icarry";
import { Resend } from "resend";
import type {
  PlaceOrderRequest,
  PlaceOrderResponse,
  OrderItemData,
} from "@/lib/checkout-types";
import { saveOrderWithHistory } from "@/lib/orders";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const ICARRY_PICKUP_ADDRESS_ID = parseInt(process.env.ICARRY_PICKUP_ADDRESS_ID || "0", 10);
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
  const rand = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit random
  return `AAU-${yy}${mm}${dd}-${rand}`;
}

/**
 * POST /api/checkout/place-order
 *
 * Creates an order in Strapi, books shipment on iCarry (for COD),
 * and returns order confirmation.
 *
 * Body: PlaceOrderRequest + { idToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderData = body as PlaceOrderRequest;

    const session = await getSession();
    if (!session) {
      return NextResponse.json<PlaceOrderResponse>(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // ─── Validate required fields ───
    const {
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      items,
      paymentMethod,
      shippingCost,
      notes,
    } = orderData;

    if (!customerName || !customerPhone || !shippingAddress || !items?.length) {
      return NextResponse.json<PlaceOrderResponse>(
        { success: false, error: "Missing required order information" },
        { status: 400 }
      );
    }

    // ─── Calculate totals server-side (prevent client manipulation) ───
    const subtotal = items.reduce(
      (sum: number, item: OrderItemData) => sum + item.price * item.quantity,
      0
    );
    const serverShippingCost = subtotal < 499 ? 80 : 0;
    const totalAmount = subtotal + serverShippingCost;

    // ─── Generate order ID ───
    const orderId = generateOrderId();

    // ─── Determine initial statuses ───
    const initialOrderStatus = "confirmed";
    const paymentStatus = paymentMethod === "cod" ? "pending" : "pending";

    // ─── Create order in Strapi with initial history ───
    const payloadData = {
      orderId,
      // orderStatus is handled by the helper
      paymentMethod,
      paymentStatus,
      customerEmail: customerEmail || null,
      subtotal,
      shippingCost: serverShippingCost,
      totalAmount,
      customer: session.customerId,
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
      orderItem: items.map((item: OrderItemData) => ({
        product: item.product, // Strapi relation ID
        productName: item.productName,
        slug: item.slug,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      })),
      notes: notes || null,
    };

    let strapiResponseJson;
    try {
      strapiResponseJson = await saveOrderWithHistory(
        null, // No documentId for creation
        null, // No current status
        null, // No current history
        initialOrderStatus,
        "system",
        "Order placed",
        payloadData
      );
    } catch (err: any) {
      console.error("Strapi order creation failed:", err);
      return NextResponse.json<PlaceOrderResponse>(
        { success: false, error: "System is currently in maintenance mode." },
        { status: 503 }
      );
    }

    const documentId = strapiResponseJson.data.documentId;

    // ─── Book shipment on iCarry (COD orders only for now) ───
    if (paymentMethod === "cod") {
      try {
        const totalWeight = calculateTotalWeight(items);
        const productDescription = items
          .map(
            (item: OrderItemData) =>
              `${item.productName} x${item.quantity}`
          )
          .join(", ");

        const bookingResult = await bookShipment({
          consigneeName: customerName,
          consigneePhone: customerPhone,
          consigneeAddress: `${shippingAddress.addressLine1}${shippingAddress.addressLine2 ? ", " + shippingAddress.addressLine2 : ""}`,
          consigneeCity: shippingAddress.city,
          consigneeState: shippingAddress.state,
          consigneePincode: shippingAddress.pincode,
          orderValue: totalAmount,
          isCod: true,
          totalWeightGrams: totalWeight,
          orderId,
          productDescription,
          pickupAddressId: ICARRY_PICKUP_ADDRESS_ID,
        });

        // ─── Feature Flag: Skip updating icarryShipmentId in strapi if disabled ───
        const isICarryShipmentId = process.env.FETCH_ICARRY_SHIPMENT_ID === "true";

        // Update order with shipment ID (Draft booking)
        if (isICarryShipmentId && bookingResult.shipment_id) {
          const updateRes = await fetch(`${STRAPI_URL}/api/orders/${documentId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${STRAPI_TOKEN}`,
            },
            body: JSON.stringify({
              data: {
                icarryShipmentId: String(bookingResult.shipment_id),
              },
            }),
          });
          if (!updateRes.ok) {
            const errorText = await updateRes.text().catch(() => "");
            console.error("Failed to update Strapi with shipment ID:", updateRes.status, errorText);
          }
        }
      } catch (bookingError) {
        // Log but don't fail the order — shipment can be booked manually
        console.error("iCarry booking failed (order still created):", bookingError);
      }
    }

    // ─── Notify admin of new order via email (fire-and-forget) ───
    if (adminEmail) {
      const itemsHtml = items
        .map(
          (item: OrderItemData) =>
            `<tr>
              <td style="padding:6px 12px;border-bottom:1px solid #eee">${item.productName}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
              <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
            </tr>`
        )
        .join("");

      resend.emails.send({
        from: `Aaushadhi Wellness <${fromEmail}>`,
        to: [adminEmail],
        subject: `🛒 New Order: ${orderId} — ₹${totalAmount.toLocaleString("en-IN")}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
            <h2 style="color:#5C6B2E;margin-bottom:4px">New Order Received</h2>
            <p style="color:#888;font-size:13px;margin-top:0">Aaushadhi Wellness Admin Alert</p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
              <tr><td style="padding:6px 12px;color:#888;width:140px">Order ID</td><td style="padding:6px 12px;font-weight:bold">${orderId}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Customer</td><td style="padding:6px 12px">${customerName}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Email</td><td style="padding:6px 12px">${customerEmail}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Phone</td><td style="padding:6px 12px">${customerPhone}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Payment</td><td style="padding:6px 12px;text-transform:uppercase;font-weight:bold;color:#5C6B2E">${paymentMethod}</td></tr>
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

            ${notes ? `<p style="margin-top:16px;font-size:13px;color:#555"><strong>Customer Note:</strong> ${notes}</p>` : ""}

            <p style="margin-top:24px;font-size:12px;color:#aaa">This is an automated notification from Aaushadhi Wellness.</p>
          </div>
        `,
      }).catch((err: Error) => console.error("Admin notification email failed:", err));
    }

    return NextResponse.json<PlaceOrderResponse>({
      success: true,
      data: {
        orderId,
        orderStatus: initialOrderStatus,
        paymentMethod: paymentMethod as "cod" | "online",
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Place order error:", error);
    return NextResponse.json<PlaceOrderResponse>(
      { success: false, error: "System is currently in maintenance mode." },
      { status: 503 }
    );
  }
}
