import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/checkout/payment-verify
 *
 * Placeholder for future payment gateway signature verification.
 * When a payment gateway (e.g., Razorpay) is integrated, this endpoint will:
 * 1. Receive the payment gateway's callback data
 * 2. Verify the payment signature server-side
 * 3. Update the order status in Strapi to "paid"
 * 4. Trigger iCarry shipment booking
 * 5. Return order confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Implement when payment gateway credentials are available
    // 1. Extract payment gateway response (orderId, paymentId, signature)
    // 2. Verify signature using gateway's secret key
    // 3. Update order in Strapi: paymentStatus = "paid", orderStatus = "confirmed"
    // 4. Book shipment on iCarry
    // 5. Return confirmation

    return NextResponse.json(
      {
        success: false,
        error:
          "Online payment is not yet configured. Please use Cash on Delivery.",
        _placeholder: true,
        _receivedBody: body,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { success: false, error: "Payment verification failed." },
      { status: 500 }
    );
  }
}
