/**
 * iCarry.in Delivery Aggregator API Client
 *
 * Based on the official iCarry REST API PDF documentation (v16.0).
 *
 * Endpoints used:
 *   1. POST /api_login                — Authenticate and get api_token
 *   2. POST /api_check_pincode        — Check pincode serviceability
 *   3. POST /api_add_shipment_surface  — Book a surface shipment (Draft mode)
 */

const ICARRY_BASE_URL = "https://www.icarry.in";
const ICARRY_USERNAME = process.env.ICARRY_API_USERNAME || "";
const ICARRY_API_KEY = process.env.ICARRY_API_KEY || "";

// Default package dimensions for herbal powder pouches (100g units)
const DEFAULT_PACKAGE = {
  length: 20, // cm
  breadth: 15, // cm
  height: 10, // cm
  weightPerUnit: 120, // grams (100g product + packaging)
};

// ─── Token Cache ─────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Login to iCarry and obtain an API token.
 * Tokens are cached for 55 minutes (iCarry tokens last ~60 min).
 *
 * Endpoint: POST /api_login
 * Body: { username, key }
 * Response: { success, api_token }
 */
async function getToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const url = `${ICARRY_BASE_URL}/api_login`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: ICARRY_USERNAME,
      key: ICARRY_API_KEY,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iCarry login failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (!data.api_token) {
    throw new Error(`iCarry login returned no token: ${JSON.stringify(data)}`);
  }

  cachedToken = data.api_token;
  // Cache for 55 minutes (safety margin before 60-min expiry)
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;

  return cachedToken!;
}

// ─── iCarry State Codes Mapping ──────────────────────────────
const IARRY_STATE_CODES: Record<string, string> = {
  "Andaman and Nicobar Islands": "AN",
  "Andhra Pradesh": "AP",
  "Arunachal Pradesh": "AR",
  "Assam": "AS",
  "Bihar": "BI",
  "Chandigarh": "CH",
  "Dadra and Nagar Haveli": "DA",
  "Daman and Diu": "DM",
  "Delhi": "DE",
  "Goa": "GO",
  "Gujarat": "GU",
  "Haryana": "HA",
  "Himachal Pradesh": "HP",
  "Jammu and Kashmir": "JA",
  "Karnataka": "KA",
  "Kerala": "KE",
  "Lakshadweep Islands": "LI",
  "Madhya Pradesh": "MP",
  "Maharashtra": "MA",
  "Manipur": "MN",
  "Meghalaya": "ME",
  "Mizoram": "MI",
  "Nagaland": "NA",
  "Odisha": "OD",
  "Puducherry": "PO",
  "Punjab": "PU",
  "Rajasthan": "RA",
  "Sikkim": "SI",
  "Tamil Nadu": "TN",
  "Tripura": "TR",
  "Uttar Pradesh": "UP",
  "West Bengal": "WB",
  "Telangana": "TS",
  "Jharkhand": "JH",
  "Uttarakhand": "UK",
  "Chattisgarh": "CG",
  "Chhattisgarh": "CG", // Adding standard alternative spelling
  "Ladakh": "LA",
};

// ─── iCarry Status Mapping ─────────────────────────────────────
export function mapIcarryStatus(icarryStatus: string | number): { status?: string; needsManualReview?: boolean } {
  const statusStr = String(icarryStatus);
  switch (statusStr) {
    case "1":
    case "24":
    case "25":
      return { status: "confirmed" };
    case "2":
      return { status: "processing" };
    case "3":
      return { status: "shipped" };
    case "7":
      return { status: "cancelled" };
    case "16":
      return { status: "cancelled", needsManualReview: true };
    case "21":
      return { status: "delivered" };
    case "22":
      return { status: "in_transit" };
    case "23":
    case "27":
      return { status: "returned" };
    case "26":
      return { status: "out_for_delivery" };
    default:
      // Unknown or problematic status (like Damaged, Lost)
      return { needsManualReview: true };
  }
}

// ─── Centralized Authenticated Fetch ───────────────────────────

/**
 * A wrapper for iCarry API requests that automatically handles authentication,
 * appends the api_token, and retries the request once if the token is invalid/expired.
 */
async function fetchICarry(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const token = await getToken();
  
  // Append api_token to the endpoint URL
  const urlObj = new URL(`${ICARRY_BASE_URL}${endpoint}`);
  urlObj.searchParams.set("api_token", token);
  
  const res = await fetch(urlObj.toString(), options);
  
  // If we get an error response, try parsing it to see if it's a token issue.
  // iCarry sometimes returns 200 OK but with an error payload.
  let isTokenExpired = false;
  let data: any = null;
  
  if (res.status === 401 || res.status === 403) {
    isTokenExpired = true;
  } else if (res.ok) {
    // Clone response to read body without consuming it
    const clonedRes = res.clone();
    try {
      data = await clonedRes.json();
      if (
        data && 
        data.error && 
        (typeof data.error === 'string' && (data.error.toLowerCase().includes("token") || data.error.toLowerCase().includes("auth")))
      ) {
        isTokenExpired = true;
      }
    } catch {
      // Not JSON, ignore
    }
  }

  // If token seems invalid and this is not a retry, clear token and retry once
  if (isTokenExpired && !isRetry) {
    console.warn("iCarry token expired or invalid, refetching and retrying...");
    cachedToken = null;
    tokenExpiresAt = 0;
    return fetchICarry(endpoint, options, true);
  }

  // If we pre-read the data and it has a generic error that we couldn't handle, we don't throw here.
  // The caller will handle it based on their specific API contract.
  return res;
}

// ─── Types ───────────────────────────────────────────────────

export type ICarryBookingResponse = {
  success?: string;
  error?: string;
  shipment_id?: string;
  pickup_id?: string;
  courier_id?: string;
  courier_name?: string;
  awb?: string;
  cost_estimate?: string;
  tracking_url?: string;
};

export type ICarryServiceabilityResponse = {
  success: number;
  msg?: Array<{
    service: string;
    prepaid: string;
    cod: string;
    pickup: string;
  }>;
};

export type ICarrySyncStatusResponse = {
  success?: string;
  error?: string;
  msg?: Array<{
    shipment_id: string;
    status: string;
    date_delivered: string;
    date_picked: string;
  }>;
};

// ─── Check Serviceability by Pincode ─────────────────────────

/**
 * Check if a pincode is serviceable by iCarry couriers.
 *
 * Endpoint: POST /api_check_pincode
 */
export async function checkServiceability(
  pincode: string
): Promise<{ serviceable: boolean; codAvailable: boolean }> {
  const res = await fetchICarry("/api_check_pincode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pincode }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iCarry serviceability check failed: ${res.status} ${text}`);
  }

  const data: ICarryServiceabilityResponse = await res.json();

  if (data.success !== 1 || !data.msg || data.msg.length === 0) {
    return { serviceable: false, codAvailable: false };
  }

  // Check if COD is available for any service type
  const codAvailable = data.msg.some((s) => s.cod === "Y");

  return { serviceable: true, codAvailable };
}

// ─── Book Shipment ───────────────────────────────────────────

type BookShipmentParams = {
  consigneeName: string;
  consigneePhone: string;
  consigneeAddress: string;
  consigneeCity: string;
  consigneeState: string;
  consigneePincode: string;
  orderValue: number;
  isCod: boolean;
  totalWeightGrams: number;
  orderId: string; // Our internal order ID
  productDescription: string;
  pickupAddressId: number; // Required by iCarry — set in .env
};

/**
 * Book a draft shipment without assigning a courier.
 *
 * Endpoint: POST /api_add_shipment_surface
 */
export async function bookShipment(
  params: BookShipmentParams
): Promise<ICarryBookingResponse> {
  const body = new URLSearchParams();

  // Pickup address (must be pre-configured in iCarry dashboard)
  body.append("pickup_address_id", String(params.pickupAddressId));
  body.append("client_order_id", params.orderId);

  // Draft mode - do not book/assign courier automatically
  body.append("save_only", "1");

  // Consignee details
  const cleanPhone = params.consigneePhone.replace(/\D/g, "").slice(-10);
  body.append("consignee[name]", params.consigneeName);
  body.append("consignee[mobile]", cleanPhone);
  body.append("consignee[address]", params.consigneeAddress);
  body.append("consignee[city]", params.consigneeCity);
  body.append("consignee[pincode]", params.consigneePincode);
  
  // Map full state name to 2-letter code if possible
  const stateName = params.consigneeState.trim();
  const stateCode = IARRY_STATE_CODES[stateName] || IARRY_STATE_CODES[stateName.replace("State", "").trim()] || stateName;
  body.append("consignee[state]", stateCode);
  
  body.append("consignee[country_code]", "IN");

  // Parcel details
  body.append("parcel[type]", params.isCod ? "C" : "P");
  body.append("parcel[value]", String(params.orderValue));
  body.append("parcel[currency]", "INR");
  body.append("parcel[contents]", params.productDescription);
  body.append("parcel[weight][weight]", String(params.totalWeightGrams));
  body.append("parcel[weight][unit]", "gm");
  body.append("parcel[dimensions][length]", String(DEFAULT_PACKAGE.length));
  body.append("parcel[dimensions][breadth]", String(DEFAULT_PACKAGE.breadth));
  body.append("parcel[dimensions][height]", String(DEFAULT_PACKAGE.height));
  body.append("parcel[dimensions][unit]", "cm");

  const res = await fetchICarry("/api_add_shipment_surface", {
    method: "POST",
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iCarry booking failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  // The iCarry API often returns 200 OK even for failures, with an error message in the body
  if (data.error) {
    throw new Error(`iCarry API returned error: ${data.error}`);
  }

  return data;
}

// ─── Sync Shipments ──────────────────────────────────────────

/**
 * Fetch status of multiple shipments from iCarry.
 * 
 * Endpoint: POST /api_shipment_status_sync
 */
export async function syncShipments(shipmentIds: string[]): Promise<ICarrySyncStatusResponse> {
  const body = new URLSearchParams();
  
  // Array parameters need to be appended individually
  shipmentIds.forEach(id => {
    body.append("shipment_ids[]", id);
  });

  const res = await fetchICarry("/api_shipment_status_sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iCarry sync shipments failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  
  if (data.error) {
    throw new Error(`iCarry API returned error: ${data.error}`);
  }
  
  return data;
}

// ─── Get Shipment Label Details ──────────────────────────────

export type ICarryShipmentLabelResponse = {
  success: number | string;
  awb?: string;
  courier_name?: string;
  courier_id?: string | number;
  barcode_img?: string;
  tracking_url?: string;
  [key: string]: any;
};

/**
 * Fetch shipment label details to enrich tracking information (AWB, Courier Name, Courier ID).
 * 
 * Endpoint: POST /api_print_shipment_label
 */
export async function getShipmentLabel(shipmentId: string): Promise<ICarryShipmentLabelResponse> {
  const body = new URLSearchParams();
  body.append("shipment_id", shipmentId);

  const res = await fetchICarry("/api_print_shipment_label", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iCarry print label failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}

// ─── Cancel Shipment ───────────────────────────────────────────

export type ICarryCancelResponse = {
  success?: string;
  error?: string;
  shipment_id?: string;
};

/**
 * Cancel an existing iCarry shipment.
 * 
 * Endpoint: POST /api_cancel_shipment
 */
export async function cancelShipment(shipmentId: string): Promise<ICarryCancelResponse> {
  const body = new URLSearchParams();
  body.append("shipment_id", shipmentId);

  const res = await fetchICarry("/api_cancel_shipment", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iCarry cancel shipment failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  
  if (data.error) {
    throw new Error(`iCarry API returned error: ${data.error}`);
  }
  
  return data;
}

// ─── Get Pincode Details (India Post API) ────────────────────

/**
 * Get city/state from a pincode using the India Post API.
 * This is NOT an iCarry endpoint — used for address auto-fill.
 */
export async function getPincodeDetails(
  pincode: string
): Promise<{ city: string; state: string; country: string } | null> {
  try {
    const res = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const data = await res.json();

    if (
      data &&
      data[0] &&
      data[0].Status === "Success" &&
      data[0].PostOffice &&
      data[0].PostOffice.length > 0
    ) {
      const po = data[0].PostOffice[0];
      return {
        city: po.District || po.Division || "",
        state: po.State || "",
        country: "India",
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Utility ─────────────────────────────────────────────────

/**
 * Helper to calculate total package weight from order items.
 * Each unit is 100g of product + packaging overhead.
 */
export function calculateTotalWeight(
  items: { quantity: number }[]
): number {
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  return totalUnits * DEFAULT_PACKAGE.weightPerUnit;
}
