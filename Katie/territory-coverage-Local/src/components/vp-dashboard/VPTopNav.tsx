"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { User } from "lucide-react";
import { T } from "@/lib/theme";

export function VPTopNav() {
  const [userOpen, setUserOpen] = useState(false);
  const pathname = usePathname();

  const navItem = (href: string, label: string) => {
    const active = pathname === href || (href === "/groups" && pathname.startsWith("/groups"));
    return (
      <Link
        href={href}
        className={`text-[11px] font-medium uppercase tracking-widest transition-opacity ${active ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header
      className="flex items-center justify-between px-5 h-12 shrink-0"
      style={{ background: T.navBg, color: T.textPrimary }}
    >
      <Link
        href="/"
        className="text-sm font-semibold tracking-wide shrink-0"
        style={{ color: T.textPrimary }}
        aria-label="U.S. Cabinet Depot home"
      >
        U.S. Cabinet Depot
      </Link>

      <nav className="flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
        {navItem("/", "Overview")}
        {navItem("/analytics", "Analytics")}
        {navItem("/groups", "Groups")}
      </nav>

      <div className="relative shrink-0">
        <button
          onClick={() => setUserOpen((o) => !o)}
          className="flex items-center justify-center w-7 h-7 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
          aria-expanded={userOpen}
          aria-haspopup="true"
        >
          <User className="w-3.5 h-3.5" />
        </button>
        {userOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setUserOpen(false)}
            />
            <div
              className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg shadow-lg z-20"
              style={{ background: T.cardBg, border: `1px solid ${T.border}` }}
            >
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full px-4 py-2 text-left text-xs hover:bg-white/10 transition-colors"
                style={{ color: T.textSecondary }}
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
