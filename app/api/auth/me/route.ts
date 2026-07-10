import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import type { AuthResponse, StrapiCustomer } from "@/lib/auth-types";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.email) {
      return NextResponse.json<AuthResponse>({ success: false, error: "Unauthorized" }, { status: 200 });
    }

    // Fetch latest customer data from Strapi
    const query = new URLSearchParams({
      "filters[email][$eq]": session.email,
    }).toString();

    const fetchRes = await fetch(`${STRAPI_URL}/api/customers?${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
    }).catch(() => {});

    if (!fetchRes || !fetchRes.ok) {
      return NextResponse.json<AuthResponse>({ success: false, error: "System is currently in maintenance mode." }, { status: 503 });
    }

    const fetchJson = await fetchRes.json();

    if (!fetchJson.data || fetchJson.data.length === 0) {
      return NextResponse.json<AuthResponse>({ success: false, error: "User not found" }, { status: 404 });
    }

    const customer = fetchJson.data[0];

    return NextResponse.json<AuthResponse>({
      success: true,
      customer: {
        documentId: customer.documentId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      } as StrapiCustomer,
    });

  } catch (error) {
    console.error("Auth /me error:", error);
    return NextResponse.json<AuthResponse>({ success: false, error: "System is currently in maintenance mode." }, { status: 503 });
  }
}
