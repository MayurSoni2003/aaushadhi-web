"use client";

import { useState, useEffect, useRef } from "react";
import type { StrapiAddress } from "@/lib/auth-types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editAddress?: StrapiAddress | null;
};

export default function AddressFormModal({ isOpen, onClose, onSaved, editAddress }: Props) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [pincode, setPincode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [checkingPincode, setCheckingPincode] = useState(false);
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);
  const [pincodeError, setPincodeError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (editAddress) {
      setName(editAddress.name || "");
      setMobile(editAddress.mobile || "");
      setPincode(editAddress.pincode || "");
      setAddressLine1(editAddress.addressLine1 || "");
      setAddressLine2(editAddress.addressLine2 || "");
      setCity(editAddress.city || "");
      setState(editAddress.state || "");
      setCountry(editAddress.country || "");
      setIsDefault(editAddress.isDefault || false);
      setPincodeValid(true); // Existing address was already validated
    } else {
      resetForm();
    }
  }, [editAddress, isOpen]);

  function resetForm() {
    setName("");
    setMobile("");
    setPincode("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("");
    setCountry("");
    setIsDefault(false);
    setPincodeValid(null);
    setPincodeError("");
    setFormError("");
  }

  // Serviceability check on pincode change
  function handlePincodeChange(value: string) {
    setPincode(value);
    setPincodeValid(null);
    setPincodeError("");
    setCity("");
    setState("");
    setCountry("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length === 6 && /^\d{6}$/.test(value)) {
      debounceRef.current = setTimeout(() => checkPincode(value), 400);
    }
  }

  async function checkPincode(pin: string) {
    setCheckingPincode(true);
    try {
      const res = await fetch("/api/checkout/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode: pin,
          items: [{ quantity: 1, price: 100 }], // Minimal payload for serviceability check
        }),
      });

      const data = await res.json();
      if (data.success && data.serviceable) {
        setPincodeValid(true);
        setPincodeError("");
        if (data.city) setCity(data.city);
        if (data.state) setState(data.state);
        if (data.country) setCountry(data.country);
      } else {
        setPincodeValid(false);
        setPincodeError(data.error || "This pincode is not serviceable for delivery.");
      }
    } catch {
      setPincodeValid(false);
      setPincodeError("Unable to verify pincode. Please try again.");
    } finally {
      setCheckingPincode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    // Validate
    if (!name.trim()) { setFormError("Name is required"); return; }
    if (!mobile.trim() || !/^\d{10}$/.test(mobile.replace(/\D/g, ""))) {
      setFormError("A valid 10-digit mobile number is required");
      return;
    }
    if (!pincode || pincodeValid !== true) {
      setFormError("Please enter a valid, serviceable pincode");
      return;
    }
    if (!addressLine1.trim()) { setFormError("Address line 1 is required"); return; }
    if (!city.trim()) { setFormError("City is required"); return; }
    if (!state.trim()) { setFormError("State is required"); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        mobile: mobile.replace(/\D/g, "").slice(-10),
        pincode,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || "India",
        isDefault,
      };

      const url = editAddress
        ? `/api/addresses/${editAddress.documentId}`
        : "/api/addresses";

      const res = await fetch(url, {
        method: editAddress ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSaved();
        onClose();
        resetForm();
      } else {
        setFormError(data.error || "Failed to save address");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-olive/10 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h3
              className="text-lg font-bold text-olive"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {editAddress ? "Edit Address" : "Add New Address"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-olive/10 flex items-center justify-center hover:bg-olive/20 transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {formError}
            </div>
          )}

          {/* Name & Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 transition-all"
                placeholder="Consignee name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Mobile <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 transition-all"
                placeholder="10-digit mobile"
              />
            </div>
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Pincode <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={pincode}
                onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className={`w-full px-4 py-2.5 rounded-xl border text-text-dark text-sm focus:outline-none focus:ring-2 transition-all ${
                  pincodeValid === true
                    ? "border-green-300 bg-green-50/50 focus:ring-green-200"
                    : pincodeValid === false
                      ? "border-red-300 bg-red-50/50 focus:ring-red-200"
                      : "border-olive/15 bg-cream/50 focus:ring-olive/30"
                }`}
                placeholder="6-digit pincode"
              />
              {checkingPincode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
                </div>
              )}
              {pincodeValid === true && !checkingPincode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              )}
            </div>
            {pincodeError && (
              <p className="text-xs text-red-500 mt-1">{pincodeError}</p>
            )}
            {pincodeValid === true && city && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Serviceable — {city}, {state}
              </p>
            )}
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Address Line 1 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 transition-all"
              placeholder="House/flat number, street, locality"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Address Line 2
            </label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 transition-all"
              placeholder="Landmark, area (optional)"
            />
          </div>

          {/* City, State, Country (auto-filled) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 transition-all"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                State <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-olive/15 bg-cream/50 text-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-olive/30 transition-all"
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-olive/10 bg-olive/5 text-text-muted text-sm cursor-not-allowed"
                readOnly
                placeholder="India"
              />
            </div>
          </div>

          {/* Set as Default */}
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-olive/30 text-olive focus:ring-olive/30 accent-olive"
            />
            <span className="text-sm text-text-dark">Set as default address</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-full border border-olive/20 text-text-dark text-sm font-semibold hover:bg-olive/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || pincodeValid !== true}
              className="flex-1 px-4 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive-light disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : editAddress ? (
                "Update Address"
              ) : (
                "Save Address"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
