import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { getSession } from "@/lib/session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const SESSION_SECRET = process.env.SESSION_SECRET || "default_super_secret_for_dev_only";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail } = await request.json();

    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) {
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
    }

    const emailLower = newEmail.toLowerCase().trim();

    // Prevent changing to the same email
    if (emailLower === session.email.toLowerCase().trim()) {
      return NextResponse.json({ success: false, error: "This is already your current email address." }, { status: 400 });
    }

    // 1. Check if the new email is already registered to another user
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

    // 2. Check for existing active OTP session
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

    if (existingSessions && existingSessions.length > 0) {
      // Sort by createdAt descending
      const latestSession = existingSessions.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      // Check 60-second cooldown
      const timeSinceCreated = Date.now() - new Date(latestSession.createdAt).getTime();
      if (timeSinceCreated < 60 * 1000) {
        return NextResponse.json(
          { success: false, error: "Please wait 60 seconds before requesting another code." },
          { status: 429 }
        );
      }

      // Delete existing sessions for this email to prevent clutter
      for (const otpSession of existingSessions) {
        await fetch(`${STRAPI_URL}/api/otp-sessions/${otpSession.documentId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${STRAPI_TOKEN}`,
          },
        }).catch(() => {});
      }
    }

    // 3. Generate new OTP and Hash
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const otpHash = crypto.createHmac("sha256", SESSION_SECRET).update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 4. Save new OTP session in Strapi
    const createPayload = {
      data: {
        email: emailLower,
        otpHash,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
      },
    };

    const createRes = await fetch(`${STRAPI_URL}/api/otp-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_TOKEN}`,
      },
      body: JSON.stringify(createPayload),
    });

    if (!createRes.ok) {
      return NextResponse.json({ success: false, error: "System is currently in maintenance mode." }, { status: 503 });
    }

    // 5. Send Email via Resend
    const { error: emailError } = await resend.emails.send({
      from: `Aaushadhi Wellness <${fromEmail}>`,
      to: [emailLower],
      subject: "Verify your new email address",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; text-align: center;">
          <h2 style="color: #5C6B2E;">Aaushadhi Wellness</h2>
          <p>Your secure verification code for changing your email is:</p>
          <h1 style="font-size: 36px; letter-spacing: 4px; color: #333; margin: 20px 0;">${otp}</h1>
          <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
          <p style="color: #666; font-size: 12px; margin-top: 40px;">If you didn't request this change, please ignore this email.</p>
        </div>
      `,
    });

    if (emailError) {
      // Cleanup: delete the session we just created since the email failed to send
      if (createRes.ok) {
        const createJson = await createRes.json();
        const newSessionId = createJson.data?.documentId;
        if (newSessionId) {
          await fetch(`${STRAPI_URL}/api/otp-sessions/${newSessionId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
          }).catch(() => {});
        }
      }
      return NextResponse.json({ success: false, error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Change Email Request OTP error:", error);
    return NextResponse.json({ success: false, error: "System is currently in maintenance mode." }, { status: 503 });
  }
}
