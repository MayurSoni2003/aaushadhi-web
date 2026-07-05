import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import{
  checkServiceability,
  getPincodeDetails,
} from "@/lib/icarry";
import type { ServiceabilityResponse } from "@/lib/checkout-types";

/**
 * POST /api/checkout/serviceability
 *
 * 1. Verify user session.
 * 2. Check if the pincode is serviceable via iCarry api_check_pincode.
 * 3. Look up city/state from India Post API for address auto-fill.
 * 4. Calculate static shipping cost.
 *
 * Body: { pincode, items: { quantity, price }[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pincode, items } = body;

    // ─── Validate inputs ───
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json<ServiceabilityResponse>(
        { success: false, error: "Please enter a valid 6-digit pincode" },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json<ServiceabilityResponse>(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ServiceabilityResponse>(
        { success: false, error: "Cart is empty" },
        { status: 400 }
      );
    }


    // ─── Step 1: Check serviceability via iCarry ───
    const serviceability = await checkServiceability(pincode);
    if (!serviceability.serviceable) {
      return NextResponse.json<ServiceabilityResponse>({
        success: false,
        error: "Sorry, delivery is not available to this pincode at the moment.",
      });
    }

    // ─── Step 2: Get pincode location details (India Post) ───
    const locationDetails = await getPincodeDetails(pincode);
    if (!locationDetails) {
      return NextResponse.json<ServiceabilityResponse>(
        { success: false, error: "Invalid pincode. Please check and try again." },
        { status: 400 }
      );
    }

    // ─── Step 3: Calculate static shipping cost ───
    // Calculate order value from items
    const orderValue = items.reduce(
      (sum: number, item: { price?: number; quantity: number }) =>
        sum + (item.price || 399) * item.quantity,
      0
    );

    const shippingCost = orderValue < 499 ? 80 : 0;

    return NextResponse.json<ServiceabilityResponse>({
      success: true,
      data: {
        serviceable: true,
        city: locationDetails.city,
        state: locationDetails.state,
        country: locationDetails.country,
        shippingCost,
        estimatedDays: "5-7 business days",
      },
    });
  } catch (error) {
    console.error("Serviceability check error:", error);
    return NextResponse.json<ServiceabilityResponse>(
      { success: false, error: "Unable to check delivery availability. Please try again." },
      { status: 500 }
    );
  }
}
