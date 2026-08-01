import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_BASE = "https://api.razorpay.com/v1";

// ─── Basic-Auth Header ────────────────────────────────────────

function authHeader(): string {
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

// ─── Create Razorpay Order ────────────────────────────────────

export type RazorpayOrderNotes = {
  customer_id?: string;
  customer_email?: string;
  [key: string]: string | undefined;
};

export type RazorpayOrderResult = {
  id: string;           // Razorpay order ID, e.g. order_XXXXXX
  amount: number;       // in paise
  currency: string;
  receipt?: string;
  notes?: RazorpayOrderNotes;
  status: string;
};

/**
 * Create a Razorpay order via the REST API.
 *
 * @param amountInPaise - Total amount in the smallest currency unit (paise for INR).
 * @param receipt       - Optional internal reference (max 40 chars).
 * @param notes         - Lightweight metadata (customer_id, customer_email, etc.).
 */
export async function createRazorpayOrder(
  amountInPaise: number,
  receipt: string,
  notes: RazorpayOrderNotes = {}
): Promise<RazorpayOrderResult> {
  const res = await fetch(`${RAZORPAY_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt.slice(0, 40), // Razorpay limit
      notes,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Razorpay create order failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<RazorpayOrderResult>;
}

// ─── Fetch Razorpay Order ─────────────────────────────────────

/**
 * Fetch an existing Razorpay order by its ID.
 * Useful in the webhook to retrieve lightweight metadata from notes.
 */
export async function fetchRazorpayOrder(
  razorpayOrderId: string
): Promise<RazorpayOrderResult> {
  const res = await fetch(`${RAZORPAY_BASE}/orders/${razorpayOrderId}`, {
    method: "GET",
    headers: { Authorization: authHeader() },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Razorpay fetch order failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<RazorpayOrderResult>;
}

// ─── Verify Payment Signature ─────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature returned by the Razorpay Checkout modal.
 *
 * The payload to sign is: `razorpay_order_id|razorpay_payment_id`
 * Signed with RAZORPAY_KEY_SECRET.
 *
 * @returns true if the signature is valid, false otherwise.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(razorpaySignature, "hex")
    );
  } catch (e) {
    return false;
  }
}

// ─── Verify Webhook Signature ─────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature of an incoming Razorpay webhook.
 *
 * The payload to sign is the raw request body (as a string).
 * The signature is in the `X-Razorpay-Signature` header.
 *
 * @param rawBody   - The raw UTF-8 request body string.
 * @param signature - Value of the `X-Razorpay-Signature` header.
 * @param secret    - The webhook secret configured on Razorpay Dashboard.
 * @returns true if valid.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch (e) {
    return false;
  }
}

// ─── Create Refund ────────────────────────────────────────────

export type RazorpayRefundResult = {
  id: string;          // rfnd_XXXX
  entity: string;
  amount: number;      // in paise
  currency: string;
  payment_id: string;
  status: string;      // "pending" | "processed" | "failed"
  speed_processed: string;
  speed_requested: string;
  receipt: string | null;
  created_at: number;
};

/**
 * Create a full refund for a captured Razorpay payment.
 *
 * @param paymentId    - The Razorpay payment ID (pay_XXXX)
 * @param amountInPaise - Full amount to refund, in paise (e.g. 23900 for ₹239)
 * @param receipt       - Unique idempotency key (use the internal order ID e.g. AAU-YYMMDD-XXXX)
 *
 * Throws an error if Razorpay rejects the request (insufficient balance, already refunded, etc.)
 */
export async function createRefund(
  paymentId: string,
  amountInPaise: number,
  receipt: string
): Promise<RazorpayRefundResult> {
  const res = await fetch(`${RAZORPAY_BASE}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: amountInPaise,
      speed: "normal",
      receipt: receipt.slice(0, 40), // Razorpay receipt max length
      notes: {
        order_id: receipt,
        reason: "Cancelled by customer",
      },
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    const description = json?.error?.description || `Razorpay refund failed (${res.status})`;
    throw new Error(description);
  }

  return json as RazorpayRefundResult;
}
