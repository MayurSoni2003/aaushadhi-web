import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSession, createSession } from "@/lib/session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "default_super_secret_for_dev_only";

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.email || !session.customerDocumentId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail, otp } = await request.json();

    if (!newEmail || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const emailLower = newEmail.toLowerCase().trim();

    // Prevent changing to the same email
    if (emailLower === session.email.toLowerCase().trim()) {
      return NextResponse.json({ success: false, error: "This is already your current email address." }, { status: 400 });
    }

    // 1. Fetch active OTP session
    const otpQuery = new URLSearchParams({
      "filters[email][$eq]": emailLower,
    }).toString();

    const fetchRes = await fetch(`${STRAPI_URL}/api/otp-sessions?${otpQuery}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
    });

    if (!fetchRes.ok) {
      return NextResponse.json({ success: false, error: "System is currently in maintenance mode." }, { status: 503 });
    }

    const fetchJson = await fetchRes.json();
    const existingSessions = fetchJson.data;

    if (!existingSessions || existingSessions.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid or expired code." }, { status: 401 });
    }

    // Use the most recent session
    const activeOtpSession = existingSessions.sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const { documentId: otpSessionDocumentId, otpHash, expiresAt, attempts } = activeOtpSession;

    // 2. Check Expiry
    if (new Date() > new Date(expiresAt)) {
      await fetch(`${STRAPI_URL}/api/otp-sessions/${otpSessionDocumentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      }).catch(() => {});
      return NextResponse.json({ success: false, error: "OTP has expired. Please request a new code." }, { status: 400 });
    }

    // 3. Check Attempts
    if (attempts >= MAX_ATTEMPTS) {
      await fetch(`${STRAPI_URL}/api/otp-sessions/${otpSessionDocumentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      }).catch(() => {});
      return NextResponse.json({ success: false, error: "Too many failed attempts. Please request a new code." }, { status: 429 });
    }

    // 4. Verify Hash
    const incomingHash = crypto.createHmac("sha256", SESSION_SECRET).update(otp).digest("hex");

    if (incomingHash !== otpHash) {
      // Increment attempts
      await fetch(`${STRAPI_URL}/api/otp-sessions/${otpSessionDocumentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({
          data: { attempts: attempts + 1 },
        }),
      }).catch(() => {});
      return NextResponse.json({ success: false, error: "Invalid OTP code." }, { status: 401 });
    }

    // 5. Success! Delete the OTP session
    await fetch(`${STRAPI_URL}/api/otp-sessions/${otpSessionDocumentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
    }).catch(() => {});

    // 6. Final verification - Ensure email isn't already taken (race condition check)
    const customerQuery = new URLSearchParams({
      "filters[email][$eq]": emailLower,
    }).toString();

    const customerRes = await fetch(`${STRAPI_URL}/api/customers?${customerQuery}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
    });

    if (customerRes.ok) {
      const customerJson = await customerRes.json();
      if (customerJson.data && customerJson.data.length > 0) {
        return NextResponse.json({ success: false, error: "This email is already registered to another account." }, { status: 400 });
      }
    }

    // 7. Update the customer's email in Strapi
    const updatePayload = {
      data: {
        email: emailLower,
      },
    };

    const updateRes = await fetch(`${STRAPI_URL}/api/customers/${session.customerDocumentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok) {
      return NextResponse.json({ success: false, error: "Failed to update email." }, { status: 500 });
    }

    // 8. Re-issue the session cookie with the new email
    await createSession({
      customerId: session.customerId,
      customerDocumentId: session.customerDocumentId,
      email: emailLower,
    });

    return NextResponse.json({
      success: true,
      message: "Email changed successfully.",
    });
  } catch (error) {
    console.error("Change Email Verify OTP error:", error);
    return NextResponse.json({ success: false, error: "System is currently in maintenance mode." }, { status: 503 });
  }
}
