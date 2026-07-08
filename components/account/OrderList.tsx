"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────────
type OrderStatus =
  | "confirmed"
  | "processing"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type PaymentMethod = "cod" | "online";

interface OrderItem {
  id: number;
  imageUrl?: string;
  productName: string;
  quantity: number;
}

interface Order {
  id: number;
  documentId: string;
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  createdAt: string;
  orderItem: OrderItem[];
}

// ─── Status badge config ─────────────────────────────────────────
const STATUS_BADGE: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  confirmed: {
    label: "Confirmed",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
  },
  processing: {
    label: "Processing",
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-400",
  },
  shipped: {
    label: "Shipped",
    bg: "bg-sky-50",
    text: "text-sky-700",
    dot: "bg-sky-400",
  },
  in_transit: {
    label: "In Transit",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-400",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-400",
  },
  returned: {
    label: "Returned",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
};

const PAYMENT_STATUS_BADGE: Record<
  PaymentStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Payment Pending", bg: "bg-amber-50", text: "text-amber-700" },
  paid:    { label: "Paid",            bg: "bg-green-50", text: "text-green-700" },
  failed:  { label: "Payment Failed",  bg: "bg-red-50",   text: "text-red-600" },
  refunded:{ label: "Refunded",        bg: "bg-gray-100", text: "text-gray-600" },
};

// ─── Skeleton ────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-olive/10 p-5 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-olive/10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-olive/10 rounded w-32" />
                <div className="h-6 bg-olive/10 rounded-full w-20" />
              </div>
              <div className="h-3 bg-olive/5 rounded w-24" />
              <div className="flex gap-2">
                <div className="h-5 bg-olive/5 rounded-full w-16" />
                <div className="h-5 bg-olive/5 rounded-full w-20" />
              </div>
            </div>
            <div className="h-5 bg-olive/10 rounded w-16 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const status = STATUS_BADGE[order.orderStatus] ?? {
    label: order.orderStatus,
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  };

  const firstItem = order.orderItem?.[0];
  const itemCount = order.orderItem?.length ?? 0;
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/account/orders/${order.orderId}`}
      className="group block bg-white rounded-2xl border border-olive/10 p-4 sm:p-5 hover:border-olive/30 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* ── Top row: thumbnail | spacer | amount + chevron ── */}
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Product thumbnail */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-parchment flex-shrink-0 overflow-hidden relative">
          {firstItem?.imageUrl ? (
            <Image
              src={firstItem.imageUrl}
              alt={firstItem.productName || "Product"}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5C6B2E"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.4"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
          )}
          {/* Item count badge */}
          {itemCount > 1 && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-olive text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
              {itemCount}
            </div>
          )}
        </div>

        {/* Main info — always full-width on mobile, flex-1 on sm+ */}
        <div className="flex-1 min-w-0">
          {/* Order ID + status badge row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-dark group-hover:text-olive transition-colors truncate">
                {order.orderId}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{dateStr}</p>
            </div>
            {/* Order status badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${status.bg} ${status.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Payment method */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-olive/10 text-olive">
              {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}
            </span>

            {/* Item count text */}
            <span className="text-[11px] text-text-muted">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Amount + chevron */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 self-start">
          <p className="text-sm sm:text-base font-bold text-text-dark whitespace-nowrap">
            ₹{order.totalAmount.toLocaleString("en-IN")}
          </p>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-olive/40 group-hover:text-olive group-hover:translate-x-0.5 transition-all duration-200"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/account/orders");
        const data = await res.json();
        if (data.success) {
          setOrders(data.data || []);
        } else {
          setError(data.error || "Failed to load orders");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (loading) return <OrderSkeleton />;

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dc2626"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3
          className="text-base font-bold text-text-dark mb-1"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Could not load orders
        </h3>
        <p className="text-sm text-text-muted mb-4">{error}</p>
        <button
          onClick={() => {
            setError("");
            setLoading(true);
            fetch("/api/account/orders")
              .then((r) => r.json())
              .then((d) => {
                if (d.success) setOrders(d.data || []);
                else setError(d.error || "Failed to load orders");
              })
              .catch(() => setError("Something went wrong. Please try again."))
              .finally(() => setLoading(false));
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive-light transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-olive/10 p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-olive/10 flex items-center justify-center mx-auto mb-4">
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
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h3
          className="text-base font-bold text-text-dark mb-1"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          No orders yet
        </h3>
        <p className="text-sm text-text-muted mb-5">
          When you place an order, it will appear here.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-olive text-white text-sm font-bold hover:bg-olive-light transition-all"
        >
          Start Shopping
        </Link>
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
          My Orders
        </h2>
        <span className="text-xs text-text-muted font-medium px-3 py-1 bg-olive/5 rounded-full">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {/* Order list */}
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.documentId} order={order} />
        ))}
      </div>
    </div>
  );
}
