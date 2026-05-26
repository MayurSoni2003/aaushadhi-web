"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Remedies", href: "#" },
  { label: "Products", href: "#" },
  { label: "Wellness Blog", href: "#" },
  { label: "About Us", href: "#" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-50">
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="#" className="flex items-center gap-2.5 group">
          {/* Leaf SVG icon */}
          <svg
            width="38"
            height="38"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform duration-300 group-hover:scale-110"
          >
            <path
              d="M20 4C20 4 10 10 8 20C6 30 14 36 20 36C26 36 34 30 32 20C30 10 20 4 20 4Z"
              fill="#5C6B2E"
              opacity="0.9"
            />
            <path
              d="M20 6C20 6 26 14 24 26"
              stroke="#EDE3CA"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <ellipse
              cx="15"
              cy="16"
              rx="5"
              ry="7"
              fill="#7A8C3A"
              opacity="0.6"
              transform="rotate(-15 15 16)"
            />
            <path
              d="M20 10C20 10 14 16 16 24"
              stroke="#EDE3CA"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
          <div className="leading-tight">
            <div
              className="text-olive font-bold text-xl tracking-wide"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Aaushadhi
            </div>
            <div
              className="text-olive font-semibold text-base -mt-0.5"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Wellness
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-text-dark text-[15px] font-medium hover:text-olive transition-colors duration-200"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Hamburger for mobile */}
        <button
          id="nav-hamburger"
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/30 transition-colors"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-6 bg-text-dark rounded transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block h-0.5 w-6 bg-text-dark rounded transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-6 bg-text-dark rounded transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden px-6 pb-6 pt-2">
          <div
            className="rounded-2xl px-6 py-4"
            style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.5)",
            }}
          >
            <ul className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="block text-text-dark font-medium hover:text-olive transition-colors py-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  );
}
