"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import ProductCard from "@/components/ProductCard";

type Props = {
  products: Product[];
};

export default function ProductCarousel({ products }: Props) {
  const [active, setActive] = useState(1);

  const prev = () => {
    setActive((p) =>
      p === 0 ? products.length - 1 : p - 1
    );
  };

  const next = () => {
    setActive((p) =>
      p === products.length - 1 ? 0 : p + 1
    );
  };

  const getVisibleProducts = () => {
    const prevIndex =
      active === 0
        ? products.length - 1
        : active - 1;

    const nextIndex =
      active === products.length - 1
        ? 0
        : active + 1;

    return [
      products[prevIndex],
      products[active],
      products[nextIndex],
    ];
  };

  const visible = getVisibleProducts();

  return (
    <section className="py-12">
      <div className="relative max-w-5xl mx-auto px-4 md:px-12">
        {/* Left arrow */}
        <button
          onClick={prev}
          aria-label="Previous products"
          className="
            absolute left-0 top-1/2 -translate-y-1/2 z-20
            w-11 h-11 rounded-full
            bg-white/50 backdrop-blur-md
            border border-white/40
            flex items-center justify-center
            shadow-md cursor-pointer
            hover:bg-white/70 transition-all duration-200
            text-text-dark
          "
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Cards */}

      <div
        className="
        flex
        justify-center
        items-end
        gap-6

        px-16
        overflow-hidden
        "
      >
        {visible.map((product, index) => {

          const center = index === 1;

          return (
            <div
              key={`${product.id}-${index}`}
              className={`
              transition-all
              duration-500

              ${
                center
                  ? "scale-100 w-[320px]"
                  : "scale-90 opacity-75 w-[270px]"
              }
              `}
            >
              <ProductCard
                product={product}
                featured={center}
              />
            </div>
          );
        })}
      </div>

        {/* Right arrow */}
        <button
          onClick={next}
          aria-label="Next products"
          className="
            absolute right-0 top-1/2 -translate-y-1/2 z-20
            w-11 h-11 rounded-full
            bg-white/50 backdrop-blur-md
            border border-white/40
            flex items-center justify-center
            shadow-md cursor-pointer
            hover:bg-white/70 transition-all duration-200
            text-text-dark
          "
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Dots */}

      <div
        className="
        flex
        justify-center
        mt-8
        gap-2
        "
      >
        {products.map((_, i) => (

          <button
            key={i}
            onClick={() => setActive(i)}
            className={`
            transition-all

            ${
              i === active
                ? "w-6 bg-olive"
                : "w-2 bg-olive/30"
            }

            h-2
            rounded-full
            `}
          />

        ))}
      </div>

    </section>
  );
}