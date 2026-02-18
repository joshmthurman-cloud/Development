"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Ledger",
    href: "/ledger",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 4h14M3 8h14M3 12h10M3 16h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Receipts",
    href: "/receipts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 2h10a1 1 0 011 1v14l-2.5-1.5L11 17l-2.5-1.5L6 17l-2.5-1.5L4 17V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 6h6M7 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 17V7l4-4h6l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 13v2M10 10v5M13 12v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col bg-[var(--sb-primary)] text-white z-30"
      style={{ width: "var(--sb-sidebar-width)" }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <Image
          src="/images/logo.svg"
          alt="Schema Books"
          width={160}
          height={40}
          priority
          className="brightness-0 invert"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-4">
        <ul className="flex flex-col gap-1" role="list">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-[var(--sb-radius-input)]
                    text-sm font-medium transition-colors duration-150
                    ${isActive
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                    }
                  `.trim()}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <div className="border-t border-white/10 pt-4 px-2">
          <p className="text-xs text-white/40">
            {process.env.NEXT_PUBLIC_APP_NAME}
          </p>
        </div>
      </div>
    </aside>
  );
}
