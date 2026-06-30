import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { bookShipment, calculateTotalWeight } from "@/lib/icarry";
import type {
  PlaceOrderRequest,
  PlaceOrderResponse,
  OrderItemData,
} from "@/lib/checkout-types";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const ICARRY_PICKUP_ADDRESS_ID = parseInt(process.env.ICARRY_PICKUP_ADDRESS_ID || "0", 10);

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
    const { idToken, ...orderData } = body as PlaceOrderRequest & {
      idToken: string;
    };

    // ─── Verify Firebase ID token ───
    if (!idToken) {
      return NextResponse.json<PlaceOrderResponse>(
        { success: false, error: "Phone verification required" },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch {
      return NextResponse.json<PlaceOrderResponse>(
        { success: false, error: "Phone verification expired. Please verify again." },
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
      courierName,
      courierId,
      shippingCost,
      courierEstimate,
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
    const totalAmount = subtotal + shippingCost;

    // ─── Generate order ID ───
    const orderId = generateOrderId();

    // ─── Determine initial statuses ───
    const orderStatus = paymentMethod === "cod" ? "confirmed" : "pending";
    const paymentStatus = paymentMethod === "cod" ? "pending" : "pending";

    // ─── Create order in Strapi ───
    const strapiPayload = {
      data: {
        orderId,
        orderStatus,
        paymentMethod,
        paymentStatus,
        customerName,
        customerPhone: customerPhone || decodedToken.phone_number || "",
        customerEmail: customerEmail || null,
        subtotal,
        shippingCost,
        totalAmount,
        shippingAddress: {
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
        courierName,
        courierEstimate,
        notes: notes || null,
      },
    };

    const strapiRes = await fetch(`${STRAPI_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify(strapiPayload),
    });

    if (!strapiRes.ok) {
      const errorText = await strapiRes.text();
      console.error("Strapi order creation failed:", errorText);
      return NextResponse.json<PlaceOrderResponse>(
        { success: false, error: "Failed to create order. Please try again." },
        { status: 500 }
      );
    }

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
          courierId,
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

        // Update order with tracking details if booking succeeded
        if (bookingResult.shipment_id || bookingResult.awb) {
          await fetch(`${STRAPI_URL}/api/orders/${orderId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${STRAPI_TOKEN}`,
            },
            body: JSON.stringify({
              data: {
                icarryShipmentId: bookingResult.shipment_id || null,
                trackingId: bookingResult.awb || null,
                trackingUrl: bookingResult.tracking_url || null,
                orderStatus: "processing",
              },
            }),
          });
        }
      } catch (bookingError) {
        // Log but don't fail the order — shipment can be booked manually
        console.error("iCarry booking failed (order still created):", bookingError);
      }
    }

    return NextResponse.json<PlaceOrderResponse>({
      success: true,
      data: {
        orderId,
        orderStatus: orderStatus as "confirmed" | "pending",
        paymentMethod: paymentMethod as "cod" | "online",
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Place order error:", error);
    return NextResponse.json<PlaceOrderResponse>(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
