"use client";

import { useState, useEffect, useCallback } from "react";
import type { StrapiAddress } from "@/lib/auth-types";
import AddressCard from "./AddressCard";
import AddressFormModal from "./AddressFormModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

export default function AddressManager() {
  const [addresses, setAddresses] = useState<StrapiAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<StrapiAddress | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<StrapiAddress | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (data.success) {
        setAddresses(data.data || []);
      } else {
        setError("Failed to load addresses");
      }
    } catch {
      setError("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function handleAddNew() {
    setEditingAddress(null);
    setShowFormModal(true);
  }

  function handleEdit(address: StrapiAddress) {
    setEditingAddress(address);
    setShowFormModal(true);
  }

  function handleDeletePrompt(address: StrapiAddress) {
    setDeletingAddress(address);
  }

  async function handleDeleteConfirm() {
    if (!deletingAddress) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/addresses/${deletingAddress.documentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Address deleted successfully");
        setDeletingAddress(null);
        await fetchAddresses();
      } else {
        setError(data.error || "Failed to delete address");
      }
    } catch {
      setError("Failed to delete address");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleSetDefault(address: StrapiAddress) {
    setSettingDefaultId(address.documentId);
    try {
      const res = await fetch(`/api/addresses/${address.documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Default address updated");
        await fetchAddresses();
      } else {
        setError(data.error || "Failed to update default address");
      }
    } catch {
      setError("Failed to update default address");
    } finally {
      setSettingDefaultId(null);
    }
  }

  function handleFormSaved() {
    showSuccess(editingAddress ? "Address updated successfully" : "Address added successfully");
    fetchAddresses();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-olive/10 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-olive/10 rounded-full" />
              <div className="space-y-1.5">
                <div className="h-4 bg-olive/10 rounded w-28" />
                <div className="h-3 bg-olive/5 rounded w-20" />
              </div>
            </div>
            <div className="h-3 bg-olive/5 rounded w-3/4 mb-1.5" />
            <div className="h-3 bg-olive/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2
          className="text-lg font-bold text-olive"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Saved Addresses
        </h2>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-olive text-white text-xs font-bold uppercase tracking-wider hover:bg-olive-light transition-all shadow-sm cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Address
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2 animate-fade-slide-up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline text-xs cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Address list */}
      {addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-olive/10 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-olive/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h3
            className="text-base font-bold text-text-dark mb-1"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            No saved addresses
          </h3>
          <p className="text-sm text-text-muted mb-4">
            Add a delivery address to get started with faster checkout.
          </p>
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive-light transition-all shadow-sm cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.documentId}
              address={addr}
              onEdit={handleEdit}
              onDelete={handleDeletePrompt}
              onSetDefault={handleSetDefault}
              settingDefault={settingDefaultId === addr.documentId}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddressFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingAddress(null); }}
        onSaved={handleFormSaved}
        editAddress={editingAddress}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingAddress}
        onClose={() => setDeletingAddress(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        addressName={deletingAddress?.name || ""}
      />
    </div>
  );
}
