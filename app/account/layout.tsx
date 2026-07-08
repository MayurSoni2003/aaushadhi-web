"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

const accountLinks = [
  {
    label: "Profile",
    href: "/account/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "My Orders",
    href: "/account/orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    label: "Saved Addresses",
    href: "/account/addresses",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { customer, isLoading, login } = useAuth();
  const pathname = usePathname();

  // Auth guard: trigger login modal for unauthenticated users
  useEffect(() => {
    if (!isLoading && !customer) {
      login(() => {
        // After successful login, stay on the current page (no redirect needed)
      });
    }
  }, [isLoading, customer, login]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
            <p className="text-text-muted text-sm">Loading your account...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If not authenticated, show a minimal page (the login modal is already triggered)
  if (!customer) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2
              className="text-xl font-bold text-olive mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Please log in
            </h2>
            <p className="text-text-muted text-sm">
              You need to be logged in to access your account.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 pt-6 md:pt-8 pb-20">
        {/* Page header */}
        <div className="mb-6 md:mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold text-olive"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            My Account
          </h1>
          <p className="mt-1 text-text-muted text-sm">
            Manage your profile and preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Sidebar / Tabs */}
          <nav className="md:w-56 flex-shrink-0">
            {/* Mobile: horizontal tabs */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-2">
              {accountLinks.map((link) => {
                const isActive = pathname === link.href || (pathname && pathname.startsWith(link.href + "/"));
                return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-olive text-white shadow-sm"
                      : "bg-white text-text-dark hover:bg-olive/5 border border-olive/10"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
                );
              })}
            </div>

            {/* Desktop: vertical sidebar */}
            <div className="hidden md:flex flex-col gap-1">
              {accountLinks.map((link) => {
                const isActive = pathname === link.href || (pathname && pathname.startsWith(link.href + "/"));
                return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-olive/10 text-olive"
                      : "text-text-dark hover:bg-olive/5 hover:text-olive"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
