import Image from "next/image";
import type { CatalogProduct } from "@/data/catalog";

type Props = {
  product: CatalogProduct;
};

export default function CatalogCard({ product }: Props) {
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <article
      className="
        group relative rounded-2xl overflow-hidden flex flex-col
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-xl
        bg-white/80
      "
      style={{
        border: "1px solid rgba(92,107,46,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      {/* Product image */}
      <div className="relative aspect-square overflow-hidden bg-parchment/40">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          quality={80}
        />

        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider bg-olive/90">
            {discount}% OFF
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-4 flex flex-col gap-1.5 flex-1">
        {/* Category */}
        <p className="text-[10px] uppercase tracking-[0.18em] text-olive/70 font-medium">
          {product.category}
        </p>

        {/* Name */}
        <h3
          className="text-text-dark font-bold text-[15px] leading-snug"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {product.name}
        </h3>

        {/* Benefits (show first 2) */}
        <ul className="mt-1 space-y-0.5">
          {product.benefits.slice(0, 2).map((benefit) => (
            <li
              key={benefit}
              className="text-text-muted text-[12px] leading-relaxed flex items-start gap-1.5"
            >
              <span className="text-olive/60 mt-0.5 text-[10px]">●</span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* Price row */}
        <div className="mt-auto pt-3 flex items-baseline gap-2">
          <span className="text-olive font-bold text-lg">
            ₹{product.price}
          </span>
          <span className="text-text-muted text-sm line-through">
            ₹{product.originalPrice}
          </span>
        </div>

        {/* View Details button */}
        <button
          type="button"
          className="
            mt-2 w-full py-2 rounded-full text-[12px] font-semibold uppercase tracking-wider
            border border-olive/30 text-olive
            hover:bg-olive hover:text-white
            transition-all duration-200
            cursor-pointer
          "
        >
          View Details
        </button>
      </div>
    </article>
  );
}
