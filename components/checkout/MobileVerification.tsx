"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

type Props = {
  onVerified: (phone: string, idToken: string) => void;
};

export default function MobileVerification({ onVerified }: Props) {
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const setupRecaptcha = useCallback(() => {
    if (recaptchaRef.current) return;

    const auth = getFirebaseAuth();
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
  }, []);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setError("");
    setLoading(true);

    try {
      setupRecaptcha();
      const auth = getFirebaseAuth();
      const fullPhone = `+91${cleanPhone}`;
      const confirmation = await signInWithPhoneNumber(
        auth,
        fullPhone,
        recaptchaRef.current!
      );
      confirmationRef.current = confirmation;
      setOtpSent(true);
      setCountdown(30);
      // Focus first OTP input
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err: unknown) {
      console.error("OTP send error:", err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError("Failed to send OTP. Please try again.");
      }
      // Reset recaptcha on error
      recaptchaRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (value && index === 5 && newOtp.every((d) => d !== "")) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      verifyOtp(pasted);
    }
  };

  const verifyOtp = async (code: string) => {
    if (!confirmationRef.current) {
      setError("Please request a new OTP");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await confirmationRef.current.confirm(code);
      const idToken = await result.user.getIdToken();
      const cleanPhone = phone.replace(/\s/g, "");
      onVerified(`+91${cleanPhone}`, idToken);
    } catch (err: unknown) {
      console.error("OTP verify error:", err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/invalid-verification-code") {
        setError("Incorrect OTP. Please check and try again.");
      } else {
        setError("Verification failed. Please try again.");
      }
      setOtp(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtpSent(false);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    recaptchaRef.current = null;
    // Small delay to let recaptcha reset
    setTimeout(() => handleSendOtp(), 100);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Phone icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-olive/10 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5C6B2E"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
      </div>

      <h2
        className="text-xl md:text-2xl font-bold text-text-dark text-center mb-2"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        {otpSent ? "Enter Verification Code" : "Verify Your Mobile Number"}
      </h2>
      <p className="text-text-muted text-sm text-center mb-8">
        {otpSent
          ? `We've sent a 6-digit code to +91 ${phone}`
          : "We'll send you a one-time code to verify your identity"}
      </p>

      {!otpSent ? (
        /* Phone number input */
        <div className="space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-olive/20 focus-within:border-olive/40 transition-colors">
            <span className="flex items-center px-4 bg-parchment/60 text-text-dark font-medium text-sm border-r border-olive/10">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
              placeholder="Enter 10-digit mobile number"
              className="flex-1 px-4 py-3.5 text-sm text-text-dark bg-white/60 outline-none placeholder:text-text-muted/60"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center animate-pulse">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || phone.length !== 10}
            className={`
              w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider
              transition-all duration-200 cursor-pointer
              ${
                loading || phone.length !== 10
                  ? "bg-olive/40 text-white/60 cursor-not-allowed"
                  : "bg-olive text-white hover:bg-olive-light active:scale-[0.98] shadow-md"
              }
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.3"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Sending...
              </span>
            ) : (
              "Send OTP"
            )}
          </button>
        </div>
      ) : (
        /* OTP input */
        <div className="space-y-4">
          <div
            className="flex justify-center gap-2 md:gap-3"
            onPaste={handleOtpPaste}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpInputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className={`
                  w-11 h-13 md:w-12 md:h-14 rounded-xl text-center text-lg font-bold
                  border-2 outline-none transition-all duration-200
                  ${
                    digit
                      ? "border-olive bg-olive/5 text-olive"
                      : "border-olive/20 bg-white/60 text-text-dark"
                  }
                  focus:border-olive focus:ring-2 focus:ring-olive/20
                `}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center animate-pulse">
              {error}
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-olive text-sm">
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity="0.3"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Verifying...
            </div>
          )}

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-text-muted text-xs">
                Resend code in{" "}
                <span className="font-semibold text-olive">{countdown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-olive text-xs font-semibold hover:underline cursor-pointer"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />
    </div>
  );
}
