import { NextRequest, NextResponse } from "next/server";
import { mapIcarryStatus } from "@/lib/icarry";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const ICARRY_API_KEY = process.env.ICARRY_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    let payload;
    
    // iCarry webhook can sometimes send application/json or application/x-www-form-urlencoded
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries());
    }

    const { client_name, callback_type, awb, status, token } = payload;

    // 1. Verify iCarry webhook token
    if (!token || token !== ICARRY_API_KEY) {
      console.warn("Invalid iCarry webhook token received");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. We only care about sync_status events for this endpoint
    if (callback_type !== "sync_status") {
      return NextResponse.json({ success: true, message: "Ignored non-status event" });
    }

    if (!awb) {
      return NextResponse.json({ error: "Missing AWB in payload" }, { status: 400 });
    }

    // 3. Find the order in Strapi by AWB
    const findRes = await fetch(
      `${STRAPI_URL}/api/orders?filters[trackingAwb][$eq]=${encodeURIComponent(String(awb))}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!findRes.ok) {
      throw new Error(`Failed to query Strapi: ${findRes.statusText}`);
    }

    const findData = await findRes.json();
    if (!findData.data || findData.data.length === 0) {
      // Order not found with this AWB. 
      // We return 200 so iCarry doesn't keep retrying, as this might be an order we don't know about yet.
      return NextResponse.json({ success: true, message: "Order with AWB not found" });
    }

    const order = findData.data[0];
    const updates: Record<string, any> = {};
    let hasChanges = false;

    // 4. Map the new status
    const mapping = mapIcarryStatus(status);

    if (mapping.status && order.orderStatus !== mapping.status) {
      updates.orderStatus = mapping.status;
      hasChanges = true;
    }

    const parsedStatusCode = parseInt(String(status), 10);
    if (!isNaN(parsedStatusCode) && order.icarryStatusCode !== parsedStatusCode) {
      updates.icarryStatusCode = parsedStatusCode;
      hasChanges = true;
    }

    const newNeedsManualReview = mapping.needsManualReview || false;
    if (order.needsManualReview !== newNeedsManualReview && newNeedsManualReview) {
      updates.needsManualReview = true;
      hasChanges = true;
    }

    // 5. Update Strapi if changes exist
    if (hasChanges) {
      updates.lastSyncedAt = new Date().toISOString();

      const updateRes = await fetch(`${STRAPI_URL}/api/orders/${order.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({ data: updates }),
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to update order in Strapi: ${updateRes.statusText}`);
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("iCarry Webhook Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
