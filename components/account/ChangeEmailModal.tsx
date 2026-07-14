"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ChangeEmailModal({ isOpen, onClose, onSuccess }: Props) {
  const { refreshCustomer } = useAuth();
  
  const [newEmail, setNewEmail] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNewEmail("");
      setIsOtpSent(false);
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setInfo("");
      setCooldown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    if (cooldown > 0) return;

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/account/profile/change-email/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send code.");
      }
      
      setIsOtpSent(true);
      setCooldown(60);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    } catch (err: any) {
      const msg = err.message || "Failed to send code. Please try again.";
      if (msg.includes("wait 60 seconds")) {
        setIsOtpSent(true);
        setCooldown(60);
        setTimeout(() => inputRefs[0].current?.focus(), 100);
        setInfo("Code was already sent recently. Please check your email.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return;

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/account/profile/change-email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, otp: code }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid or expired code.");
      }
      
      // Successfully changed email
      await refreshCustomer();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    if (value && index === 5 && newOtp.every((d) => d !== "")) {
      setTimeout(() => {
        handleVerifyOtp();
      }, 50);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs[nextIndex].current?.focus();

    if (pastedData.length === 6) {
      setTimeout(() => handleVerifyOtp(), 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-parchment rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-dark transition-colors z-10 cursor-pointer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-olive mb-2" style={{ fontFamily: "var(--font-outfit)" }}>
              Change Email
            </h2>
            <p className="text-sm text-text-muted">
              {!isOtpSent 
                ? "Enter your new email address. We'll send a verification code." 
                : "We sent a 6-digit code to your new email."}
            </p>
          </div>

          {!isOtpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  New Email Address
                </label>
                <input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-olive/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none transition-all duration-200 bg-white/50"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-xs text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || !newEmail}
                className="w-full py-3.5 rounded-xl bg-olive text-white text-sm font-bold uppercase tracking-wider hover:bg-olive-light transition-all duration-200 shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-olive/30 focus:border-olive focus:ring-2 focus:ring-olive/20 outline-none transition-all duration-200 bg-white"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
              {info && <p className="text-olive text-xs text-center">{info}</p>}

              <button
                type="submit"
                disabled={loading || otp.some((d) => d === "")}
                className="w-full py-3.5 rounded-xl bg-olive text-white text-sm font-bold uppercase tracking-wider hover:bg-olive-light transition-all duration-200 shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify & Change Email"}
              </button>

              <div className="text-center text-sm">
                <span className="text-text-muted">Didn't receive the code? </span>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={cooldown > 0 || loading}
                  className="text-olive font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
