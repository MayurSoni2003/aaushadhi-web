"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────────
type OrderStatus =
  | "confirmed" | "processing" | "shipped"
  | "in_transit" | "out_for_delivery" | "delivered"
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

// ─── Badge configs ───────────────────────────────────────────────
const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; bg: string; text: string; dot: string; timelineBg: string }> = {
  confirmed:        { label: "Confirmed",         bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400",    timelineBg: "bg-blue-500" },
  processing:       { label: "Processing",        bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400",  timelineBg: "bg-violet-500" },
  shipped:          { label: "Shipped",           bg: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-400",     timelineBg: "bg-sky-500" },
  in_transit:       { label: "In Transit",        bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500",  timelineBg: "bg-indigo-500" },
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
          <Skeleton className="h-5 w-24 rounded-full" />
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

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-olive/10 p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-3 h-3 rounded-full flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
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
        <h3 className="text-base font-bold text-text-dark mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Order not found</h3>
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
        <h3 className="text-base font-bold text-text-dark mb-1" style={{ fontFamily: "var(--font-playfair)" }}>Could not load order</h3>
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
  const latestIdx = timeline.length - 1;

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
              className="text-lg sm:text-xl font-bold text-text-dark"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {order.orderId}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">{orderDate}</p>
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
                <h3 className="text-lg font-bold text-text-dark mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
                  Cancel this order?
                </h3>
                
                {cancelSuccess ? (
                  <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Order successfully cancelled!
                  </div>
                ) : (
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
                        onClick={() => {
                          setIsCancelDialogOpen(false);
                          setCancelError(null);
                        }}
                        disabled={isCancelling}
                        className="flex-1 px-4 py-2.5 rounded-full border border-olive/20 text-text-dark text-sm font-bold hover:bg-olive/5 transition-colors disabled:opacity-50"
                      >
                        Nevermind
                      </button>
                      <button
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
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
                          "Yes, Cancel"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-olive/8">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-olive/10 text-olive">
            {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
          </span>
        </div>

        {/* Notes */}
        {order.notes && (
          <p className="mt-3 text-xs text-text-muted bg-olive/5 rounded-xl px-3 py-2 leading-relaxed">
            <span className="font-semibold">Note: </span>{order.notes}
          </p>
        )}
      </div>

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
            <div className="pt-2.5 border-t border-olive/10 flex justify-between">
              <span className="text-sm font-bold text-text-dark">Total</span>
              <span className="text-base font-bold text-olive">₹{order.totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Status Timeline ── */}
      {timeline.length > 0 && (
        <Section title="Order Timeline">
          
          {/* Tracking Section (Top of Timeline) */}
          {order.icarryShipmentId && (
            <div className="mb-6">
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
                  Track Live Shipment
                </button>
              ) : (
                <div className="bg-olive/5 rounded-2xl p-4 sm:p-6 border border-olive/10 relative">
                  {/* Close button */}
                  <button
                    onClick={() => {
                      setIsTrackingExpanded(false);
                      // Clear data so it fetches fresh next time
                      setTrackingData(null);
                      setTrackingError(null);
                    }}
                    className="absolute top-4 right-4 text-olive/60 hover:text-olive transition-colors p-1"
                    aria-label="Close tracking"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>

                  <h3 className="text-sm font-bold text-olive uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-olive animate-pulse" />
                    Live Updates
                  </h3>

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
                      <p className="text-sm font-medium text-red-600">{trackingError}</p>
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
                    </div>
                  ) : trackingData?.details?.length ? (
                    <div className="relative">
                      {trackingData.details.length > 1 && (
                        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-olive/20" />
                      )}
                      <div className="space-y-0">
                        {trackingData.details.map((ev: any, idx: number) => {
                          const isLatest = idx === trackingData.details.length - 1;
                          const ts = new Date(ev.datetime);
                          const dateStr = ts.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                          const timeStr = ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

                          return (
                            <div key={idx} className="flex gap-3 sm:gap-4 pb-5 last:pb-0">
                              <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: "12px" }}>
                                <div className={`w-3 h-3 rounded-full mt-0.5 ring-2 ring-white flex-shrink-0 ${isLatest ? "bg-olive" : "bg-olive/30"}`} />
                              </div>
                              <div className={`flex-1 min-w-0 pb-1 ${isLatest ? "" : "opacity-70"}`}>
                                <p className={`text-sm font-bold ${isLatest ? "text-olive" : "text-text-dark"}`}>{ev.notes || "Update"}</p>
                                <p className="text-xs text-text-muted mt-1">
                                  {dateStr} at {timeStr}
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
            </div>
          )}

          <div className="relative">
            {/* Vertical connector line */}
            {timeline.length > 1 && (
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-olive/15" />
            )}

            <div className="space-y-0">
              {timeline.map((entry, idx) => {
                const isLatest = idx === latestIdx;
                const cfg = ORDER_STATUS_BADGE[entry.status] ?? { label: entry.status, timelineBg: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };

                const ts = new Date(entry.timestamp);
                const dateStr = ts.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                const timeStr = ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

                return (
                  <div key={entry.id} className="flex gap-3 sm:gap-4 pb-5 last:pb-0">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 relative flex flex-col items-center" style={{ width: "12px" }}>
                      <div
                        className={`w-3 h-3 rounded-full mt-0.5 ring-2 ring-white flex-shrink-0 ${
                          isLatest ? cfg.timelineBg : "bg-olive/20"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 pb-1 ${isLatest ? "" : "opacity-70"}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isLatest ? `${cfg.bg} ${cfg.text}` : "bg-olive/8 text-text-muted"
                          }`}
                        >
                          {cfg.label}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] font-bold text-olive uppercase tracking-wider">Current</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {dateStr} at {timeStr}
                      </p>
                      {entry.remarks && (
                        <p className="text-xs text-text-dark mt-0.5 leading-relaxed">{entry.remarks}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
