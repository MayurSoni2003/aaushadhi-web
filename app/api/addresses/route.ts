import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

async function getCustomerIdFromEmail(email: string) {
  const query = new URLSearchParams({
    "filters[email][$eq]": email,
  }).toString();

  const fetchRes = await fetch(`${STRAPI_URL}/api/customers?${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!fetchRes.ok) return null;
  const json = await fetchRes.json();
  if (json.data && json.data.length > 0) {
    return json.data[0].id; // Strapi internal numeric ID
  }
  return null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getCustomerIdFromEmail(session.email);
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const query = new URLSearchParams({
      "filters[customer][id][$eq]": customerId.toString(),
      "sort": "isDefault:desc,createdAt:desc",
    }).toString();

    const fetchRes = await fetch(`${STRAPI_URL}/api/addresses?${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!fetchRes.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch addresses" }, { status: 500 });
    }

    const json = await fetchRes.json();
    return NextResponse.json({ success: true, data: json.data });
  } catch (error) {
    console.error("GET /api/addresses error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getCustomerIdFromEmail(session.email);
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const body = await request.json();

    // If making this the default address, unset previous defaults for this customer
    if (body.isDefault) {
      const existingQuery = new URLSearchParams({
        "filters[customer][id][$eq]": customerId.toString(),
        "filters[isDefault][$eq]": "true",
      }).toString();

      const existingRes = await fetch(`${STRAPI_URL}/api/addresses?${existingQuery}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
      });

      if (existingRes.ok) {
        const existingJson = await existingRes.json();
        for (const address of existingJson.data || []) {
          await fetch(`${STRAPI_URL}/api/addresses/${address.documentId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${STRAPI_TOKEN}`,
            },
            body: JSON.stringify({ data: { isDefault: false } }),
          });
        }
      }
    }

    const payload = {
      data: {
        name: body.name,
        mobile: body.mobile,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 || null,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        country: body.country || "IN",
        isDefault: !!body.isDefault,
        customer: customerId, // Link to customer
      },
    };

    const createRes = await fetch(`${STRAPI_URL}/api/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      console.error("Failed to create address:", await createRes.text());
      return NextResponse.json({ success: false, error: "Failed to save address" }, { status: 500 });
    }

    const json = await createRes.json();
    return NextResponse.json({ success: true, data: json.data });
  } catch (error) {
    console.error("POST /api/addresses error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
