import { NextRequest, NextResponse } from "next/server";
import { syncShipments, getShipmentLabel, mapIcarryStatus } from "@/lib/icarry";
import { saveOrderWithHistory } from "@/lib/orders";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET /api/cron/sync-orders
 * Cron Job endpoint to synchronize shipment statuses from iCarry to Strapi.
 * Intended to be triggered periodically by an external scheduler (e.g., Linux cron).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Pending Orders from Strapi
    // Orders with an icarryShipmentId and NOT in terminal states
    const query = new URLSearchParams();
    query.append("filters[icarryShipmentId][$notNull]", "true");
    query.append("filters[orderStatus][$notIn][0]", "delivered");
    query.append("filters[orderStatus][$notIn][1]", "cancelled");
    query.append("filters[orderStatus][$notIn][2]", "returned");
    query.append("pagination[limit]", "100"); // Process up to 100 orders per run
    query.append("populate", "statusHistory"); // Ensure statusHistory is fetched

    const strapiRes = await fetch(`${STRAPI_URL}/api/orders?${query.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!strapiRes.ok) {
      console.error("Failed to fetch orders from Strapi", await strapiRes.text());
      return NextResponse.json({ success: false, error: "Strapi fetch failed" }, { status: 500 });
    }

    const strapiData = await strapiRes.json();
    const orders = strapiData.data || [];

    if (orders.length === 0) {
      return NextResponse.json({ success: true, message: "No pending orders to sync" });
    }

    // 3. Batch shipment IDs for iCarry API
    // The query returns Strapi entries, we need to map the Strapi order to its icarryShipmentId
    const shipmentIdToOrderMap = new Map<string, any>();
    const shipmentIds: string[] = [];

    orders.forEach((order: any) => {
      if (order.icarryShipmentId) {
        shipmentIds.push(order.icarryShipmentId);
        shipmentIdToOrderMap.set(order.icarryShipmentId, order);
      }
    });

    if (shipmentIds.length === 0) {
      return NextResponse.json({ success: true, message: "No valid shipment IDs found" });
    }

    // 4. Call iCarry Sync API
    const syncRes = await syncShipments(shipmentIds);
    if (!syncRes.msg || !Array.isArray(syncRes.msg)) {
      console.warn("Unexpected iCarry Sync Response:", syncRes);
      return NextResponse.json({ success: false, error: "Invalid response from iCarry" }, { status: 502 });
    }

    // 5. Update Strapi Orders (only if changed)
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const item of syncRes.msg) {
      const order = shipmentIdToOrderMap.get(item.shipment_id);
      
      // If the Sync API returns a shipment ID that doesn't exist in Strapi, log and continue
      if (!order) {
        console.warn(`Unmatched shipment ID returned from iCarry: ${item.shipment_id}`);
        continue;
      }

      const mapping = mapIcarryStatus(item.status);
      const newStatus = mapping.status || order.orderStatus;
      
      const updates: Record<string, any> = {};
      
      // Check if icarryStatusCode needs updating
      const parsedStatusCode = parseInt(item.status, 10);
      // Check if icarryStatusCode needs updating
      if (order.icarryStatusCode !== parsedStatusCode && !isNaN(parsedStatusCode)) {
        updates.icarryStatusCode = parsedStatusCode;
      }

      // Check if needsManualReview needs updating
      const newNeedsManualReview = mapping.needsManualReview || false;
      if (order.needsManualReview !== newNeedsManualReview && newNeedsManualReview) {
        updates.needsManualReview = true;
      }

      // Determine if tracking enrichment is needed
      const currentAwb = order.trackingAwb || updates.trackingAwb;
      const currentCourierName = order.courierName || updates.courierName;
      const currentCourierId = order.courierId || updates.courierId;
      
      const needsEnrichment = !currentAwb || !currentCourierName || !currentCourierId;
      
      // Skip draft or pre-booking shipments
      // Assuming any status other than "0" or empty string means it's booked/active in iCarry
      const isBooked = item.status && item.status !== "0" && item.status !== ""; 
      
      if (needsEnrichment && isBooked) {
        try {
          const labelInfo = await getShipmentLabel(item.shipment_id);
          // Only update fields when valid values are returned
          if (labelInfo.success == 1 && labelInfo.awb && labelInfo.courier_name && labelInfo.courier_id) {
            updates.trackingAwb = labelInfo.awb;
            updates.courierName = labelInfo.courier_name;
            updates.courierId = String(labelInfo.courier_id);
            updates.trackingUrl = `https://www.icarry.in/track-shipment?shipment_id=${item.shipment_id}&awb=${labelInfo.awb}&courier_id=${labelInfo.courier_id}`;
          }
        } catch (e) {
          console.error(`Failed to enrich tracking for shipment ${item.shipment_id}`, e);
        }
      }

      // Always update lastSyncedAt to indicate the shipment was successfully checked
      updates.lastSyncedAt = now;

      // Ensure we don't accidentally send null values to overwrite existing fields
      Object.keys(updates).forEach(key => {
        if (updates[key] === null || updates[key] === undefined) {
          delete updates[key];
        }
      });

      // Since lastSyncedAt is always added, we will always perform a PUT request
      // This represents the last time we successfully fetched data for this order
      if (Object.keys(updates).length > 0) {
        try {
          await saveOrderWithHistory(
            order.documentId,
            order.orderStatus,
            order.statusHistory,
            newStatus,
            "cron",
            `Status synchronized from iCarry (Status Code: ${item.status})`,
            updates
          );
          updatedCount++;
        } catch (e) {
          console.error(`Exception updating order ${order.documentId}`, e);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${shipmentIds.length} shipments. Updated ${updatedCount} orders.` 
    });

  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
