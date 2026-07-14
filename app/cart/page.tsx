"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const { cartItems, cartCount, cartTotal, updateQuantity, removeFromCart, clearCart } =
    useCart();
  const orderTotal = cartItems.reduce(
    (sum, item) => sum + (item.product.comparePrice || item.product.price) * item.quantity,
    0
  );
  const itemsDiscount = orderTotal - cartTotal;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 pt-8 pb-20">
        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-3xl md:text-4xl font-bold text-olive"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Your Shopping Cart
          </h1>
        </div>

        {cartCount === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 rounded-full bg-parchment flex items-center justify-center mb-6">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A8C3A"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="text-text-muted text-lg mb-2">
              Your cart is empty
            </p>
            <p className="text-text-muted text-sm mb-6">
              Browse our products and add items to get started.
            </p>
            <Link
              href="/products"
              className="
                inline-block px-8 py-3 rounded-full
                bg-olive text-white text-sm font-semibold uppercase tracking-wider
                hover:bg-olive-light transition-all duration-200
              "
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart items list */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-dark">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  <path d="M12 11h4"></path>
                  <path d="M12 16h4"></path>
                  <path d="M8 11h.01"></path>
                  <path d="M8 16h.01"></path>
                </svg>
                <h2 className="text-[16px] font-bold text-text-dark">
                  Cart items ({cartCount})
                </h2>
              </div>
              {cartItems.map((item) => {
                const lineTotal = item.product.price * item.quantity;
                const totalGrams = item.quantity * 100;

                return (
                  <div
                    key={item.product.id}
                    className="flex gap-4 p-4 rounded-2xl bg-white/80"
                    style={{
                      border: "1px solid rgba(92,107,46,0.08)",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Product image */}
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-parchment/40">
                      <Image
                        src={item.product.mainImageUrl}
                        alt={item.product.productName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-text-dark font-bold text-[15px] leading-snug truncate"
                        style={{ fontFamily: "var(--font-outfit)" }}
                      >
                        {item.product.productName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-text-dark font-bold text-[13px]">
                          ₹{item.product.price}
                        </p>
                        {item.product.comparePrice > item.product.price && (
                          <p className="text-text-muted text-[12px] line-through">
                            ₹{item.product.comparePrice}
                          </p>
                        )}
                        <p className="text-text-muted text-[12px]">
                          per 100g
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center rounded-full border border-olive/20 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="px-3 py-1 text-olive font-bold text-sm hover:bg-olive/10 transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="px-2 text-text-dark font-semibold text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="px-3 py-1 text-olive font-bold text-sm hover:bg-olive/10 transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-text-muted text-[11px]">
                          {totalGrams}g
                        </span>
                      </div>
                    </div>

                    {/* Line total + remove */}
                    <div className="flex flex-col items-end justify-between">
                      <span className="text-olive font-bold text-base">
                        ₹{lineTotal}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-text-muted text-[11px] hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}


            </div>

            {/* Order summary */}
            <div className="lg:w-80 flex-shrink-0">
              <div
                className="rounded-2xl p-6 bg-white/80 sticky top-8"
                style={{
                  border: "1px solid rgba(92,107,46,0.08)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <h2
                  className="text-[17px] font-bold text-text-dark mb-5 flex items-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-dark">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <path d="M12 11h4"></path>
                    <path d="M12 16h4"></path>
                    <path d="M8 11h.01"></path>
                    <path d="M8 16h.01"></path>
                  </svg>
                  Price Summary
                </h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-text-muted">Order Total</span>
                    <span className="text-text-dark font-medium">
                      ₹{cartTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[14px]">
                    <div className="flex flex-col">
                      <span className="text-text-muted">Shipping</span>
                      {cartTotal <= 499 && (
                        <span className="text-[10px] text-olive/80 mt-0.5">Free shipping above ₹499</span>
                      )}
                    </div>
                    <span className="text-text-dark font-medium flex items-center gap-2">
                      {cartTotal > 499 ? (
                        <>
                          <span className="text-olive font-bold uppercase">Free</span>
                          <span className="line-through text-text-muted/60">₹80.00</span>
                        </>
                      ) : (
                        <span>₹80.00</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t border-olive/10 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-text-dark font-bold text-[15px]">To pay</span>
                    <span className="text-text-dark font-bold text-lg">
                      ₹{(cartTotal + (cartTotal > 499 ? 0 : 80)).toFixed(2)}
                    </span>
                  </div>
                </div>         

                {/* Checkout button */}
                <button
                  type="button"
                  onClick={() => requireAuth(() => router.push("/checkout"))}
                  className="
                    w-full py-3.5 rounded-full flex items-center justify-center gap-2.5
                    bg-olive text-white text-sm font-bold uppercase tracking-wider
                    hover:bg-olive-light active:scale-[0.97]
                    transition-all duration-200
                    shadow-md text-center cursor-pointer
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
