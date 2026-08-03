import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createRazorpayOrder } from "@/lib/razorpay";
import type {
  CreateRazorpayOrderRequest,
  CreateRazorpayOrderResponse,
} from "@/lib/checkout-types";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

/**
 * POST /api/checkout/create-razorpay-order
 *
 * Accepts a lightweight checkout context (items + address metadata).
 * Fetches live product prices from Strapi to calculate the total server-side,
 * then creates a Razorpay order and returns the order ID + amount to the client.
 *
 * Only lightweight metadata (customer_id, customer_email) is stored in Razorpay
 * notes — NOT the full checkout payload.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json<CreateRazorpayOrderResponse>(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body: CreateRazorpayOrderRequest = await request.json();
    const { customerName, customerPhone, customerEmail, items } = body;

    if (!customerName || !customerPhone || !items?.length) {
      return NextResponse.json<CreateRazorpayOrderResponse>(
        { success: false, error: "Missing required order information." },
        { status: 400 }
      );
    }

    // ─── Fetch live prices from Strapi for each product ────────────────
    // Build a filter for all product IDs in one request to avoid N+1 calls.
    const productIds = [...new Set(items.map((i) => i.product))];
    const filterParams = productIds
      .map((id, idx) => `filters[$or][${idx}][id][$eq]=${id}`)
      .join("&");

    const productsRes = await fetch(
      `${STRAPI_URL}/api/products?${filterParams}&fields[0]=id&fields[1]=price&fields[2]=productName`,
      {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!productsRes.ok) {
      return NextResponse.json<CreateRazorpayOrderResponse>(
        { success: false, error: "System is currently in maintenance mode." },
        { status: 503 }
      );
    }

    const productsJson = await productsRes.json();
    const productMap = new Map<number, number>(); // id → price
    for (const p of productsJson.data ?? []) {
      productMap.set(p.id, p.price);
    }

    // ─── Verify all products exist and compute server-side total ────────
    for (const item of items) {
      if (!productMap.has(item.product)) {
        return NextResponse.json<CreateRazorpayOrderResponse>(
          { success: false, error: `Product ID ${item.product} not found.` },
          { status: 400 }
        );
      }
    }

    const subtotal = items.reduce((sum, item) => {
      return sum + (productMap.get(item.product) ?? 0) * item.quantity;
    }, 0);
    const shippingCost = subtotal < 499 ? 80 : 0;
    const totalAmount = subtotal + shippingCost;
    const amountInPaise = Math.round(totalAmount * 100);

    // ─── Create Razorpay order ──────────────────────────────────────────
    // Notes contain only lightweight metadata — NOT the full checkout payload.
    const rzpOrder = await createRazorpayOrder(
      amountInPaise,
      `${session.customerId}`, // receipt
      {
        customer_id: String(session.customerDocumentId),
        customer_email: customerEmail || session.email || "",
      }
    );

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

    return NextResponse.json<CreateRazorpayOrderResponse>({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount: amountInPaise,
        currency: rzpOrder.currency,
        keyId,
      },
    });
  } catch (error) {
    console.error("create-razorpay-order error:", error);
    return NextResponse.json<CreateRazorpayOrderResponse>(
      { success: false, error: "System is currently in maintenance mode." },
      { status: 503 }
    );
  }
}
