import Image from "next/image";
import type { Product } from "@/data/products";

type Props = {
  product: Product;
  featured?: boolean;
};

export default function ProductCard({
  product,
  featured = false,
}: Props) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] flex flex-col w-full flex-shrink-0 transition-all duration-500 ease-out
        ${
          featured
            ? "scale-100 opacity-100"
            : "scale-[0.92] opacity-70"
        }
      `}
      style={{
        background: "rgba(255,255,255,0.60)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",

        border: "1px solid rgba(255,255,255,0.55)",

        boxShadow:
          "0 10px 30px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.25)",
      }}
    >
      {/* Product image */}

      <div
        className="relative aspect-square overflow-hidden rounded-[22px] m-4 bg-parchment/40"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          quality={80}
          sizes="(max-width:768px)100vw,33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />

      </div>

      {/* Content */}

      <div
        className="px-5 pb-5 pt-2 flex flex-col flex-1"
      >
        {/* Category */}

        <p
          className="text-[11px] uppercase tracking-[0.18em] text-olive/75 font-medium mb-2"
        >
          {product.category}
        </p>

        {/* Name */}

        <h3
          className={`text-text-dark font-bold leading-tight ${
              featured
                ? "text-[22px]"
                : "text-[18px]"
            }`}
          style={{
            fontFamily:"var(--font-playfair)",
          }}
        >
          {product.name}
        </h3>

        {/* Benefit */}

        <p
          className="mt-3 text-text-muted text-sm leading-relaxed"
        >
          {product.benefit}
        </p>

        {/* CTA */}

        <div className="mt-auto pt-5">
          <button
            className="flex items-center gap-2 text-olive text-sm font-semibold transition-all duration-300 hover:gap-3"
          >
            Explore

            <span
              className="text-lg leading-none"
            >
              →
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}