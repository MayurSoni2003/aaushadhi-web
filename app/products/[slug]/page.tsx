import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { catalog } from "@/data/catalog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductDetailActions from "@/components/ProductDetailActions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = catalog.find((p) => p.slug === slug);
  
  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: `${product.name} — Aaushadhi Wellness`,
    description: `Discover the benefits of ${product.name}: ${product.benefits.join(", ")}. Authentic Ayurvedic herbal powder.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = catalog.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8 md:py-16">
        {/* Back Link */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-olive/80 hover:text-olive font-medium text-sm mb-8 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to Products
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
          {/* Image Gallery Column */}
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-parchment/40" style={{ border: "1px solid rgba(92,107,46,0.1)", boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              quality={90}
              priority
            />
            {discount > 0 && (
              <span className="absolute top-5 left-5 px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider bg-olive/90 z-10 shadow-md">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-col">
            <p className="text-olive text-xs font-bold tracking-[0.2em] uppercase mb-3">
              {product.category}
            </p>
            
            <h1
              className="text-3xl md:text-5xl font-bold text-text-dark leading-tight mb-4"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {product.name}
            </h1>

            {/* Price block */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-3xl font-bold text-olive">
                ₹{product.price}
              </span>
              <span className="text-xl text-text-muted line-through">
                ₹{product.originalPrice}
              </span>
              <span className="text-text-muted text-sm font-medium ml-1">
                per 100g
              </span>
            </div>

            <div className="w-full h-px bg-olive/10 mb-8" />

            {/* Benefits List */}
            <h3 className="text-lg font-bold text-text-dark mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
              Key Benefits
            </h3>
            <ul className="space-y-3 mb-10">
              {product.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-text-muted text-base leading-relaxed">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            {/* Add to Cart Actions */}
            <ProductDetailActions product={product} />

            {/* Shipping Info / Trust badges */}
            <div className="mt-12 p-5 rounded-2xl bg-white/60 border border-olive/10">
              <div className="flex flex-col gap-3 text-sm text-text-muted">
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>100% Organic & Authentically Sourced</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Secure checkout via WhatsApp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
