"use client";

import { T } from "@/lib/theme";

interface VPMapHeaderStripProps {
  regionCount?: number;
  dateRange?: string;
}

export function VPMapHeaderStrip({
  regionCount = 7,
  dateRange = "Jan 1 – Dec 31, 2025",
}: VPMapHeaderStripProps) {
  return (
    <div
      className="h-9 px-5 flex items-center justify-between shrink-0"
      style={{
        background: T.cardBg,
        borderBottom: `1px solid ${T.rowBorder}`,
        color: T.textPrimary,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide">Map Overview</span>
        <span className="text-[11px]" style={{ color: T.textMuted }}>
          · {regionCount} Regions
        </span>
      </div>
      <span className="text-[11px]" style={{ color: T.textMuted }}>
        {dateRange}
      </span>
    </div>
  );
}
