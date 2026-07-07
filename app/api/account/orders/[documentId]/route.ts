import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

/**
 * GET /api/account/orders/[documentId]
 * Returns full order details for the authenticated customer.
 * Ownership is verified server-side against the encrypted session.
 * The public GET /api/orders/[orderId] (used by the confirmation page) is left untouched.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.customerDocumentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const query = new URLSearchParams();
    query.append("filters[orderId][$eq]", orderId);
    query.append("populate[customer][fields][0]", "documentId");
    query.append("populate[shippingAddress]", "true");
    query.append("populate[orderItem][fields][0]", "productName");
    query.append("populate[orderItem][fields][1]", "imageUrl");
    query.append("populate[orderItem][fields][2]", "price");
    query.append("populate[orderItem][fields][3]", "quantity");
    query.append("populate[orderItem][fields][4]", "slug");
    query.append("populate[statusHistory]", "true");

    const strapiRes = await fetch(
      `${STRAPI_URL}/api/orders?${query.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!strapiRes.ok) {
      console.error("Strapi order fetch failed:", await strapiRes.text().catch(() => ""));
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }

    const data = await strapiRes.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = data.data[0];

    // Ownership check — never trust client-supplied identifiers
    if (order.customer?.documentId !== session.customerDocumentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error("GET /api/account/orders/[documentId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
