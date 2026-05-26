export default function Hero() {
  return (
    <section className="relative z-10 px-4 md:px-8 pt-4 pb-10">
      {/* Glassmorphism hero card — matches wireframe exactly */}
      <div
        className="mx-auto w-full max-w-4xl rounded-3xl px-8 md:px-16 py-10 md:py-14 text-center"
        style={{
          background: "rgba(255, 255, 255, 0.5)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1.5px solid rgba(255, 255, 255, 0.6)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(255,255,255,0.4) inset",
        }}
      >
        {/* Heading */}
        <h1
          className="text-3xl md:text-5xl lg:text-[3.4rem] font-bold text-olive leading-[1.15] mb-4"
          style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
        >
          Embrace Ayurvedic Wisdom
        </h1>

        {/* Subtitle */}
        <p className="text-text-muted text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed">
          Discover the healing power of nature&apos;s purity for holistic well-being.
        </p>

        {/* Search bar — rounded pill */}
        <div
          id="hero-search-bar"
          className="flex items-center gap-3 max-w-md mx-auto rounded-full px-5 py-3"
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            border: "1.5px solid rgba(92,107,46, 0.15)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          }}
        >
          <span className="text-text-muted text-sm flex-1 text-left select-none">
            Search for powders, remedies...
          </span>
          {/* Search icon — olive circle with white magnifying glass */}
          <div className="w-9 h-9 rounded-full bg-olive flex items-center justify-center flex-shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
