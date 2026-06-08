"use client";

import { useState } from "react";
import type { StrapiProduct } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

type Props = {
  products: StrapiProduct[];
};

export default function ProductCarousel({ products }: Props) {
  const [active, setActive] = useState(1);
  const [animating, setAnimating] = useState(false);

  const navigate = (next: number) => {
    if (animating) return;
    setAnimating(true);
    setActive(next);
    setTimeout(() => setAnimating(false), 500);
  };

  const prev = () =>
    navigate(active === 0 ? products.length - 1 : active - 1);

  const next = () =>
    navigate(active === products.length - 1 ? 0 : active + 1);

  // Swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    
    if (distance > minSwipeDistance) next();
    if (distance < -minSwipeDistance) prev();
  };

  return (
    <section className="py-12">
      <div className="relative max-w-5xl mx-auto px-4 md:px-12">
        <div className="relative h-[520px] flex items-center"> 
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

        {/* Cards viewport */}
        <div 
          className="overflow-hidden px-16 w-full touch-pan-y" 
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex items-end gap-6 transition-transform duration-500 ease-in-out"
            style={{
              // Shift the full strip so `active` card is centred.
              // Each card slot is ~296px (270px + 24px gap); centre slot offset is 1 slot.
              transform: `translateX(calc(50% - ${active * 294 + 160}px))`,
            }}
          >
            {products.map((product, index) => {
              const center = index === active;
              const adjacent =
                index === (active - 1 + products.length) % products.length ||
                index === (active + 1) % products.length;

              return (
                <div
                  key={product.id}
                  className={`
                    flex-shrink-0
                    transition-all duration-500
                    ${center
                      ? "scale-100 opacity-100 w-[320px]"
                      : adjacent
                      ? "scale-90 opacity-75 w-[270px]"
                      : "scale-75 opacity-0 w-[270px] pointer-events-none"
                    }
                  `}
                >
                  <ProductCard product={product} featured={center} priority={index <= 2} />
                </div>
              );
            })}
          </div>
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
      </div>

      {/* Dots */}
      <div className="flex justify-center mt-8 gap-2">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => navigate(i)}
            className={`
              transition-all h-2 rounded-full
              ${i === active ? "w-6 bg-olive" : "w-2 bg-olive/30"}
            `}
          />
        ))}
      </div>
    </section>
  );
}