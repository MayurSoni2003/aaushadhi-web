"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";

const WHATSAPP_NUMBER = "918269431640";

export default function CartPage() {
  const { cartItems, cartTotal, updateQuantity, removeFromCart, clearCart } =
    useCart();

  const generateWhatsAppMessage = () => {
    if (cartItems.length === 0) return "";

    const lines = cartItems.map((item, i) => {
      const totalGrams = item.quantity * 100;
      const lineTotal = item.product.price * item.quantity;
      return `${i + 1}. ${item.product.name} × ${item.quantity} (${totalGrams}g) — ₹${lineTotal}`;
    });

    const message = [
      "*Aaushadhi Wellness — New Order*",
      "",
      ...lines,
      "",
      `*Total: ₹${cartTotal.toLocaleString("en-IN")}*`,
      "",
      "Please confirm availability and delivery details.",
    ].join("\n");

    return message;
  };

  const handleCheckout = () => {
    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 pt-8 pb-20">
        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-3xl md:text-4xl font-bold text-olive"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Your Cart
          </h1>
          <p className="mt-1 text-text-muted text-sm">
            {cartItems.length === 0
              ? "Your cart is empty"
              : `${cartItems.length} item${cartItems.length > 1 ? "s" : ""} in your cart`}
          </p>
        </div>

        {cartItems.length === 0 ? (
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
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-text-dark font-bold text-[15px] leading-snug truncate"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {item.product.name}
                      </h3>
                      <p className="text-text-muted text-[12px] mt-0.5">
                        ₹{item.product.price} per 100g
                      </p>

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

              {/* Clear cart */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-text-muted text-sm hover:text-red-500 transition-colors cursor-pointer"
                >
                  Clear entire cart
                </button>
              </div>
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
                  className="text-lg font-bold text-text-dark mb-4"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  Order Summary
                </h2>

                <div className="space-y-2 mb-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-text-muted truncate pr-2">
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="text-text-dark font-medium flex-shrink-0">
                        ₹{item.product.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-olive/10 pt-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-text-dark font-bold">Total</span>
                    <span className="text-olive font-bold text-xl">
                      ₹{cartTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* WhatsApp checkout button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="
                    w-full py-3.5 rounded-full flex items-center justify-center gap-2.5
                    bg-[#25D366] text-white text-sm font-bold uppercase tracking-wider
                    hover:bg-[#20BD5A] active:scale-[0.97]
                    transition-all duration-200
                    cursor-pointer shadow-md
                  "
                >
                  {/* WhatsApp icon */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Checkout via WhatsApp
                </button>

                <p className="mt-3 text-text-muted text-[11px] text-center leading-relaxed">
                  You&apos;ll be redirected to WhatsApp to confirm your order
                  with our team.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
