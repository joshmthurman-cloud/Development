"use client";

import Link from "next/link";
import Image from "next/image";

interface AppHeaderProps {
  title: string;
  children: React.ReactNode;
}

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header className="relative flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
      <Link href="/" className="flex-shrink-0 flex items-center" aria-label="U.S. Cabinet Depot home">
        <Image
          src="/USCD_Logo.png"
          alt="U.S. Cabinet Depot"
          width={160}
          height={48}
          className="h-10 w-auto object-contain"
          priority
        />
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
