"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────────
type OrderStatus =
  | "confirmed" | "processing" | "shipped"
  | "out_for_delivery" | "delivered"
  | "cancelled" | "returned";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type StatusSource = "system" | "cron" | "webhook" | "admin" | "customer";

interface StatusHistoryEntry {
  id: number;
  status: OrderStatus;
  timestamp: string;
  source: StatusSource;
  remarks?: string;
}

interface OrderItem {
  id: number;
  productName: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  slug?: string;
}

interface ShippingAddress {
  name: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface Order {
  id: number;
  documentId: string;
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "cod" | "online";
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  createdAt: string;
  notes?: string;
  shippingAddress: ShippingAddress;
  orderItem: OrderItem[];
  statusHistory: StatusHistoryEntry[];
  icarryShipmentId?: string;
}

/**
 * Parses tracking date strings that might be in DD/MM/YY HH:mm:ss format (e.g. from iCarry)
 */
function parseTrackingDate(dateString: string): Date {
  if (!dateString) return new Date(NaN);
  
  // 1. Try standard parsing first
  let d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  
  // 2. Fallback for formats like "14/07/26 12:15:26" or "14-07-2026 12:15"
  const parts = dateString.split(/[\s/:-]+/);
  if (parts.length >= 5) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    
    // Convert YY to YYYY
    if (year < 100) year += 2000;
    
    const hour = parseInt(parts[3], 10) || 0;
    const minute = parseInt(parts[4], 10) || 0;
    const second = parseInt(parts[5], 10) || 0;
    
    // iCarry returns timestamps in UTC without the 'Z' suffix.
    // Use Date.UTC to ensure it's interpreted as UTC, not local time.
    d = new Date(Date.UTC(year, month, day, hour, minute, second));
    if (!isNaN(d.getTime())) return d;
  }
  
  return new Date(NaN);
}

// ─── Badge configs ───────────────────────────────────────────────
const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; bg: string; text: string; dot: string; timelineBg: string }> = {
  confirmed:        { label: "Confirmed",         bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400",    timelineBg: "bg-blue-500" },
  processing:       { label: "Processing",        bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400",  timelineBg: "bg-violet-500" },
  shipped:          { label: "Shipped",           bg: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-400",     timelineBg: "bg-sky-500" },
  out_for_delivery: { label: "Out for Delivery",  bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400",  timelineBg: "bg-orange-500" },
  delivered:        { label: "Delivered",         bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500",   timelineBg: "bg-green-500" },
  cancelled:        { label: "Cancelled",         bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400",     timelineBg: "bg-red-400" },
  returned:         { label: "Returned",          bg: "bg-gray-100",  text: "text-gray-600",   dot: "bg-gray-400",    timelineBg: "bg-gray-400" },
};

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  pending:  { label: "Payment Pending", bg: "bg-amber-50", text: "text-amber-700" },
  paid:     { label: "Paid",            bg: "bg-green-50", text: "text-green-700" },
  failed:   { label: "Payment Failed",  bg: "bg-red-50",   text: "text-red-600" },
  refunded: { label: "Refunded",        bg: "bg-gray-100", text: "text-gray-600" },
};

// ─── Horizontal Progress Timeline ────────────────────────────────
const NORMAL_MILESTONES: { key: OrderStatus; label: string }[] = [
  { key: "confirmed",        label: "Confirmed" },
  { key: "processing",       label: "Processing" },
  { key: "shipped",          label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered",        label: "Delivered" },
];

const CANCELLED_MILESTONES: { key: OrderStatus; label: string }[] = [
  { key: "confirmed",  label: "Confirmed" },
  { key: "cancelled",  label: "Cancelled" },
];

const RETURNED_MILESTONES: { key: OrderStatus; label: string }[] = [
  { key: "confirmed",  label: "Confirmed" },
  { key: "shipped",    label: "Shipped" },
  { key: "delivered",  label: "Delivered" },
  { key: "returned",   label: "Returned" },
];

function OrderProgressTimeline({ status, history }: { status: OrderStatus; history: StatusHistoryEntry[] }) {
  const isCancelled = status === "cancelled";
  const isReturned = status === "returned";
  const milestones = isCancelled ? CANCELLED_MILESTONES : isReturned ? RETURNED_MILESTONES : NORMAL_MILESTONES;

  const milestoneDates: Record<string, string> = {};
  if (history) {
    history.forEach((h) => {
      milestoneDates[h.status] = new Date(h.timestamp).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    });
  }

  const activeIdx = milestones.findIndex((m) => m.key === status);
  // progress as percentage across the segments
  const totalSegments = milestones.length - 1;
  const targetPct = totalSegments > 0 ? (activeIdx / totalSegments) * 100 : 100;

  const [animatedPct, setAnimatedPct] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 900; // ms

  useEffect(() => {
    setAnimatedPct(0);
    startRef.current = null;
    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      // ease-in-out cubic
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      setAnimatedPct(eased * targetPct);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [status, targetPct]);

  return (
    <div className="bg-white rounded-2xl border border-olive/10 px-4 py-5 sm:px-6 sm:py-6">
      <h2
        className="text-sm font-bold text-olive uppercase tracking-widest mb-5"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        Order Timeline
      </h2>

      <div className={isCancelled ? "max-w-md mx-auto sm:mx-0" : ""}>
        {/* Dots row — line is relative to this row only */}
        <div className="relative flex items-center">
          {/* Track: sits behind dots, offset by half dot size on each side */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] mx-[6px]">
            {/* Base grey track */}
            <div className="absolute inset-0 bg-olive/12 rounded-full w-full h-full" />

            {/* Animated filled track */}
            {isReturned ? (
              <>
                <div
                  className="absolute inset-y-0 left-0 h-full rounded-l-full transition-none bg-olive"
                  style={{ width: `${Math.min(animatedPct, 66.666)}%` }}
                />
                {animatedPct > 66.666 && (
                  <div
                    className="absolute inset-y-0 h-full rounded-r-full transition-none bg-red-400"
                    style={{ left: "66.666%", width: `${animatedPct - 66.666}%` }}
                  />
                )}
              </>
            ) : (
              <div
                className={`absolute inset-y-0 left-0 h-full rounded-full transition-none ${
                  isCancelled ? "bg-red-400" : "bg-olive"
                }`}
                style={{ width: `${animatedPct}%` }}
              />
            )}
          </div>

        {/* Dots only */}
        {milestones.map((m, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={m.key} className="relative z-10 flex-1 flex justify-center">
              <div
                className={`
                  w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ring-2 ring-white shadow-sm transition-colors
                  ${
                    (isCancelled && isActive) || (isReturned && m.key === "returned")
                      ? "bg-red-500 ring-red-100"
                      : isActive
                      ? "bg-olive ring-olive/20"
                      : isDone
                      ? "bg-olive"
                      : "bg-olive/20"
                  }
                `}
              />
            </div>
          );
        })}
      </div>

      {/* Labels row — completely separate from the track */}
      <div className="flex mt-2.5">
        {milestones.map((m, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          const isFirst = i === 0;
          const isLast = i === milestones.length - 1;
          return (
            <div
              key={m.key}
              className={`flex-1 min-w-0 leading-tight flex flex-col ${
                isFirst ? "items-start" : isLast ? "items-end" : "items-center"
              } justify-start ${
                (isCancelled && isActive) || (isReturned && m.key === "returned")
                  ? "text-red-600 font-semibold"
                  : isActive
                  ? "text-olive font-semibold"
                  : isDone
                  ? "text-olive/70 font-medium"
                  : "text-text-muted"
              } text-[9px] sm:text-[11px]`}
            >
              <span className="text-center">{m.label}</span>
              {milestoneDates[m.key] && (
                <span className="mt-1 opacity-90 text-center">{milestoneDates[m.key]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-olive/10 rounded animate-pulse ${className}`} />;
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-4">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />

      {/* Header */}
      <div className="bg-white rounded-2xl border border-olive/10 p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </div>

      {/* Horizontal timeline skeleton */}
      <div className="bg-white rounded-2xl border border-olive/10 p-5">
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex justify-between mt-3">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-3 w-12" />)}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-olive/10 p-5 space-y-4">
        <Skeleton className="h-4 w-24" />
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-16 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Address */}
      <div className="bg-white rounded-2xl border border-olive/10 p-5 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-olive/10 p-5 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-olive/10 p-4 sm:p-6">
      <h2
        className="text-sm font-bold text-olive uppercase tracking-widest mb-4"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function OrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "error" | null>(null);

  // Tracking state
  const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  async function fetchTracking() {
    if (!order?.documentId) return;
    
    setTrackingLoading(true);
    setTrackingError(null);
    
    try {
      const res = await fetch(`/api/account/orders/${order.documentId}/tracking`);
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch tracking");
      }
      
      setTrackingData(data.tracking);
    } catch (e: any) {
      setTrackingError(e.message || "An unexpected error occurred");
    } finally {
      setTrackingLoading(false);
    }
  }

  // Cancellation state
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelStep, setCancelStep] = useState<1 | 2>(1);
  const [cancelReason, setCancelReason] = useState<string>("");

  const CANCEL_REASONS = [
    "Want to order different product",
    "Wrong delivery address provided",
    "Change Payment mode",
    "Expected delivery time is long",
    "Ordered multiple orders by mistake",
    "Got better deal",
    "Other"
  ];

  // Define fetchOrder outside so it can be called manually
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/account/orders/${orderId}`);
      if (res.status === 404) { setError("not_found"); return; }
      if (!res.ok) { setError("error"); return; }
      const data = await res.json();
      if (!data.success) { setError("error"); return; }
      setOrder(data.data);
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  if (loading) return <OrderDetailSkeleton />;

  if (error === "not_found") {
    return (
      <div className="bg-white rounded-2xl border border-olive/10 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-olive/10 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-text-dark mb-1" style={{ fontFamily: "var(--font-outfit)" }}>Order not found</h3>
        <p className="text-sm text-text-muted mb-5">This order doesn't exist or doesn't belong to your account.</p>
        <Link href="/account/orders" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive-light transition-all">
          Back to My Orders
        </Link>
      </div>
    );
  }

  if (error === "error") {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-text-dark mb-1" style={{ fontFamily: "var(--font-outfit)" }}>Could not load order</h3>
        <p className="text-sm text-text-muted mb-5">Something went wrong. Please try again.</p>
        <button
          onClick={() => { setError(null); setLoading(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive-light transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const handleCancelOrder = async () => {
    if (!order?.documentId) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/account/orders/${order.documentId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel order");
      }

      setCancelSuccess(true);
      await fetchOrder(); // Refresh the order details and timeline
      
      // If tracking was open, it might still have old cached data, refresh it too
      if (isTrackingExpanded) {
        await fetchTracking();
      }
      
      // Close dialog gracefully after success
      setTimeout(() => {
        setIsCancelDialogOpen(false);
        setCancelSuccess(false); // reset for future
        setCancelStep(1);
        setCancelReason("");
      }, 2000);
      
    } catch (err: any) {
      setCancelError(err.message || "An unexpected error occurred");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!order) return null;

  const statusCfg = ORDER_STATUS_BADGE[order.orderStatus] ?? { label: order.orderStatus, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", timelineBg: "bg-gray-400" };
  const paymentCfg = PAYMENT_STATUS_BADGE[order.paymentStatus] ?? { label: order.paymentStatus, bg: "bg-gray-100", text: "text-gray-600" };

  const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Timeline: chronological (already stored in append order); last entry is active
  const timeline = [...(order.statusHistory || [])];

  return (
    <div className="space-y-4">
      {/* ── Back Link ── */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-olive transition-colors group"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        My Orders
      </Link>

      {/* ── Header Card ── */}
      <div className="bg-white rounded-2xl border border-olive/10 p-4 sm:p-6">
        {/* Top row: ID + status */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-text-dark mb-1"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Order Details
            </h1>
            <p className="text-sm font-medium text-text-dark">Order ID: {order.orderId}</p>
            <p className="text-sm text-text-muted mt-0.5">Placed on: {orderDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {(order.orderStatus === "confirmed" || order.orderStatus === "processing") && (
              <button
                onClick={() => setIsCancelDialogOpen(true)}
                className="px-4 py-1.5 rounded-full border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Dialog Overlay */}
        {isCancelDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-text-dark mb-2" style={{ fontFamily: "var(--font-outfit)" }}>
                  Cancel this order?
                </h3>
                
                {cancelSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-text-dark mb-1">Order Cancelled</h3>
                    <p className="text-sm text-text-muted">Your order has been successfully cancelled.</p>
                  </div>
                ) : cancelStep === 1 ? (
                  <>
                    <p className="text-sm text-text-muted mb-6">
                      Are you sure you want to cancel {order.orderId}? This action cannot be undone.
                    </p>
                    
                    {cancelError && (
                      <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
                        {cancelError}
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCancelStep(2)}
                        disabled={isCancelling}
                        className="flex-1 px-4 py-2.5 rounded-full border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => {
                          setIsCancelDialogOpen(false);
                          setCancelError(null);
                          setCancelStep(1);
                          setCancelReason("");
                        }}
                        disabled={isCancelling}
                        className="flex-1 px-4 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive/90 transition-colors disabled:opacity-50"
                      >
                        No
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-text-dark font-medium mb-5 text-center">
                      Your complete order will be cancelled
                    </p>
                    
                    {cancelError && (
                      <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">
                        {cancelError}
                      </div>
                    )}
                    
                    <div className="mb-6 space-y-1.5 text-left">
                      <label htmlFor="cancelReason" className="text-xs font-bold text-olive uppercase tracking-widest block" style={{ fontFamily: "var(--font-inter)" }}>
                        Select Issue Type<span className="text-red-500">*</span>
                      </label>
                      <select
                        id="cancelReason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full bg-white border border-olive/20 rounded-xl px-4 py-3.5 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive transition-shadow appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%235C6B2E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          backgroundSize: "20px"
                        }}
                      >
                        <option value="" disabled>Select...</option>
                        {CANCEL_REASONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setIsCancelDialogOpen(false);
                          setCancelError(null);
                          setCancelStep(1);
                          setCancelReason("");
                        }}
                        disabled={isCancelling}
                        className="flex-1 px-4 py-2.5 rounded-full border border-olive/20 text-text-dark text-sm font-bold hover:bg-olive/5 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCancelOrder}
                        disabled={isCancelling || !cancelReason}
                        className="flex-1 px-4 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isCancelling ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            Cancelling...
                          </>
                        ) : (
                          "Cancel Order"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}



        {/* Notes */}
        {order.notes && (
          <p className="mt-3 text-xs text-text-muted bg-olive/5 rounded-xl px-3 py-2 leading-relaxed">
            <span className="font-semibold">Note: </span>{order.notes}
          </p>
        )}
      </div>

      {/* ── Horizontal Progress Timeline ── */}
      <OrderProgressTimeline status={order.orderStatus} history={order.statusHistory} />

      {/* ── Products ── */}

      <Section title="Items Ordered">
        <div className="divide-y divide-olive/8">
          {order.orderItem.map((item) => (
            <div key={item.id} className="flex items-start gap-3 sm:gap-4 py-3 first:pt-0 last:pb-0">
              {/* Image */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-parchment flex-shrink-0 overflow-hidden relative">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="1.5" strokeLinecap="round" opacity="0.35">
                      <rect x="2" y="7" width="20" height="14" rx="2" />
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark line-clamp-2">{item.productName}</p>
                <p className="text-xs text-text-muted mt-0.5">₹{item.price.toLocaleString("en-IN")} × {item.quantity}</p>
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-text-dark">
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Two-column layout on md+ ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Shipping Address ── */}
        <Section title="Shipping Address">
          <div className="text-sm text-text-dark space-y-0.5">
            <p className="font-semibold">{order.shippingAddress.name}</p>
            <p className="text-text-muted text-xs">{order.shippingAddress.mobile}</p>
            <p className="mt-1">{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p>{order.shippingAddress.addressLine2}</p>
            )}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
            </p>
            <p>{order.shippingAddress.country}</p>
          </div>
        </Section>

        {/* ── Order Summary ── */}
        <Section title="Order Summary">
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Subtotal</span>
              <span className="text-text-dark font-medium">₹{order.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm text-text-muted">
              <span>Shipping</span>
              <span className={order.shippingCost === 0 ? "text-green-600 font-medium" : "text-text-dark font-medium"}>
                {order.shippingCost === 0 ? "Free" : `₹${order.shippingCost.toLocaleString("en-IN")}`}
              </span>
            </div>
            <div className="flex justify-between text-sm text-text-muted">
              <span>Payment Method</span>
              <span className="text-text-dark font-medium">
                {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
              </span>
            </div>
            <div className="pt-2.5 border-t border-olive/10 flex justify-between">
              <span className="text-sm font-bold text-text-dark">Total</span>
              <span className="text-base font-bold text-olive">₹{order.totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Order Timeline (Track Live Shipment only when icarry linked) ── */}
      {order.icarryShipmentId && process.env.NEXT_PUBLIC_HIDE_LIVE_TRACKING !== "true" && (
        <Section title={["cancelled", "delivered", "returned"].includes(order.orderStatus) ? "Tracking History" : "Live Tracking"}>
          {!isTrackingExpanded ? (
            <button
              onClick={() => {
                setIsTrackingExpanded(true);
                fetchTracking();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive-light transition-all shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {["cancelled", "delivered", "returned"].includes(order.orderStatus) ? "View Tracking History" : "Track Live Shipment"}
            </button>
          ) : (
            <div className="bg-olive/5 rounded-2xl p-4 sm:p-6 border border-olive/10 relative">
              <button
                onClick={() => {
                  setIsTrackingExpanded(false);
                  setTrackingData(null);
                  setTrackingError(null);
                }}
                className="absolute top-2 right-2 text-olive/60 hover:text-olive transition-colors p-2 z-10 cursor-pointer"
                aria-label="Close tracking"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {/* Inner heading removed to avoid duplication with Section title */}

              {trackingLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32" />
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-3 h-3 rounded-full flex-shrink-0 mt-1" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : trackingError ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-text-muted italic">
                    {order.orderStatus === "cancelled"
                      ? "Tracking data is not available for this cancelled order."
                      : "Tracking data is not available yet."}
                  </p>
                  {order.orderStatus !== "cancelled" && (
                    <button
                      onClick={fetchTracking}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-olive/20 text-text-dark text-xs font-bold shadow-sm hover:bg-olive/5 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6"/>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      </svg>
                      Retry
                    </button>
                  )}
                </div>
              ) : trackingData?.details?.length ? (
                <div className="relative">
                  {trackingData.details.length > 1 && (
                    <div className="absolute left-[5px] top-2 bottom-2 w-px bg-olive/20" />
                  )}
                  <div className="space-y-0">
                    {trackingData.details.map((ev: any, idx: number) => {
                      const isLatest = idx === 0;
                      const ts = parseTrackingDate(ev.datetime);
                      const isValidDate = !isNaN(ts.getTime());
                      const dateStr = isValidDate ? ts.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ev.datetime;
                      const timeStr = isValidDate ? ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
                      const isCancelledNode = ev.notes?.toLowerCase().includes("cancel");
                      return (
                        <div key={idx} className="flex gap-3 sm:gap-4 pb-5 last:pb-0">
                          <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: "12px" }}>
                            <div className={`w-3 h-3 rounded-full mt-0.5 ring-2 ring-white flex-shrink-0 ${isCancelledNode ? "bg-red-500" : isLatest ? "bg-olive" : "bg-olive/30"}`} />
                          </div>
                          <div className={`flex-1 min-w-0 pb-1 ${isLatest || isCancelledNode ? "" : "opacity-70"}`}>
                            <p className={`text-sm font-bold ${isCancelledNode ? "text-red-600" : isLatest ? "text-olive" : "text-text-dark"}`}>{ev.notes || "Update"}</p>
                            <p className="text-xs text-text-muted mt-1">
                              {isValidDate ? `${dateStr} at ${timeStr}` : dateStr}
                            </p>
                            {ev.location && (
                              <p className="text-[11px] font-medium text-text-dark mt-1 flex items-center gap-1 opacity-80">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                {ev.location}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted italic py-2">Tracking updates are not yet available from the courier.</p>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
