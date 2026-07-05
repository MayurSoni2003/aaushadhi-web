"use client";

import type { StrapiAddress } from "@/lib/auth-types";

type Props = {
  address: StrapiAddress;
  onEdit: (address: StrapiAddress) => void;
  onDelete: (address: StrapiAddress) => void;
  onSetDefault: (address: StrapiAddress) => void;
  settingDefault: boolean;
};

export default function AddressCard({ address, onEdit, onDelete, onSetDefault, settingDefault }: Props) {
  return (
    <div className={`bg-white rounded-2xl border p-5 transition-all duration-200 ${
      address.isDefault ? "border-olive/30 shadow-sm" : "border-olive/10 hover:border-olive/20"
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-dark truncate">{address.name}</p>
            <p className="text-xs text-text-muted">{address.mobile}</p>
          </div>
        </div>

        {address.isDefault && (
          <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-olive/10 text-olive text-[10px] font-bold uppercase tracking-wider">
            Default
          </span>
        )}
      </div>

      {/* Address body */}
      <p className="text-sm text-text-dark leading-relaxed mb-1">
        {address.addressLine1}
        {address.addressLine2 && `, ${address.addressLine2}`}
      </p>
      <p className="text-sm text-text-muted">
        {address.city}, {address.state} — {address.pincode}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-olive/8">
        <button
          type="button"
          onClick={() => onEdit(address)}
          className="text-xs font-semibold text-olive hover:text-olive-light transition-colors cursor-pointer"
        >
          Edit
        </button>
        <span className="w-px h-3.5 bg-olive/15" />
        <button
          type="button"
          onClick={() => onDelete(address)}
          className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
        >
          Delete
        </button>
        {!address.isDefault && (
          <>
            <span className="w-px h-3.5 bg-olive/15" />
            <button
              type="button"
              onClick={() => onSetDefault(address)}
              disabled={settingDefault}
              className="text-xs font-semibold text-text-muted hover:text-olive transition-colors disabled:opacity-50 cursor-pointer"
            >
              {settingDefault ? "Setting..." : "Set as Default"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
