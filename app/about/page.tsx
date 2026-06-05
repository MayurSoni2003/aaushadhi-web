import type { Metadata } from "next";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About Us — Aaushadhi Wellness | Rooted in Nature",
  description:
    "Learn about Aaushadhi Wellness — we blend ancient Ayurvedic wisdom with modern science to create 100% pure herbal products. From seed to shelf, nature's goodness in its truest form.",
};

/* ── SVG Icon Components ── */

function LeafIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DropletIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

function SproutIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </svg>
  );
}

function HeartHandshakeIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
      <path d="m18 15-2-2" />
      <path d="m15 18-2-2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/* Small inline icons for trust strip */
function TrustIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

/* Reusable section divider */
function SectionDivider({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 max-w-[400px] mx-auto">
      <span className="flex-1 h-[1.5px]" style={{ background: "linear-gradient(90deg, transparent, var(--olive), transparent)", opacity: 0.3 }} />
      {children}
      <span className="flex-1 h-[1.5px]" style={{ background: "linear-gradient(90deg, transparent, var(--olive), transparent)", opacity: 0.3 }} />
    </div>
  );
}

/* Reusable glass card */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl p-7 md:p-10 transition-all duration-350 hover:-translate-y-1 ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.5)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1.5px solid rgba(255, 255, 255, 0.6)",
        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.04), inset 0 1px 3px rgba(255, 255, 255, 0.4)",
      }}
    >
      {children}
    </div>
  );
}

/* Feature icon circle */
function FeatureIconCircle({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-20 h-20 md:w-20 md:h-20 rounded-full border-2 border-olive/20 flex items-center justify-center mx-auto mb-4 bg-white/50 transition-all duration-350 hover:border-olive hover:bg-olive/5 hover:scale-108">
      {children}
    </div>
  );
}

/* Process step icon */
function ProcessStepIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[72px] h-[72px] md:w-[72px] md:h-[72px] min-w-[56px] min-h-[56px] rounded-full border-2 border-olive flex items-center justify-center mb-3.5 md:mb-3.5 bg-white/60 transition-all duration-350 hover:bg-olive/8 hover:scale-110">
      {children}
    </div>
  );
}

/* ── Page Component ── */

export default function AboutPage() {
  const playfair = { fontFamily: "var(--font-playfair)" };

  return (
    <>
      <div
        className="relative min-h-screen overflow-clip"
        style={{
          background:
            "linear-gradient(170deg, #EDE3CA 0%, #F5EAD6 15%, #F2D4C0 35%, #ECC8B8 48%, #E0C8C4 55%, #D4CEDB 65%, #C8D6E2 78%, #D0DBE6 90%, #D6DDE8 100%)",
        }}
      >
        {/* Decorative leaf — top right */}
        <div className="absolute -top-4 -right-4 w-72 md:w-96 h-72 md:h-96 opacity-25 pointer-events-none select-none z-0">
          <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M380 30C380 30 220 20 130 140C60 240 100 350 210 340C320 330 400 180 380 30Z" fill="#7A8C3A" opacity="0.6" />
            <path d="M340 60C290 150 240 230 190 320" stroke="#5C6B2E" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            <path d="M310 90C270 150 240 210 210 270" stroke="#5C6B2E" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            <path d="M350 10C350 10 250 50 200 130C160 200 190 280 260 260C330 240 370 140 350 10Z" fill="#5C6B2E" opacity="0.3" />
          </svg>
        </div>

        {/* Decorative leaf — bottom left */}
        <div className="absolute bottom-20 -left-8 w-40 h-40 opacity-15 pointer-events-none select-none z-0">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 180C20 180 120 170 160 100C190 40 140 0 80 20C20 40 -10 120 20 180Z" fill="#7A8C3A" />
          </svg>
        </div>

        {/* Sparkle dots */}
        <div className="absolute top-[18%] left-[12%] w-1.5 h-1.5 rounded-full bg-white/50 pointer-events-none z-0" />
        <div className="absolute top-[25%] right-[18%] w-1 h-1 rounded-full bg-white/40 pointer-events-none z-0" />
        <div className="absolute top-[55%] left-[25%] w-2 h-2 rounded-full bg-white/35 pointer-events-none z-0" />
        <div className="absolute top-[65%] right-[30%] w-1.5 h-1.5 rounded-full bg-white/45 pointer-events-none z-0" />
        <div className="absolute top-[40%] left-[55%] w-1 h-1 rounded-full bg-white/40 pointer-events-none z-0" />

        {/* Page content */}
        <div className="relative z-10">
          <Navbar />

          <main className="pb-20">
            {/* ═══════════════ Hero Section ═══════════════ */}
            <section className="relative overflow-hidden px-4 md:px-8 pt-8 pb-12" id="about-hero">
              <div className="max-w-3xl mx-auto text-center relative z-10">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <Image
                    src="/aaushadhi_logo.svg"
                    alt="Aaushadhi Wellness Logo"
                    width={180}
                    height={180}
                    className="object-contain"
                    priority
                  />
                </div>

                {/* Title */}
                <h1
                  className="text-3xl md:text-5xl lg:text-[3.2rem] font-bold text-olive leading-[1.15] mb-2"
                  style={playfair}
                >
                  Aaushadhi Wellness
                </h1>

                {/* Tagline */}
                <p className="text-text-muted text-sm md:text-base mb-8 italic tracking-wide">
                  Rooted in Nature. Backed by Purity. Made for Wellness.
                </p>

                {/* Decorative divider */}
                <div className="mb-8">
                  <SectionDivider>
                    <LeafIcon className="text-olive opacity-40" />
                  </SectionDivider>
                </div>

                {/* Badge */}
                <div className="mb-6">
                  <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase text-olive bg-olive/8 border border-olive/12">
                    About Us
                  </span>
                </div>

                {/* Intro text — glass card */}
                <GlassCard className="text-center max-w-2xl mx-auto">
                  <p className="text-text-dark text-base md:text-lg leading-relaxed mb-4">
                    At <strong className="text-olive">AAUSHADHI WELLNESS</strong>, we blend ancient
                    Ayurvedic wisdom with modern science to create{" "}
                    <strong>100% pure herbal products</strong> that support your journey to a
                    healthier, balanced life.
                  </p>
                  <p className="text-text-muted text-sm md:text-base leading-relaxed">
                    Everything we make is rooted in nature, grown with care on our own farms, and
                    crafted with a deep commitment to purity, transparency, and sustainability. From
                    seed to shelf, we ensure nature&apos;s goodness reaches you in its truest form.
                  </p>
                </GlassCard>
              </div>
            </section>

            {/* ═══════════════ Feature Badges Grid ═══════════════ */}
            <section className="px-4 md:px-8 py-12" id="about-features">
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
                  {/* Non Preservative */}
                  <div className="flex flex-col items-center text-center">
                    <FeatureIconCircle>
                      <ShieldIcon className="text-olive" />
                    </FeatureIconCircle>
                    <h3 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                      Non Preservative
                    </h3>
                    <p className="text-text-muted text-xs leading-snug">
                      No chemicals. No compromises. Only the natural goodness of herbs.
                    </p>
                  </div>

                  {/* No Added Artificial Colour */}
                  <div className="flex flex-col items-center text-center">
                    <FeatureIconCircle>
                      <DropletIcon className="text-olive" />
                    </FeatureIconCircle>
                    <h3 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                      No Added Artificial Colour
                    </h3>
                    <p className="text-text-muted text-xs leading-snug">
                      Only the natural goodness of herbs.
                    </p>
                  </div>

                  {/* 100% Pure Herbal Product */}
                  <div className="flex flex-col items-center text-center col-span-2 md:col-span-1">
                    <FeatureIconCircle>
                      <LeafIcon className="text-olive" />
                    </FeatureIconCircle>
                    <h3 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                      100% Pure Herbal Product
                    </h3>
                    <p className="text-text-muted text-xs leading-snug">
                      Pure herbs, pure care, pure you.
                    </p>
                  </div>

                  {/* Sourced From Our Own Farm */}
                  <div className="flex flex-col items-center text-center">
                    <FeatureIconCircle>
                      <SproutIcon className="text-olive" />
                    </FeatureIconCircle>
                    <h3 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                      Sourced From Our Own Farm
                    </h3>
                    <p className="text-text-muted text-xs leading-snug">
                      Grown with love, harvested with care.
                    </p>
                  </div>

                  {/* Sustainable & Ethical */}
                  <div className="flex flex-col items-center text-center">
                    <FeatureIconCircle>
                      <HeartHandshakeIcon className="text-olive" />
                    </FeatureIconCircle>
                    <h3 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                      Sustainable &amp; Ethical
                    </h3>
                    <p className="text-text-muted text-xs leading-snug">
                      For you, for nature, for the future.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════ Our Story & Our Promise ═══════════════ */}
            <section className="px-4 md:px-8 py-12" id="about-story-promise">
              <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                {/* Our Story */}
                <GlassCard>
                  <div className="mb-6">
                    <SectionDivider>
                      <span className="text-olive font-bold text-lg whitespace-nowrap" style={playfair}>
                        Our Story
                      </span>
                    </SectionDivider>
                  </div>
                  <p className="text-text-dark text-[15px] leading-relaxed mb-4">
                    AAUSHADHI WELLNESS was born from a simple belief — that nature has the power to
                    heal, nourish, and transform lives.
                  </p>
                  <p className="text-text-dark text-[15px] leading-relaxed mb-4">
                    What started as a small step towards living a healthier life has grown into a
                    mission to share the purest form of nature with the world.
                  </p>
                  <p className="text-text-muted text-sm leading-relaxed italic">
                    From our own farm to your home, we ensure every product carries the essence of
                    purity, trust, and well-being.
                  </p>
                </GlassCard>

                {/* Our Promise */}
                <GlassCard>
                  <div className="mb-6">
                    <SectionDivider>
                      <span className="text-olive font-bold text-lg whitespace-nowrap" style={playfair}>
                        Our Promise
                      </span>
                    </SectionDivider>
                  </div>
                  <ul className="list-none p-0 m-0">
                    {[
                      "We grow our own herbs using natural & sustainable practices.",
                      "Our products are free from preservatives, harmful chemicals & artificial colours.",
                      "We maintain the highest quality standards at every step — from seed to shelf.",
                      "We are committed to your wellness and the well-being of our planet.",
                    ].map((text, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 py-3 border-b border-olive/6 last:border-b-0 text-[15px] leading-relaxed text-text-dark"
                      >
                        <span className="shrink-0 w-[22px] h-[22px] rounded-full bg-olive/10 flex items-center justify-center mt-0.5">
                          <CheckCircleIcon />
                        </span>
                        {text}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </div>
            </section>

            {/* ═══════════════ From Our Farm to Your Family ═══════════════ */}
            <section className="px-4 md:px-8 py-12" id="about-process">
              <div className="max-w-4xl mx-auto text-center">
                <div className="mb-8">
                  <SectionDivider>
                    <h2
                      className="text-xl md:text-2xl font-bold text-olive whitespace-nowrap"
                      style={playfair}
                    >
                      From Our Farm to Your Family
                    </h2>
                  </SectionDivider>
                </div>

                {/* Process Flow — desktop: horizontal grid, mobile: vertical stack */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-2 md:gap-0 max-w-[900px] mx-auto">
                  {/* Step 1: Own Farm */}
                  <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0 px-2">
                    <ProcessStepIcon>
                      <SproutIcon className="text-olive" />
                    </ProcessStepIcon>
                    <div className="text-left md:text-center">
                      <h4 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                        Own Farm
                      </h4>
                      <p className="text-text-muted text-xs">
                        We grow our herbs with natural care
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center md:pt-7 text-olive opacity-40 rotate-90 md:rotate-0 my-1 md:my-0">
                    <ArrowRightIcon />
                  </div>

                  {/* Step 2: Careful Harvest */}
                  <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0 px-2">
                    <ProcessStepIcon>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-olive">
                        <path d="M6 3v12" />
                        <path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                        <path d="M6 15a5 5 0 0 0 5 5h1a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3H6" />
                        <path d="M3 3h6" />
                      </svg>
                    </ProcessStepIcon>
                    <div className="text-left md:text-center">
                      <h4 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                        Careful Harvest
                      </h4>
                      <p className="text-text-muted text-xs">
                        Handpicked at the right time
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center md:pt-7 text-olive opacity-40 rotate-90 md:rotate-0 my-1 md:my-0">
                    <ArrowRightIcon />
                  </div>

                  {/* Step 3: Pure Process */}
                  <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0 px-2">
                    <ProcessStepIcon>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-olive">
                        <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                        <path d="M8.5 2h7" />
                        <path d="M7 16h10" />
                      </svg>
                    </ProcessStepIcon>
                    <div className="text-left md:text-center">
                      <h4 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                        Pure Process
                      </h4>
                      <p className="text-text-muted text-xs">
                        Cleaned, sorted &amp; prepared with utmost care
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center md:pt-7 text-olive opacity-40 rotate-90 md:rotate-0 my-1 md:my-0">
                    <ArrowRightIcon />
                  </div>

                  {/* Step 4: Pure Products */}
                  <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0 px-2">
                    <ProcessStepIcon>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-olive">
                        <path d="m7.5 4.27 9 5.15" />
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                        <path d="m3.3 7 8.7 5 8.7-5" />
                        <path d="M12 22V12" />
                      </svg>
                    </ProcessStepIcon>
                    <div className="text-left md:text-center">
                      <h4 className="text-sm font-bold text-text-dark mb-1" style={playfair}>
                        Pure Products
                      </h4>
                      <p className="text-text-muted text-xs">
                        Delivered to you in their purest form
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════ Trust Strip ═══════════════ */}
            <section className="px-4 md:px-8 py-6 max-w-5xl mx-auto" id="about-trust">
              <div className="flex flex-wrap justify-center gap-x-10 gap-y-6 py-7 border-t border-b border-olive/10">
                {[
                  { icon: <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />, label: "100% Pure & Natural" },
                  { icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, label: "Non-Preservative" },
                  { icon: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />, label: "No Added Artificial Colour" },
                  { icon: <><path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /></>, label: "Sourced From Our Own Farm" },
                  { icon: <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />, label: "Ayurveda Inspired" },
                  { icon: <><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" /><path d="M8.5 2h7" /></>, label: "Tested For Quality & Purity" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase text-olive opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <TrustIcon>{item.icon}</TrustIcon>
                    {item.label}
                  </div>
                ))}
              </div>
            </section>

            {/* ═══════════════ Closing CTA ═══════════════ */}
            <section className="px-4 md:px-8 py-16" id="about-cta">
              <div className="max-w-2xl mx-auto text-center">
                <p
                  className="text-olive font-bold text-lg md:text-xl tracking-wide mb-3"
                  style={playfair}
                >
                  Pure by Nature. Trusted by You. Crafted with Love.
                </p>
                <p className="text-text-muted text-sm md:text-base mb-8">
                  Choose wellness. Choose purity. Choose{" "}
                  <strong className="text-olive">AAUSHADHI WELLNESS</strong>.
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="/products"
                    id="about-cta-products"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-olive text-white text-sm font-bold uppercase tracking-wider hover:bg-olive-light active:scale-[0.97] transition-all duration-200 shadow-md"
                  >
                    Explore Our Products
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href="https://wa.me/918269431640"
                    target="_blank"
                    rel="noopener noreferrer"
                    id="about-cta-whatsapp"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#25D366] text-white text-sm font-bold uppercase tracking-wider hover:bg-[#20BD5A] active:scale-[0.97] transition-all duration-200 shadow-md"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Chat with Us
                  </a>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
}
