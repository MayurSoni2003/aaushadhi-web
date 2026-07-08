"use client";

import { useState, useEffect, useCallback } from "react";
import type { DeliveryEstimate, PaymentMethod } from "@/lib/checkout-types";
import { useAuth } from "@/context/AuthContext";
import type { StrapiAddress } from "@/lib/auth-types";

type Props = {
  cartItems: { quantity: number }[];
  cartTotal: number;
  onComplete: (data: {
    pincode: string;
    fullName: string;
    mobile?: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    deliveryEstimate: DeliveryEstimate;
  }) => void;
};

export default function AddressForm({ cartItems, cartTotal, onComplete }: Props) {
  const { customer, isLoading } = useAuth();
  const [viewMode, setViewMode] = useState<"list" | "new">("list");
  
  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<StrapiAddress[]>([]);
  const [fetchingAddresses, setFetchingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Manual form state
  const [pincode, setPincode] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  
  const [saveAddress, setSaveAddress] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  // General state
  const [checking, setChecking] = useState(false);
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);
  const [serviceError, setServiceError] = useState("");
  const [formError, setFormError] = useState("");

  // Sync email from customer if present and new form
  useEffect(() => {
    if (customer?.email && viewMode === "new" && !email) {
      setEmail(customer.email);
    }
    if (customer?.firstName && viewMode === "new" && !fullName) {
      setFullName(`${customer.firstName} ${customer.lastName || ""}`.trim());
    }
  }, [customer, viewMode, email, fullName]);

  // Check serviceability when pincode is 6 digits (in new mode) or when selecting a saved address
  const checkServiceability = useCallback(
    async (pin: string): Promise<DeliveryEstimate | null> => {
      setChecking(true);
      setServiceError("");
      setDeliveryEstimate(null);

      try {
        const res = await fetch("/api/checkout/serviceability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pincode: pin,
            paymentMethod: "cod" as PaymentMethod,
            items: cartItems,
          }),
        });

        const data = await res.json();

        if (data.success && data.data) {
          setDeliveryEstimate(data.data);
          // If we are in 'new' mode, we also auto-fill city/state
          if (viewMode === "new") {
            setCity(data.data.city);
            setState(data.data.state);
            setCountry(data.data.country);
          }
          return data.data;
        } else {
          setServiceError(data.error || "Delivery not available to this pincode");
          return null;
        }
      } catch {
        setServiceError("Failed to check delivery. Please try again.");
        return null;
      } finally {
        setChecking(false);
      }
    },
    [cartItems, viewMode]
  );

  // Fetch saved addresses
  useEffect(() => {
    if (isLoading) return;
    if (!customer) {
      setFetchingAddresses(false);
      setViewMode("new");
      return;
    }

    const fetchAddresses = async () => {
      try {
        const res = await fetch("/api/addresses");
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            setSavedAddresses(json.data);
            setViewMode("list");
            
            // Auto-select default if exists
            const defaultAddr = json.data.find((a: StrapiAddress) => a.isDefault);
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id);
              setDeliveryEstimate({
                serviceable: true,
                city: defaultAddr.city,
                state: defaultAddr.state,
                country: defaultAddr.country || "IN",
                shippingCost: cartTotal < 499 ? 80 : 0,
                estimatedDays: "5-7 business days",
              });
            }
          } else {
            setViewMode("new");
          }
        } else {
          setViewMode("new");
        }
      } catch (err) {
        setViewMode("new");
      } finally {
        setFetchingAddresses(false);
      }
    };
    fetchAddresses();
  }, [customer, isLoading, cartTotal]);

  // Auto-check pincode in manual form
  useEffect(() => {
    if (viewMode === "new") {
      if (pincode.length === 6) {
        checkServiceability(pincode);
      } else {
        setDeliveryEstimate(null);
        setServiceError("");
        setCity("");
        setState("");
        setCountry("");
      }
    }
  }, [pincode, viewMode, checkServiceability]);

  // When a saved address is selected
  const handleSelectAddress = (addrId: number) => {
    if (addrId === selectedAddressId && deliveryEstimate) return; // Prevent re-checking if already selected

    setSelectedAddressId(addrId);
    setFormError("");
    const addr = savedAddresses.find((a) => a.id === addrId);
    if (addr) {
      setDeliveryEstimate({
        serviceable: true,
        city: addr.city,
        state: addr.state,
        country: addr.country || "IN",
        shippingCost: cartTotal < 499 ? 80 : 0,
        estimatedDays: "5-7 business days",
      });
    }
  };

  const handleContinue = async () => {
    if (viewMode === "list") {
      const selected = savedAddresses.find((a) => a.id === selectedAddressId);
      if (!selected) {
        setFormError("Please select a delivery address.");
        return;
      }
      if (!deliveryEstimate) {
        setFormError("Selected address is not serviceable.");
        return;
      }

      onComplete({
        pincode: selected.pincode,
        fullName: selected.name,
        mobile: selected.mobile,
        email: customer?.email || "",
        addressLine1: selected.addressLine1,
        addressLine2: selected.addressLine2 || "",
        city: selected.city,
        state: selected.state,
        country: selected.country,
        deliveryEstimate,
      });
      return;
    }

    // Manual form validation
    if (!fullName.trim()) {
      setFormError("Please enter your full name");
      return;
    }
    if (!mobile.trim()) {
      setFormError("Please enter your mobile number");
      return;
    }
    if (!addressLine1.trim()) {
      setFormError("Please enter your address");
      return;
    }
    if (!deliveryEstimate) {
      setFormError("Please enter a valid serviceable pincode");
      return;
    }

    setFormError("");

    // If "Save this address" is checked, hit the API
    if (saveAddress && customer) {
      try {
        await fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName.trim(),
            mobile: mobile.trim(),
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim(),
            city,
            state,
            pincode,
            country: country || "IN",
            isDefault: isDefault,
          }),
        });
      } catch (err) {
        console.error("Failed to save address", err);
        // We can swallow this error and still proceed with checkout so we don't block the user
      }
    }

    onComplete({
      pincode,
      fullName: fullName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city,
      state,
      country,
      deliveryEstimate,
    });
  };

  if (fetchingAddresses) {
    return (
      <div className="py-12 flex justify-center">
        <span className="text-olive flex items-center gap-2">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Loading addresses...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Location icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-olive/10 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-bold text-text-dark text-center mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
        Delivery Address
      </h2>
      <p className="text-text-muted text-sm text-center mb-8">
        {viewMode === "list" ? "Select a delivery address" : "Enter your pincode to check delivery availability"}
      </p>

      <div className="space-y-4">
        
        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-3 animate-fade-slide-up">
            {savedAddresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedAddressId === addr.id
                    ? "border-olive bg-olive/5 ring-1 ring-olive/20"
                    : "border-olive/20 bg-white/60 hover:border-olive/40"
                }`}
                onClick={() => handleSelectAddress(addr.id)}
              >
                <div className="mt-0.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedAddressId === addr.id ? 'border-olive bg-olive' : 'border-gray-400'}`}>
                    {selectedAddressId === addr.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-dark text-sm">{addr.name}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-parchment text-olive border border-olive/10">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {addr.addressLine1}
                    {addr.addressLine2 && `, ${addr.addressLine2}`}
                    <br />
                    {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                  <p className="text-xs text-text-dark font-medium mt-1">Mobile: {addr.mobile}</p>
                </div>
              </label>
            ))}

            <button
              type="button"
              onClick={() => {
                setViewMode("new");
                setDeliveryEstimate(null);
                setServiceError("");
                setChecking(false);
              }}
              className="w-full p-4 rounded-xl border border-dashed border-olive/30 text-olive text-sm font-semibold hover:bg-olive/5 transition-colors"
            >
              + Add New Address
            </button>
            
            {checking && viewMode === "list" && (
              <div className="flex justify-center py-2 text-olive text-xs">Checking delivery...</div>
            )}
            {serviceError && viewMode === "list" && (
              <p className="text-red-500 text-xs text-center">{serviceError}</p>
            )}
          </div>
        )}

        {/* New Address View */}
        {viewMode === "new" && (
          <div className="space-y-4 animate-fade-slide-up">
            {savedAddresses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  setFormError("");
                  if (selectedAddressId) handleSelectAddress(selectedAddressId);
                }}
                className="text-xs font-semibold text-olive uppercase tracking-wider mb-2 flex items-center gap-1 hover:underline"
              >
                ← Back to saved addresses
              </button>
            )}
            
            <div className="space-y-4 animate-fade-slide-up">
              <div>
                  <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setFormError(""); }}
                    placeholder="Consignee full name"
                    className="w-full px-4 py-3 rounded-xl border border-olive/20 bg-white/60 text-sm text-text-dark outline-none focus:border-olive/40 focus:ring-2 focus:ring-olive/10 transition-all placeholder:text-text-muted/60"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">
                      Mobile Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setFormError(""); }}
                      placeholder="10-digit mobile"
                      className="w-full px-4 py-3 rounded-xl border border-olive/20 bg-white/60 text-sm text-text-dark outline-none focus:border-olive/40 focus:ring-2 focus:ring-olive/10 transition-all placeholder:text-text-muted/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">
                      Email <span className="text-text-muted font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-olive/20 bg-white/60 text-sm text-text-dark outline-none focus:border-olive/40 focus:ring-2 focus:ring-olive/10 transition-all placeholder:text-text-muted/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">
                    Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => { setAddressLine1(e.target.value); setFormError(""); }}
                    placeholder="House/Flat No., Street, Area"
                    className="w-full px-4 py-3 rounded-xl border border-olive/20 bg-white/60 text-sm text-text-dark outline-none focus:border-olive/40 focus:ring-2 focus:ring-olive/10 transition-all placeholder:text-text-muted/60"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Landmark, Building (optional)"
                    className="w-full px-4 py-3 rounded-xl border border-olive/20 bg-white/60 text-sm text-text-dark outline-none focus:border-olive/40 focus:ring-2 focus:ring-olive/10 transition-all placeholder:text-text-muted/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">
                    Pin Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit pincode"
                    className="w-full px-4 py-3 rounded-xl border border-olive/20 bg-white/60 text-sm text-text-dark outline-none focus:border-olive/40 focus:ring-2 focus:ring-olive/10 transition-all placeholder:text-text-muted/60"
                  />
                  {checking && (
                    <div className="flex items-center gap-2 mt-2 text-olive text-xs">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                      Checking delivery availability...
                    </div>
                  )}
                  {serviceError && <p className="text-red-500 text-xs mt-2">{serviceError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">City</label>
                    <input type="text" value={city} readOnly className="w-full px-4 py-3 rounded-xl border border-olive/10 bg-parchment/40 text-sm text-text-dark cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">State</label>
                    <input type="text" value={state} readOnly className="w-full px-4 py-3 rounded-xl border border-olive/10 bg-parchment/40 text-sm text-text-dark cursor-not-allowed" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-dark uppercase tracking-wider mb-1.5">Country</label>
                  <input type="text" value={country} readOnly className="w-full px-4 py-3 rounded-xl border border-olive/10 bg-parchment/40 text-sm text-text-dark cursor-not-allowed" />
                </div>

                {customer && (
                  <div className="pt-2 pb-2">
                    <label className="flex items-center gap-2 cursor-pointer animate-fade-slide-up">
                      <input 
                        type="checkbox" 
                        checked={isDefault} 
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="w-4 h-4 text-olive focus:ring-olive/50 rounded border-olive/30 accent-olive"
                      />
                      <span className="text-sm font-medium text-text-dark">Save as default address</span>
                    </label>
                  </div>
                )}
              </div>
          </div>
        )}

        {formError && <p className="text-red-500 text-xs text-center">{formError}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!deliveryEstimate || checking}
          className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-md mt-4
            ${(!deliveryEstimate || checking)
              ? "bg-olive/40 text-white/70 cursor-not-allowed" 
              : "bg-olive text-white hover:bg-olive-light active:scale-[0.98] cursor-pointer"
            }`}
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
}
