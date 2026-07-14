import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { syncShipments, cancelShipment, mapIcarryStatus } from "@/lib/icarry";
import { saveOrderWithHistory } from "@/lib/orders";
import { Resend } from "resend";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "";

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
    // (Removed strict validation to allow cancellation before shipment is booked)

    // 4. Early Idempotency Check
    // If the database already knows the order is cancelled, short-circuit immediately.
    if (order.orderStatus === "cancelled") {
      return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
    }

    // 5. Perform a live Shipment Status Sync (Only if shipment exists)
    let currentStatus = order.orderStatus;
    let syncedIcarryStatusCode = order.icarryStatusCode;
    let latestHistory = order.statusHistory;
    
    if (order.icarryShipmentId) {
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
    }

    // 5. Enforce cancellation rules based on the newly synced status
    const cancellableStatuses = ["confirmed", "processing"];
    if (!cancellableStatuses.includes(currentStatus)) {
      return NextResponse.json(
        { error: `Order cannot be cancelled because it is currently ${currentStatus}` },
        { status: 400 }
      );
    }

    // 6. Call iCarry Cancel API (Only if shipment exists)
    if (order.icarryShipmentId) {
      try {
        await cancelShipment(order.icarryShipmentId);
      } catch (e: any) {
        console.error("Failed to cancel shipment with iCarry:", e);
        // If iCarry returns "Shipment id not found", it usually means the shipment is still a Draft
        // (not yet booked with a courier) or was deleted. We should proceed to cancel it locally anyway.
        if (e.message && e.message.toLowerCase().includes("not found")) {
          console.warn(`iCarry could not find shipment ${order.icarryShipmentId} (likely a draft). Proceeding with local cancellation.`);
        } else {
          return NextResponse.json({ error: e.message || "Courier cancellation failed" }, { status: 502 });
        }
      }
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

    // 8. Notify admin of cancellation (fire-and-forget)
    if (adminEmail) {
      resend.emails.send({
        from: `Aaushadhi Wellness <${fromEmail}>`,
        to: [adminEmail],
        subject: `❌ Order Cancelled: ${order.orderId || documentId}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
            <h2 style="color:#dc2626;margin-bottom:4px">Order Cancelled by Customer</h2>
            <p style="color:#888;font-size:13px;margin-top:0">Aaushadhi Wellness Admin Alert</p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
              <tr><td style="padding:6px 12px;color:#888;width:140px">Order ID</td><td style="padding:6px 12px;font-weight:bold">${order.orderId || documentId}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Customer</td><td style="padding:6px 12px">${order.customerName || ""}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Email</td><td style="padding:6px 12px">${order.customer?.email || ""}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Phone</td><td style="padding:6px 12px">${order.customerPhone || ""}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Total</td><td style="padding:6px 12px;font-weight:bold">₹${(order.totalAmount || 0).toLocaleString("en-IN")}</td></tr>
              <tr><td style="padding:6px 12px;color:#888">Status Before</td><td style="padding:6px 12px;text-transform:capitalize">${currentStatus}</td></tr>
              ${order.icarryShipmentId ? `<tr><td style="padding:6px 12px;color:#888">iCarry ID</td><td style="padding:6px 12px">${order.icarryShipmentId}</td></tr>` : ""}
            </table>

            <p style="margin-top:24px;font-size:12px;color:#aaa">This is an automated notification from Aaushadhi Wellness.</p>
          </div>
        `,
      }).catch((err: Error) => console.error("Admin cancellation notification email failed:", err));
    }

    return NextResponse.json({ success: true, message: "Order successfully cancelled" });

  } catch (error: any) {
    console.error("Order Cancellation Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
