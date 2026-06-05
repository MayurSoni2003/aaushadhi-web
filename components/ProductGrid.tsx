"use client";

import { useState, useMemo } from "react";
import type { StrapiProduct } from "@/lib/types";
import CatalogCard from "@/components/CatalogCard";

type Props = {
  products: StrapiProduct[];
  categories: { name: string; slug: string }[];
  initialSearch?: string;
};

const BATCH_SIZE = 8;

export default function ProductGrid({ products, categories, initialSearch = "" }: Props) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Category filter
    if (activeCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category?.slug === activeCategory
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.productName.toLowerCase().includes(lowerQuery) ||
          (product.category?.name ?? "").toLowerCase().includes(lowerQuery) ||
          product.tagline.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }, [products, searchQuery, activeCategory]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredProducts.length));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(BATCH_SIZE);
  };

  const handleCategoryChange = (slug: string) => {
    setActiveCategory(slug);
    setVisibleCount(BATCH_SIZE);
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6 max-w-md mx-auto relative">
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

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange("all")}
            className={`
              px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider
              transition-all duration-200 cursor-pointer
              ${activeCategory === "all"
                ? "bg-olive text-white shadow-md"
                : "bg-white/60 text-text-muted border border-olive/15 hover:bg-olive/10 hover:text-olive"
              }
            `}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => handleCategoryChange(cat.slug)}
              className={`
                px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider
                transition-all duration-200 cursor-pointer
                ${activeCategory === cat.slug
                  ? "bg-olive text-white shadow-md"
                  : "bg-white/60 text-text-muted border border-olive/15 hover:bg-olive/10 hover:text-olive"
                }
              `}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {filteredProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {visibleProducts.map((product, idx) => (
              <CatalogCard key={product.id} product={product} priority={idx < 4} />
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
            Try adjusting your search query or category filter.
          </p>
        </div>
      )}
    </div>
  );
}
