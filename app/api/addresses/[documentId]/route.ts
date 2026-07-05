import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

/**
 * Helper: fetch customer numeric ID from email.
 */
async function getCustomerIdFromEmail(email: string): Promise<number | null> {
  const query = new URLSearchParams({
    "filters[email][$eq]": email,
  }).toString();

  const res = await fetch(`${STRAPI_URL}/api/customers?${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const json = await res.json();
  if (json.data && json.data.length > 0) {
    return json.data[0].id;
  }
  return null;
}

/**
 * Helper: verify that an address belongs to the authenticated customer.
 * Returns the address data if owned, null otherwise.
 */
async function verifyAddressOwnership(
  addressDocumentId: string,
  customerId: number
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${STRAPI_URL}/api/addresses/${addressDocumentId}?populate=customer`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  const address = json.data;

  if (!address || !address.customer || address.customer.id !== customerId) {
    return null;
  }

  return address;
}

/**
 * PUT /api/addresses/:documentId
 * Updates an existing address. Validates ownership.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getCustomerIdFromEmail(session.email);
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // Verify ownership
    const existingAddress = await verifyAddressOwnership(documentId, customerId);
    if (!existingAddress) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
    }

    const body = await request.json();

    // If setting as default, unset other defaults for this customer
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
        for (const addr of existingJson.data || []) {
          if (addr.documentId !== documentId) {
            await fetch(`${STRAPI_URL}/api/addresses/${addr.documentId}`, {
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
    }

    const payload: Record<string, unknown> = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.mobile !== undefined) payload.mobile = body.mobile;
    if (body.addressLine1 !== undefined) payload.addressLine1 = body.addressLine1;
    if (body.addressLine2 !== undefined) payload.addressLine2 = body.addressLine2 || null;
    if (body.city !== undefined) payload.city = body.city;
    if (body.state !== undefined) payload.state = body.state;
    if (body.pincode !== undefined) payload.pincode = body.pincode;
    if (body.country !== undefined) payload.country = body.country;
    if (body.isDefault !== undefined) payload.isDefault = body.isDefault;

    const updateRes = await fetch(`${STRAPI_URL}/api/addresses/${documentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify({ data: payload }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text().catch(() => "");
      console.error("Failed to update address:", errorText);
      return NextResponse.json({ success: false, error: "Failed to update address" }, { status: 500 });
    }

    const json = await updateRes.json();
    return NextResponse.json({ success: true, data: json.data });
  } catch (error) {
    console.error("PUT /api/addresses/[documentId] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/addresses/:documentId
 * Deletes an address. Validates ownership.
 * If deleted address was default, promotes the next most recent address.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getCustomerIdFromEmail(session.email);
    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // Verify ownership
    const existingAddress = await verifyAddressOwnership(documentId, customerId);
    if (!existingAddress) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
    }

    const wasDefault = (existingAddress as Record<string, unknown>).isDefault === true;

    // Delete the address
    const deleteRes = await fetch(`${STRAPI_URL}/api/addresses/${documentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
    });

    if (!deleteRes.ok) {
      return NextResponse.json({ success: false, error: "Failed to delete address" }, { status: 500 });
    }

    // If deleted address was default, promote the most recent remaining address
    if (wasDefault) {
      const remainingQuery = new URLSearchParams({
        "filters[customer][id][$eq]": customerId.toString(),
        "sort": "createdAt:desc",
        "pagination[limit]": "1",
      }).toString();

      const remainingRes = await fetch(`${STRAPI_URL}/api/addresses?${remainingQuery}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
      });

      if (remainingRes.ok) {
        const remainingJson = await remainingRes.json();
        if (remainingJson.data && remainingJson.data.length > 0) {
          const newDefault = remainingJson.data[0];
          await fetch(`${STRAPI_URL}/api/addresses/${newDefault.documentId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${STRAPI_TOKEN}`,
            },
            body: JSON.stringify({ data: { isDefault: true } }),
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/addresses/[documentId] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
