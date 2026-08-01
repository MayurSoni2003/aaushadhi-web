// ─── Shipping Address (matches Strapi order.shipping-address component) ──
export type ShippingAddress = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

// ─── Order Item (matches Strapi order.order-item component) ──
export type OrderItemData = {
  product: number; // Strapi product ID (relation)
  productName: string;
  slug: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

// ─── Delivery Estimate (returned by serviceability API) ──
export type DeliveryEstimate = {
  serviceable: boolean;
  city: string;
  state: string;
  country: string;
  shippingCost: number;
  estimatedDays: string; // e.g., "3-5 business days"
};

// ─── Payment Method ──
export type PaymentMethod = "cod" | "online";

// ─── Order Status (matches Strapi enum) ──
export type OrderStatus =
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

// ─── Payment Status (matches Strapi enum) ──
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

// ─── Checkout Step ──
export type CheckoutStep = 1 | 2;

// ─── Checkout State (client-side form state) ──
export type CheckoutState = {
  step: CheckoutStep;
  // Step 1: Address & delivery
  pincode: string;
  deliveryEstimate: DeliveryEstimate | null;
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  // Step 2: Payment
  paymentMethod: PaymentMethod;
};

// ─── API Request/Response Types ──

export type ServiceabilityRequest = {
  pincode: string;
  paymentMethod: PaymentMethod;
};

export type ServiceabilityResponse = {
  success: boolean;
  data?: DeliveryEstimate;
  error?: string;
};

export type PlaceOrderRequest = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddress;
  items: OrderItemData[];
  paymentMethod: PaymentMethod;
  shippingCost: number;
  notes?: string;
};

export type PlaceOrderResponse = {
  success: boolean;
  data?: {
    orderId: string;
    orderStatus: OrderStatus;
    paymentMethod: PaymentMethod;
    totalAmount: number;
  };
  error?: string;
};

// ─── Order (full order from Strapi, for confirmation page) ──
export type StrapiOrder = {
  id: number;
  documentId: string;
  orderId: string;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  orderItem: OrderItemData[];
  icarryShipmentId: string | null;
  trackingId: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  courierName: string | null;
  paymentGatewayOrderId: string | null;
  paymentGatewayPaymentId: string | null;
  paymentGatewaySignature: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Razorpay: Create Order ──────────────────────────────────

/**
 * Client sends checkout context so the server can create a Razorpay order
 * with a server-verified amount (prices re-fetched from Strapi).
 */
export type CreateRazorpayOrderRequest = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: ShippingAddress;
  /** Only product ID + quantity — prices are re-fetched from Strapi server-side */
  items: Array<{ product: number; quantity: number }>;
};

export type CreateRazorpayOrderResponse = {
  success: boolean;
  data?: {
    razorpayOrderId: string; // e.g. order_XXXXXXXX
    amount: number;          // in paise (INR)
    currency: string;        // "INR"
    keyId: string;           // safe to expose to the client
  };
  error?: string;
};

// ─── Razorpay: Verify Payment ────────────────────────────────

/**
 * After the Razorpay modal closes successfully, the client sends the full
 * checkout payload PLUS Razorpay payment details. The server re-verifies
 * the signature, recalculates pricing from Strapi, then creates the Strapi Order.
 */
export type VerifyPaymentRequest = PlaceOrderRequest & {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  data?: {
    orderId: string;
    orderStatus: OrderStatus;
    totalAmount: number;
  };
  error?: string;
};
