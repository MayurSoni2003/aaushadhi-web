"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/data/catalog";
import CatalogCard from "@/components/CatalogCard";

type Props = {
  products: CatalogProduct[];
};

const BATCH_SIZE = 8;

export default function ProductGrid({ products }: Props) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, products.length));
  };

  return (
    <div>
      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {visibleProducts.map((product) => (
          <CatalogCard key={product.id} product={product} />
        ))}
      </div>

      {/* Count + Load More */}
      <div className="mt-10 flex flex-col items-center gap-4">
        <p className="text-text-muted text-sm">
          Showing{" "}
          <span className="font-semibold text-text-dark">
            {visibleProducts.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-text-dark">
            {products.length}
          </span>{" "}
          products
        </p>

        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            className="
              px-8 py-3 rounded-full
              bg-olive text-white text-sm font-semibold uppercase tracking-wider
              hover:bg-olive-light
              active:scale-95
              transition-all duration-200
              cursor-pointer
              shadow-md
            "
          >
            Load More
          </button>
        )}
      </div>
    </div>
  );
}
