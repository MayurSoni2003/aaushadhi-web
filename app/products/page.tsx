import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGrid from "@/components/ProductGrid";
import { getProducts, getCategories } from "@/lib/strapi";

export const metadata: Metadata = {
  title: "Our Products — Aaushadhi Wellness",
  description:
    "Browse our complete collection of certified organic Ayurvedic herbal powders. 100% natural, lab-tested remedies for holistic wellness.",
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const initialSearch = typeof resolvedParams.q === "string" ? resolvedParams.q : "";

  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <>
      {/* Page wrapper with cream bg */}
      <div className="min-h-screen bg-cream">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-20">
          {/* Page header */}
          <div className="text-center mb-12">
            <p className="text-olive-light text-sm font-semibold tracking-widest uppercase mb-2">
              Explore Our Collection
            </p>
            <h1
              className="text-3xl md:text-5xl font-bold text-olive leading-tight"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Our Products
            </h1>
            <p className="mt-3 text-text-muted text-sm md:text-base max-w-lg mx-auto leading-relaxed">
              Handcrafted Ayurvedic herbal powders, sourced from nature and
              prepared with traditional wisdom.
            </p>
            <div className="mt-4 mx-auto w-16 h-0.5 rounded-full bg-olive opacity-30" />
          </div>

          {/* Product grid with Load More */}
          <ProductGrid
            products={products}
            categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
            initialSearch={initialSearch}
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
