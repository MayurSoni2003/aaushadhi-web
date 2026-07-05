import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

/**
 * GET /api/account/profile
 * Returns the authenticated customer's profile data.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const query = new URLSearchParams({
      "filters[email][$eq]": session.email,
    }).toString();

    const res = await fetch(`${STRAPI_URL}/api/customers?${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
    }

    const json = await res.json();
    if (!json.data || json.data.length === 0) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const customer = json.data[0];
    return NextResponse.json({
      success: true,
      data: {
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email,
        phone: customer.phone || "",
      },
    });
  } catch (error) {
    console.error("GET /api/account/profile error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/account/profile
 * Updates firstName, lastName, phone for the authenticated customer.
 * Uses customerDocumentId from session for direct Strapi update.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    if (!firstName?.trim()) {
      return NextResponse.json({ success: false, error: "First name is required" }, { status: 400 });
    }

    // Use documentId from session if available, otherwise fall back to email lookup
    let documentId = session.customerDocumentId;
    if (!documentId) {
      const query = new URLSearchParams({
        "filters[email][$eq]": session.email,
      }).toString();

      const lookupRes = await fetch(`${STRAPI_URL}/api/customers?${query}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        cache: "no-store",
      });

      if (!lookupRes.ok) {
        return NextResponse.json({ success: false, error: "Failed to find customer" }, { status: 500 });
      }

      const lookupJson = await lookupRes.json();
      if (!lookupJson.data || lookupJson.data.length === 0) {
        return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
      }
      documentId = lookupJson.data[0].documentId;
    }

    const updateRes = await fetch(`${STRAPI_URL}/api/customers/${documentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          firstName: firstName.trim(),
          lastName: lastName?.trim() || "",
          phone: phone?.trim() || null,
        },
      }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text().catch(() => "");
      console.error("Strapi customer update failed:", errorText);
      return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
    }

    const updateJson = await updateRes.json();
    return NextResponse.json({
      success: true,
      data: {
        firstName: updateJson.data.firstName || "",
        lastName: updateJson.data.lastName || "",
        email: updateJson.data.email,
        phone: updateJson.data.phone || "",
      },
    });
  } catch (error) {
    console.error("PUT /api/account/profile error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
