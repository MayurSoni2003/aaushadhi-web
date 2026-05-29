export default function Hero() {
  return (
    <section className="relative z-10 px-4 md:px-8 pt-4 pb-16">

      {/* Wrapper controls overlap */}
      <div className="max-w-4xl mx-auto relative">

        {/* Hero glass box */}

        <div
          className=" rounded-3xl px-8 md:px-16 pt-10 md:pt-14 pb-16 md:pb-20 text-center"
          style={{
            background: "rgba(255,255,255,0.5)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",

            border:
              "1.5px solid rgba(255,255,255,0.6)",

            boxShadow:
              "0 8px 40px rgba(0,0,0,0.04), inset 0 1px 3px rgba(255,255,255,0.4)",
          }}
        >
          <h1
            className=" text-3xl md:text-5xl lg:text-[3.4rem] font-bold text-olive leading-[1.15] mb-4 "
            style={{
              fontFamily:
                "var(--font-playfair)",
              fontStyle: "italic",
            }}
          >
            Embrace Ayurvedic Wisdom
          </h1>

          <p className="text-text-muted text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Discover the healing power of nature&apos;s
            purity for holistic well-being.
          </p>
        </div>

        {/* Overlapping search */}

        <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-[85%] max-w-md">
          <form
            action="/products"
            className="flex items-center gap-3 rounded-full px-5 py-3"
            style={{
              background: "rgba(255,255,255,0.85)",
              border: "1.5px solid rgba(92,107,46,0.15)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
              backdropFilter: "blur(12px)",
            }}
          >
            <input
              type="text"
              name="q"
              placeholder="Search for powders, remedies..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-text-dark placeholder-text-muted"
            />
            <button type="submit" aria-label="Search">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B6A16"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </form>
        </div>

      </div>

    </section>
  );
}