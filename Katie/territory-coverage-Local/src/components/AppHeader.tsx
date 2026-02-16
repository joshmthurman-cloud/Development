"use client";

import Link from "next/link";
import { useState } from "react";

interface AppHeaderProps {
  title: string;
  children: React.ReactNode;
}

export function AppHeader({ title, children }: AppHeaderProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="relative flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
      <Link href="/" className="flex-shrink-0 flex items-center min-h-[2.5rem]" aria-label="U.S. Cabinet Depot home">
        {logoError ? (
          <span className="text-lg font-semibold text-slate-700">U.S. Cabinet Depot</span>
        ) : (
          <img
            src="/USCD_Logo.png"
            alt="U.S. Cabinet Depot"
            className="h-10 w-auto object-contain"
            style={{ filter: "none" }}
            onError={() => setLogoError(true)}
          />
        )}
      </Link>
      <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-slate-800 pointer-events-none">
        {title}
      </h1>
      <nav className="flex items-center gap-4 flex-shrink-0">
        {children}
      </nav>
    </header>
  );
}
