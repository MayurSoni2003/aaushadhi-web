import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { syncShipments, cancelShipment, mapIcarryStatus } from "@/lib/icarry";
import { saveOrderWithHistory } from "@/lib/orders";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.customerDocumentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await params;

    // 1. Fetch order from Strapi
    const orderRes = await fetch(
      `${STRAPI_URL}/api/orders/${documentId}?populate[customer]=true&populate[statusHistory]=true`,
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
      return NextResponse.json({ error: "Order cannot be cancelled as no shipment is assigned" }, { status: 400 });
    }

    // 4. Early Idempotency Check
    // If the database already knows the order is cancelled, short-circuit immediately.
    if (order.orderStatus === "cancelled") {
      return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
    }

    // 5. Perform a live Shipment Status Sync
    let currentStatus = order.orderStatus;
    let syncedIcarryStatusCode = order.icarryStatusCode;
    
    try {
      const syncRes = await syncShipments([order.icarryShipmentId]);
      if (syncRes.msg && syncRes.msg.length > 0) {
        const item = syncRes.msg[0];
        const parsedStatusCode = parseInt(item.status, 10);
        if (!isNaN(parsedStatusCode)) {
          syncedIcarryStatusCode = parsedStatusCode;
        }
        const mappedStatus = mapIcarryStatus(item.status);
        if (mappedStatus.status) {
          currentStatus = mappedStatus.status;
        }
      }
    } catch (e) {
      console.error("Live sync failed during cancellation:", e);
      // We proceed with the last known status if sync temporarily fails,
      // or we could fail. Since the user requested "Perform a live Shipment Status Sync",
      // we'll fail if we can't sync to strictly adhere to "Enforce these rules in your backend".
      return NextResponse.json({ error: "Failed to verify current shipment status with courier" }, { status: 502 });
    }

    // Update Strapi with the live synced status first to ensure the database is perfectly up-to-date
    // (even if cancellation is subsequently rejected)
    let latestHistory = order.statusHistory;
    try {
      const updateRes = await saveOrderWithHistory(
        documentId,
        order.orderStatus,
        order.statusHistory,
        currentStatus,
        "system",
        "Live sync before cancellation",
        { 
          icarryStatusCode: syncedIcarryStatusCode,
          lastSyncedAt: new Date().toISOString()
        }
      );
      if (updateRes && updateRes.data) {
        latestHistory = updateRes.data.statusHistory;
      }
    } catch (e: any) {
      console.error("Failed to update pre-cancellation synced status in Strapi", e);
      // We log but proceed with the live memory status
    }

    // 5. Enforce cancellation rules based on the newly synced status
    const cancellableStatuses = ["pending", "confirmed", "processing"];
    if (!cancellableStatuses.includes(currentStatus)) {
      return NextResponse.json(
        { error: `Order cannot be cancelled because it is currently ${currentStatus}` },
        { status: 400 }
      );
    }

    // 6. Call iCarry Cancel API
    try {
      await cancelShipment(order.icarryShipmentId);
    } catch (e: any) {
      console.error("Failed to cancel shipment with iCarry:", e);
      return NextResponse.json({ error: e.message || "Courier cancellation failed" }, { status: 502 });
    }

    // 7. Update Strapi orderStatus to cancelled
    try {
      await saveOrderWithHistory(
        documentId,
        currentStatus, // this is the status from before this cancellation step
        latestHistory,
        "cancelled",
        "customer",
        "Cancelled by customer",
        { lastSyncedAt: new Date().toISOString() },
        true // allowRegression
      );
    } catch (e: any) {
      console.error("Failed to update order status to cancelled in Strapi:", e);
      return NextResponse.json({ error: "Order was cancelled but failed to update local database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Order successfully cancelled" });

  } catch (error: any) {
    console.error("Order Cancellation Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
