import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

/**
 * GET /api/account/orders
 * Returns the authenticated customer's orders, newest first.
 * Never trusts customer identifiers from the client — reads identity from session.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.customerDocumentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = new URLSearchParams();
    query.append("filters[customer][documentId][$eq]", session.customerDocumentId);
    query.append("sort[0]", "createdAt:desc");
    query.append("populate[orderItem][populate][product][fields][0]", "id");
    query.append("populate[orderItem][fields][0]", "imageUrl");
    query.append("populate[orderItem][fields][1]", "productName");
    query.append("populate[orderItem][fields][2]", "quantity");
    query.append("fields[0]", "orderId");
    query.append("fields[1]", "orderStatus");
    query.append("fields[2]", "paymentStatus");
    query.append("fields[3]", "paymentMethod");
    query.append("fields[4]", "totalAmount");
    query.append("fields[5]", "createdAt");
    query.append("pagination[limit]", "50");

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
      console.error("Strapi orders fetch failed:", await strapiRes.text().catch(() => ""));
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const data = await strapiRes.json();
    return NextResponse.json({ success: true, data: data.data || [] });
  } catch (error: any) {
    console.error("GET /api/account/orders error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
