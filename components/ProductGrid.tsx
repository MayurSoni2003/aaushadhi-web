"use client";

import { useState, useMemo } from "react";
import type { CatalogProduct } from "@/data/catalog";
import CatalogCard from "@/components/CatalogCard";

type Props = {
  products: CatalogProduct[];
  initialSearch?: string;
};

const BATCH_SIZE = 8;

export default function ProductGrid({ products, initialSearch = "" }: Props) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter((product) =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.category.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredProducts.length));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(BATCH_SIZE); // reset pagination when search changes
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-8 max-w-md mx-auto relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search for herbal powders..."
          className="
            w-full px-5 py-3 pl-12 rounded-full
            bg-white/70 backdrop-blur-md
            border border-olive/20
            focus:outline-none focus:ring-2 focus:ring-olive/50 focus:border-transparent
            text-text-dark placeholder-text-muted/60
            shadow-sm transition-all
          "
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-olive/50"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Product grid */}
      {filteredProducts.length > 0 ? (
        <>
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
                {filteredProducts.length}
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
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-text-muted text-lg mb-2">No products found</p>
          <p className="text-text-muted text-sm">
            Try adjusting your search query.
          </p>
        </div>
      )}
    </div>
  );
}
