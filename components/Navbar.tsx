"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { cartCount } = useCart();
  const { customer, login, logout, isLoading } = useAuth();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // ── Mobile overlay rendered via portal so it escapes the sticky header ──
  const mobileOverlay = mounted
    ? createPortal(
        <div
          className={`fixed inset-0 z-[9999] md:hidden transition-opacity duration-300 ${
            menuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!menuOpen}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-cream/98"
            style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            onClick={closeMenu}
          />

          {/* Close button — top right */}
          <button
            type="button"
            onClick={closeMenu}
            className="absolute top-5 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-xl bg-olive/10 hover:bg-olive/20 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C6B2E" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* Menu content */}
          <div className="relative h-full flex flex-col pt-24 px-8 pb-10">
            {/* Nav Links */}
            <ul className="space-y-1">
              {navLinks.map((link, i) => (
                <li
                  key={link.label}
                  className={`transition-all ease-out ${
                    menuOpen
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                  style={{
                    transitionDuration: "400ms",
                    transitionDelay: menuOpen ? `${100 + i * 60}ms` : "0ms",
                  }}
                >
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className={`group flex items-center justify-between py-4 px-2 rounded-2xl transition-all duration-200 ${
                      pathname === link.href
                        ? "text-olive bg-olive/8"
                        : "text-text-dark hover:text-olive hover:bg-olive/5"
                    }`}
                  >
                    <span
                      className="text-[22px] font-bold tracking-tight"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {link.label}
                    </span>
                    {pathname === link.href && (
                      <span className="w-2 h-2 rounded-full bg-olive flex-shrink-0" />
                    )}
                  </Link>
                </li>
              ))}

              {/* Cart link */}
              <li
                className={`transition-all ease-out ${
                  menuOpen
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDuration: "400ms",
                  transitionDelay: menuOpen ? `${100 + navLinks.length * 60}ms` : "0ms",
                }}
              >
                <Link
                  href="/cart"
                  onClick={closeMenu}
                  className={`group flex items-center justify-between py-4 px-2 rounded-2xl transition-all duration-200 ${
                    pathname === "/cart"
                      ? "text-olive bg-olive/8"
                      : "text-text-dark hover:text-olive hover:bg-olive/5"
                  }`}
                >
                  <span
                    className="text-[22px] font-bold tracking-tight"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    Cart
                  </span>
                  {cartCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-olive text-white text-xs font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </li>

              {/* Mobile Auth Link */}
              <li
                className={`transition-all ease-out ${
                  menuOpen
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDuration: "400ms",
                  transitionDelay: menuOpen ? `${100 + (navLinks.length + 1) * 60}ms` : "0ms",
                }}
              >
                {!isLoading && (
                  customer ? (
                    <button
                      onClick={() => {
                        logout();
                        closeMenu();
                      }}
                      className="w-full text-left group flex items-center justify-between py-4 px-2 rounded-2xl transition-all duration-200 text-red-600 hover:bg-red-50"
                    >
                      <span
                        className="text-[22px] font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        Logout
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        login();
                        closeMenu();
                      }}
                      className="w-full text-left group flex items-center justify-between py-4 px-2 rounded-2xl transition-all duration-200 text-text-dark hover:text-olive hover:bg-olive/5"
                    >
                      <span
                        className="text-[22px] font-bold tracking-tight"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        Login
                      </span>
                    </button>
                  )
                )}
              </li>
            </ul>

            {/* Divider */}
            <div className="my-6 h-px bg-olive/10" />

            {/* WhatsApp CTA */}
            <div
              className={`transition-all ease-out ${
                menuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDuration: "400ms",
                transitionDelay: menuOpen ? "400ms" : "0ms",
              }}
            >
              <a
                href="https://wa.me/918269431640"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-full bg-[#25D366] text-white text-sm font-bold uppercase tracking-wider hover:bg-[#20BD5A] active:scale-[0.97] transition-all duration-200 shadow-md"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat with Us
              </a>
              <p className="text-center text-text-muted text-[11px] mt-2.5 tracking-wide">
                Order directly via WhatsApp
              </p>
            </div>

            {/* Social Media */}
            <div
              className={`flex justify-center gap-6 mt-6 transition-all ease-out ${
                menuOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDuration: "400ms",
                transitionDelay: menuOpen ? "460ms" : "0ms",
              }}
            >
              {/* Facebook */}
              <a
                href="https://www.facebook.com/share/1EL3uvziQP/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-11 h-11 rounded-full bg-olive/10 flex items-center justify-center text-olive hover:bg-olive hover:text-white transition-all duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/aaushadhi_wellness/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-11 h-11 rounded-full bg-olive/10 flex items-center justify-center text-olive hover:bg-olive hover:text-white transition-all duration-200"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>

            {/* Bottom branding */}
            <div className="mt-auto pt-6 text-center">
              <p
                className="text-olive/40 text-xs font-semibold tracking-widest uppercase"
              >
                Aaushadhi Wellness
              </p>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-olive/10">
        <nav className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/aaushadhi_logo.svg"
              alt="Aaushadhi Logo"
              width={44}
              height={44}
              className="transition-transform duration-300 group-hover:scale-105 object-contain"
            />
            <div className="leading-tight">
              <div
                className="text-olive font-bold text-lg tracking-wide"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Aaushadhi
              </div>
              <div
                className="text-olive font-bold text-lg -mt-1 tracking-wide"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Wellness
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links + Cart */}
          <div className="hidden md:flex items-center gap-8">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`text-[15px] font-medium transition-colors duration-200 ${
                      pathname === link.href
                        ? "text-olive"
                        : "text-text-dark hover:text-olive"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop Auth */}
            {!isLoading && (
              <div className="border-l border-olive/20 pl-6 flex items-center">
                {customer ? (
                  <button
                    onClick={logout}
                    className="text-[13px] font-bold uppercase tracking-wider text-olive hover:text-red-600 transition-colors duration-200"
                  >
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={() => login()}
                    className="text-[13px] font-bold uppercase tracking-wider text-olive hover:text-olive-light transition-colors duration-200"
                  >
                    Login
                  </button>
                )}
              </div>
            )}

            {/* Cart icon */}
            <Link
              href="/cart"
              className="relative flex items-center gap-1.5 text-text-dark hover:text-olive transition-colors duration-200"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-olive text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile: Cart + Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            {/* Cart icon (mobile) */}
            <Link
              href="/cart"
              className="relative flex items-center text-text-dark hover:text-olive transition-colors"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-olive text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Hamburger */}
            <button
              id="nav-hamburger"
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-olive/10 transition-colors cursor-pointer"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <span
                className={`absolute block h-[2px] w-5 bg-text-dark rounded-full transition-all duration-300 ease-out ${
                  menuOpen ? "rotate-45 translate-y-0" : "-translate-y-[6px]"
                }`}
              />
              <span
                className={`absolute block h-[2px] w-5 bg-text-dark rounded-full transition-all duration-200 ${
                  menuOpen ? "opacity-0 scale-x-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute block h-[2px] w-5 bg-text-dark rounded-full transition-all duration-300 ease-out ${
                  menuOpen ? "-rotate-45 translate-y-0" : "translate-y-[6px]"
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu rendered via portal to escape sticky stacking context */}
      {mobileOverlay}
    </>
  );
}
