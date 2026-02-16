"use client";

import Link from "next/link";

const NAVY = "#303F67";
const NAVY_BG = "#1D325E";
const LIGHT_GRAY = "#D8D8D8";
const RED = "#E33F3F";

export function USCabinetDepotLogo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-stretch overflow-hidden shrink-0 ${className}`}
      style={{ height: "40px" }}
      aria-label="U.S. Cabinet Depot home"
    >
      <span
        className="relative flex flex-col items-center justify-center px-3 pt-1 pb-0.5 font-serif text-lg font-bold uppercase"
        style={{ background: LIGHT_GRAY, color: NAVY }}
      >
        <span>U.S.</span>
        <span className="flex gap-0.5 mt-0.5 text-[8px]" style={{ color: RED }} aria-hidden>
          <span>★</span>
          <span>★</span>
        </span>
      </span>
      <span
        className="flex flex-col items-center justify-center px-3 py-1 text-[11px] font-semibold uppercase tracking-wide leading-tight"
        style={{ background: NAVY_BG, color: "#fff" }}
      >
        <span>CABINET</span>
        <span>DEPOT</span>
      </span>
    </Link>
  );
}
