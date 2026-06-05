import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-parchment border-t border-earth/20 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
        {/* Brand */}
        <div className="text-center flex flex-col items-center">
          <Image
            src="/aaushadhi_logo.svg"
            alt="Aaushadhi Logo"
            width={120}
            height={120}
            className="mb-3 object-contain"
          />
          <p
            className="text-olive font-bold text-xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Aaushadhi Wellness
          </p>
          <p className="text-text-muted text-sm mt-1">
            Embrace natural healing with certified organic herbal remedies.
          </p>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-earth/30 rounded-full" />

        {/* Social icons */}
        <div className="flex items-center gap-5">
          {/* Facebook */}
          <a
            href="#"
            id="footer-facebook"
            aria-label="Facebook"
            className="w-10 h-10 rounded-full bg-olive/10 flex items-center justify-center text-olive hover:bg-olive hover:text-white transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>

          {/* X / Twitter */}
          <a
            href="#"
            id="footer-twitter"
            aria-label="X (Twitter)"
            className="w-10 h-10 rounded-full bg-olive/10 flex items-center justify-center text-olive hover:bg-olive hover:text-white transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          {/* Instagram */}
          <a
            href="#"
            id="footer-instagram"
            aria-label="Instagram"
            className="w-10 h-10 rounded-full bg-olive/10 flex items-center justify-center text-olive hover:bg-olive hover:text-white transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
        </div>

        {/* Copyright */}
        <p className="text-text-muted text-xs text-center">
          © {new Date().getFullYear()} Aaushadhi Wellness. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
