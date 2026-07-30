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

        <main className="overflow-hidden">

  {/* Hero */}

  <section className="relative bg-[#F2E2C8] py-20">

    <div className="absolute inset-0 pointer-events-none">

  <div className="
    absolute
    left-8
    top-8
    text-6xl
    opacity-30
  ">
    🌿
  </div>


  <div className="
    absolute
    right-10
    top-12
    text-5xl
    opacity-25
  ">
    🍃
  </div>


  <div className="
    absolute
    left-1/2
    bottom-20
    -translate-x-1/2
    text-7xl
    opacity-20
  ">
    🌱
  </div>


  <div className="
    absolute
    left-12
    bottom-10
    text-4xl
    opacity-25
  ">
    ☘️
  </div>


  <div className="
    absolute
    right-12
    bottom-12
    text-4xl
    opacity-25
  ">
    🌾
  </div>

</div>

    <div className="relative mx-auto max-w-7xl px-6 text-center">

      <h1
        className="text-6xl font-bold text-[#556B2F]"
        style={{
          fontFamily: "var(--font-playfair)",
        }}
      >
        Our Products
      </h1>

      <p className="mt-6 text-xl text-[#3A3A3A]">
        Handcrafted Ayurvedic herbal powders,
        sourced from nature and prepared with traditional wisdom.
      </p>

      

    </div>

  </section>

  <ProductGrid
      products={products}
      categories={categories.map((c)=>({
        name:c.name,
        slug:c.slug,
      }))}
      initialSearch={initialSearch}
  />

</main>

        <Footer />
      </div>
    </>
  );
}
