const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

export type StatusSource = "system" | "cron" | "webhook" | "admin" | "customer";

const STATUS_WEIGHTS: Record<string, number> = {
  pending: 10,
  confirmed: 20,
  processing: 30,
  shipped: 40,
  in_transit: 50,
  out_for_delivery: 60,
  delivered: 70,
  returned: 80,
  cancelled: 80,
};

/**
 * Reusable helper responsible for all orderStatus and statusHistory updates.
 * No other backend process should update these fields directly.
 */
export async function saveOrderWithHistory(
  documentId: string | null,
  currentStatus: string | null,
  currentHistory: any[] | null,
  newStatus: string,
  source: StatusSource,
  remarks: string = "",
  payloadData: Record<string, any> = {},
  allowRegression: boolean = false
) {
  const isCreate = !documentId;
  const data = { ...payloadData };

  // ─── Progression Lock Logic ───
  let targetStatus = newStatus;
  if (!isCreate && currentStatus && currentStatus !== targetStatus && !allowRegression) {
    const currentWeight = STATUS_WEIGHTS[currentStatus] || 0;
    const newWeight = STATUS_WEIGHTS[targetStatus] || 0;

    // 1. Terminal state lock
    if (currentWeight >= 70) {
      console.warn(`Blocked attempt to update terminal order from ${currentStatus} to ${targetStatus}`);
      targetStatus = currentStatus; // Swallow the update
    } 
    // 2. Backward regression lock
    else if (newWeight <= currentWeight) {
      console.warn(`Blocked order regression from ${currentStatus} to ${targetStatus}`);
      targetStatus = currentStatus; // Swallow the update
    }
  }

  // For updates, if the status hasn't changed (or was blocked), skip history append
  if (!isCreate && currentStatus === targetStatus) {
    if (Object.keys(data).length === 0) {
      // Nothing to update
      return null;
    }
    
    const res = await fetch(`${STRAPI_URL}/api/orders/${documentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to update order: ${err}`);
    }
    return res.json();
  }

  // Set the new status
  data.orderStatus = targetStatus;

  // Preserve existing history, stripping out overly nested Strapi wrappers if any, 
  // while keeping the id to prevent recreation of existing components.
  const history = currentHistory || [];
  const cleanHistory = history.map((entry: any) => ({
    ...(entry.id ? { id: entry.id } : {}),
    status: entry.status,
    timestamp: entry.timestamp,
    source: entry.source,
    remarks: entry.remarks || "",
  }));

  const newEntry = {
    status: targetStatus,
    timestamp: new Date().toISOString(),
    source,
    remarks,
  };

  // Atomic update: Append new entry
  data.statusHistory = [...cleanHistory, newEntry];

  const url = isCreate 
    ? `${STRAPI_URL}/api/orders?populate=statusHistory`
    : `${STRAPI_URL}/api/orders/${documentId}?populate=statusHistory`;
    
  const method = isCreate ? "POST" : "PUT";

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to save order with history: ${err}`);
  }
  
  return res.json();
}
