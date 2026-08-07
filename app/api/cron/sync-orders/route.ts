import { NextRequest, NextResponse } from "next/server";
import { syncShipments, getShipmentLabel, mapIcarryStatus, bookShipment, calculateTotalWeight } from "@/lib/icarry";
import { saveOrderWithHistory } from "@/lib/orders";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const ICARRY_PICKUP_ADDRESS_ID = parseInt(
  process.env.ICARRY_PICKUP_ADDRESS_ID || "0",
  10
);

/**
 * GET /api/cron/sync-orders
 *
 * Two-pass cron job:
 *
 * Pass 1 — Status Sync:
 *   Fetches orders with an icarryShipmentId that are not in a terminal state,
 *   syncs their status from iCarry, and updates Strapi.
 *
 * Pass 2 — Orphan Recovery:
 *   Finds orders where icarryShipmentId is null and needsManualReview is true
 *   (flagged by the checkout routes when initial iCarry booking failed).
 *   Retries booking the shipment with idempotency guards to prevent duplicates.
 *   On success: saves icarryShipmentId and clears needsManualReview.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [syncResult, recoveryResult] = await Promise.allSettled([
      runStatusSync(),
      runOrphanRecovery(),
    ]);

    return NextResponse.json({
      success: true,
      sync:
        syncResult.status === "fulfilled"
          ? syncResult.value
          : { error: syncResult.reason?.message },
      recovery:
        recoveryResult.status === "fulfilled"
          ? recoveryResult.value
          : { error: recoveryResult.reason?.message },
    });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

// ─── Pass 1: Status Sync ─────────────────────────────────────────────────────

async function runStatusSync(): Promise<Record<string, any>> {
  // Fetch active orders that already have an icarryShipmentId
  const query = new URLSearchParams();
  query.append("filters[icarryShipmentId][$notNull]", "true");
  query.append("filters[orderStatus][$notIn][0]", "delivered");
  query.append("filters[orderStatus][$notIn][1]", "cancelled");
  query.append("filters[orderStatus][$notIn][2]", "returned");
  query.append("pagination[limit]", "100");
  query.append("populate", "statusHistory");

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
    throw new Error("Strapi fetch failed");
  }

  const strapiData = await strapiRes.json();
  const orders = strapiData.data || [];

  if (orders.length === 0) {
    return { message: "No active orders to sync" };
  }

  const shipmentIdToOrderMap = new Map<string, any>();
  const shipmentIds: string[] = [];

  orders.forEach((order: any) => {
    if (order.icarryShipmentId) {
      const sid = String(order.icarryShipmentId).trim();
      shipmentIds.push(sid);
      shipmentIdToOrderMap.set(sid, order);
    }
  });

  if (shipmentIds.length === 0) {
    return { message: "No valid shipment IDs found" };
  }

  const syncRes = await syncShipments(shipmentIds);

  if (!syncRes.msg || !Array.isArray(syncRes.msg)) {
    console.warn("Unexpected iCarry Sync Response:", syncRes);
    throw new Error("Invalid response from iCarry");
  }

  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const item of syncRes.msg) {
    const lookUpKey = String(item.shipment_id).trim();
    const order = shipmentIdToOrderMap.get(lookUpKey);

    if (!order) {
      console.warn(`Unmatched shipment ID returned from iCarry: ${item.shipment_id}`);
      continue;
    }

    const mapping = mapIcarryStatus(item.status);
    const newStatus = mapping.status || order.orderStatus;
    const newNeedsManualReview = mapping.needsManualReview || false;


    const updates: Record<string, any> = {};

    const parsedStatusCode = parseInt(item.status, 10);
    if (order.icarryStatusCode !== parsedStatusCode && !isNaN(parsedStatusCode)) {
      updates.icarryStatusCode = parsedStatusCode;
    }

    if (order.needsManualReview !== newNeedsManualReview && newNeedsManualReview) {
      updates.needsManualReview = true;
    }

    const currentAwb = order.trackingAwb || updates.trackingAwb;
    const currentCourierName = order.courierName || updates.courierName;
    const currentCourierId = order.courierId || updates.courierId;
    const needsEnrichment = !currentAwb || !currentCourierName || !currentCourierId;
    const isBooked = item.status && item.status !== "0" && item.status !== "";

    if (needsEnrichment && isBooked) {
      try {
        const labelInfo = await getShipmentLabel(item.shipment_id);
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

    updates.lastSyncedAt = now;

    Object.keys(updates).forEach((key) => {
      if (updates[key] === null || updates[key] === undefined) {
        delete updates[key];
      }
    });

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

  return {
    message: `Processed ${shipmentIds.length} shipments. Updated ${updatedCount} orders.`,
  };
}

// ─── Pass 2: Orphan Recovery ─────────────────────────────────────────────────

async function runOrphanRecovery(): Promise<Record<string, any>> {
  // Find orders flagged during checkout where iCarry booking failed.
  // These are identified by: needsManualReview = true AND icarryShipmentId = null
  // AND not in a terminal state.
  const query = new URLSearchParams();
  query.append("filters[icarryShipmentId][$null]", "true");
  query.append("filters[needsManualReview][$eq]", "true");
  query.append("filters[orderStatus][$notIn][0]", "cancelled");
  query.append("filters[orderStatus][$notIn][1]", "delivered");
  query.append("filters[orderStatus][$notIn][2]", "returned");
  query.append("pagination[limit]", "50");
  query.append("populate[shippingAddress]", "true");
  query.append("populate[orderItem]", "true");
  query.append("populate[statusHistory]", "true");

  const strapiRes = await fetch(`${STRAPI_URL}/api/orders?${query.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    cache: "no-store",
  });

  if (!strapiRes.ok) {
    throw new Error("Orphan recovery: Strapi fetch failed");
  }

  const strapiData = await strapiRes.json();
  const orphans: any[] = strapiData.data || [];

  if (orphans.length === 0) {
    return { message: "No orphaned orders to recover" };
  }

  let recovered = 0;
  let skipped = 0;
  let failed = 0;

  for (const order of orphans) {
    const documentId: string = order.documentId;
    const address = order.shippingAddress;
    const items = order.orderItem || [];

    if (!address || items.length === 0) {
      console.warn(`[orphan-recovery] Order ${order.orderId} missing address or items — skipping`);
      skipped++;
      continue;
    }

    // ── Idempotency guard 1: Re-fetch fresh to confirm icarryShipmentId is still null ──
    // This prevents double-booking if another cron execution already recovered this order.
    const freshRes = await fetch(
      `${STRAPI_URL}/api/orders/${documentId}?fields[0]=icarryShipmentId&fields[1]=orderStatus`,
      {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!freshRes.ok) {
      console.error(`[orphan-recovery] Failed to re-fetch order ${documentId}`);
      skipped++;
      continue;
    }

    const freshData = await freshRes.json();
    const freshOrder = freshData.data;

    if (freshOrder?.icarryShipmentId) {
      // Already booked by another process (manual or concurrent cron run)
      console.log(`[orphan-recovery] Order ${order.orderId} already has icarryShipmentId — skipping`);
      skipped++;
      continue;
    }

    // ── Attempt iCarry booking ──
    let bookingResult;
    try {
      const totalWeight = calculateTotalWeight(items);
      const productDescription = items
        .map((item: any) => `${item.productName} x${item.quantity}`)
        .join(", ");

      bookingResult = await bookShipment({
        consigneeName: address.name,
        consigneePhone: address.mobile,
        consigneeAddress: `${address.addressLine1}${address.addressLine2 ? ", " + address.addressLine2 : ""}`,
        consigneeCity: address.city,
        consigneeState: address.state,
        consigneePincode: address.pincode,
        orderValue: order.totalAmount,
        isCod: order.paymentMethod === "cod",
        totalWeightGrams: totalWeight,
        orderId: order.orderId,
        productDescription,
        pickupAddressId: ICARRY_PICKUP_ADDRESS_ID,
      });
    } catch (bookingError: any) {
      console.error(`[orphan-recovery] iCarry booking still failing for order ${order.orderId}:`, bookingError);
      failed++;
      continue;
    }

    if (!bookingResult?.shipment_id) {
      console.warn(`[orphan-recovery] iCarry returned no shipment_id for order ${order.orderId}`);
      failed++;
      continue;
    }

    // ── Idempotency guard 2: Re-fetch again before writing to Strapi ──
    // Minimises the race window between booking and saving in a concurrent scenario.
    const preWriteRes = await fetch(
      `${STRAPI_URL}/api/orders/${documentId}?fields[0]=icarryShipmentId`,
      {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        cache: "no-store",
      }
    );

    if (preWriteRes.ok) {
      const preWriteData = await preWriteRes.json();
      if (preWriteData.data?.icarryShipmentId) {
        // Another process wrote a shipment ID between our booking and now.
        // The shipment we just created is a duplicate — log it for manual review.
        console.warn(
          `[orphan-recovery] Race condition detected for order ${order.orderId}. ` +
          `Duplicate iCarry shipment created: ${bookingResult.shipment_id}. Manual cancellation of duplicate required.`
        );
        skipped++;
        continue;
      }
    }

    // ── Save icarryShipmentId and clear needsManualReview ──
    const isICarryShipmentId = process.env.FETCH_ICARRY_SHIPMENT_ID === "true";
    try {
      if (isICarryShipmentId) {
        await fetch(`${STRAPI_URL}/api/orders/${documentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${STRAPI_TOKEN}`,
          },
          body: JSON.stringify({
            data: {
              icarryShipmentId: String(bookingResult.shipment_id),
              needsManualReview: false,
            },
          }),
        });
      }
      console.log(`[orphan-recovery] Recovered order ${order.orderId} → iCarry shipment ${bookingResult.shipment_id}`);
      recovered++;
    } catch (updateError) {
      console.error(`[orphan-recovery] Failed to save icarryShipmentId for order ${order.orderId}:`, updateError);
      failed++;
    }
  }

  return {
    message: `Orphan recovery: ${orphans.length} found. Recovered: ${recovered}, Skipped: ${skipped}, Failed: ${failed}.`,
  };
}
