"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export default function ProfileForm() {
  const { refreshCustomer } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await fetch("/api/account/profile");
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setFirstName(data.data.firstName);
        setLastName(data.data.lastName);
        setPhone(data.data.phone);
      }
    } catch {
      setErrorMsg("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!firstName.trim()) {
      setErrorMsg("First name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone }),
      });

      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setSuccessMsg("Profile updated successfully");
        // Refresh the auth context so the navbar shows the updated name
        await refreshCustomer();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data.error || "Failed to update profile");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-olive/10 p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-olive/10 rounded w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="h-4 bg-olive/10 rounded w-20" />
              <div className="h-11 bg-olive/5 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-olive/10 rounded w-20" />
              <div className="h-11 bg-olive/5 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-olive/10 rounded w-20" />
              <div className="h-11 bg-olive/5 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-olive/10 rounded w-20" />
              <div className="h-11 bg-olive/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-olive/10 p-6 md:p-8">
      <h2
        className="text-lg font-bold text-olive mb-6"
        style={{ fontFamily: "var(--font-outfit)" }}
      >
        Personal Information
      </h2>

      {/* Success message */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2 animate-fade-slide-up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* First Name */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive/30 transition-all"
              placeholder="Enter your first name"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive/30 transition-all"
              placeholder="Enter your last name"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl border border-olive/10 bg-olive/5 text-text-muted text-sm cursor-not-allowed"
            />
            <p className="text-[11px] text-text-muted mt-1">Email cannot be changed as it is your login identifier.</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive/30 transition-all"
              placeholder="Enter your phone number"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-olive text-white text-sm font-bold uppercase tracking-wider hover:bg-olive-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
