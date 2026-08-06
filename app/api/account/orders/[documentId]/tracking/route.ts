import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { trackShipment } from "@/lib/icarry";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

/**
 * Parses tracking date strings that might be in DD/MM/YY HH:mm:ss format (e.g. from iCarry)
 */
function parseTrackingDate(dateString: string): Date {
  if (!dateString) return new Date(NaN);
  
  let d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  
  const parts = dateString.split(/[\s/:-]+/);
  if (parts.length >= 5) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    
    const hour = parseInt(parts[3], 10) || 0;
    const minute = parseInt(parts[4], 10) || 0;
    const second = parseInt(parts[5], 10) || 0;
    
    // iCarry returns timestamps in UTC without the 'Z' suffix.
    // Use Date.UTC to ensure it's interpreted as UTC, not local time.
    d = new Date(Date.UTC(year, month, day, hour, minute, second));
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(NaN);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    if (process.env.NEXT_PUBLIC_HIDE_LIVE_TRACKING === "true") {
      return NextResponse.json(
        { error: "Live tracking is currently disabled" },
        { status: 403 }
      );
    }

    const session = await getSession();
    if (!session || !session.customerDocumentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    // 1. Fetch order from Strapi
    const orderRes = await fetch(
      `${STRAPI_URL}/api/orders/${documentId}?populate[customer]=true`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!orderRes.ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = await orderRes.json();
    const order = orderData.data;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Verify ownership
    const orderCustomerId = order.customer?.documentId;
    if (orderCustomerId !== session.customerDocumentId) {
      return NextResponse.json({ error: "Forbidden: You do not own this order" }, { status: 403 });
    }

    // 3. Verify iCarry shipment exists
    if (!order.icarryShipmentId) {
      return NextResponse.json({ error: "Order does not have an active shipment" }, { status: 400 });
    }

    // 4. Fetch tracking from iCarry
    let trackingData;
    try {
      trackingData = await trackShipment(order.icarryShipmentId);
    } catch (e: any) {
      console.error("Failed to track shipment with iCarry:", e);
      return NextResponse.json({ error: "Failed to fetch live tracking from courier" }, { status: 502 });
    }

    // 5. Normalize and sort the response
    // We remove the top-level success/error fields to keep the payload clean,
    // but preserve courier_name and AWB for backend extensibility.
    const { 
      success, 
      error, 
      ...safeTrackingData 
    } = trackingData;

    // Ensure the details array is always in reverse chronological order (newest to oldest)
    if (safeTrackingData.details && Array.isArray(safeTrackingData.details)) {
      safeTrackingData.details.sort((a, b) => {
        const timeA = parseTrackingDate(a.datetime).getTime();
        const timeB = parseTrackingDate(b.datetime).getTime();
        // Fallback to 0 if NaN to preserve relative order
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        return timeB - timeA; // Newest first
      });

      // If the order is cancelled, ensure the tracking timeline clearly reflects it at the top
      if (order.orderStatus === "cancelled") {
        const firstDetail = safeTrackingData.details[0];
        if (!firstDetail?.notes?.toLowerCase().includes("cancel")) {
          safeTrackingData.details.unshift({
            notes: "Shipment Cancelled",
            location: "",
            datetime: new Date().toISOString()
          });
        }
      }

      // Deduplicate consecutive cancel nodes (which iCarry sometimes sends)
      const deduplicatedDetails = [];
      for (const detail of safeTrackingData.details) {
        const isCurrentCancel = detail.notes?.toLowerCase().includes("cancel");
        const prevDetail = deduplicatedDetails[deduplicatedDetails.length - 1];
        const isPrevCancel = prevDetail?.notes?.toLowerCase().includes("cancel");

        if (isCurrentCancel && isPrevCancel) {
          continue; // Skip consecutive cancel nodes
        }
        deduplicatedDetails.push(detail);
      }
      safeTrackingData.details = deduplicatedDetails;
    }

    return NextResponse.json({
      success: true,
      tracking: safeTrackingData
    });

  } catch (error: any) {
    console.error("Order Tracking Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
