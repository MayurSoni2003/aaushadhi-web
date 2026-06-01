"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { CartProduct } from "@/lib/types";

type Props = {
  product: CartProduct;
};

export default function ProductDetailActions({ product }: Props) {
  const { addToCart, updateQuantity, getQuantity } = useCart();
  const qty = getQuantity(product.id);

  return (
    <div className="mt-8">
      {qty === 0 ? (
        <button
          type="button"
          onClick={() => addToCart(product)}
          className="
            w-full md:w-auto px-12 py-4 rounded-full text-sm font-bold uppercase tracking-wider
            bg-olive text-white
            hover:bg-olive-light
            active:scale-[0.98]
            transition-all duration-200
            cursor-pointer
            shadow-md
          "
        >
          Add to Cart
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-48 flex items-center justify-between rounded-full border border-olive/20 overflow-hidden bg-white/50 flex-shrink-0">
            <button
              type="button"
              onClick={() => updateQuantity(product.id, qty - 1)}
              className="px-5 py-3 text-olive font-bold text-xl hover:bg-olive/10 transition-colors cursor-pointer"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <div className="flex flex-col items-center">
              <span className="text-text-dark font-semibold text-base leading-none">
                {qty}
              </span>
              <span className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">
                × 100g
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateQuantity(product.id, qty + 1)}
              className="px-5 py-3 text-olive font-bold text-xl hover:bg-olive/10 transition-colors cursor-pointer"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <Link
            href="/cart"
            className="
              w-full sm:w-auto px-10 py-3.5 rounded-full text-sm font-bold uppercase tracking-wider
              bg-parchment text-olive border border-olive/20
              hover:bg-olive hover:text-white
              active:scale-[0.98]
              transition-all duration-200
              cursor-pointer text-center
            "
          >
            Go to Cart
          </Link>
        </div>
      )}
    </div>
  );
}
