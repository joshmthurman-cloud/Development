"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { T } from "@/lib/theme";

interface Group {
  id: string;
  name: string;
  colorHex: string;
}

interface VPLeftRailProps {
  groups: Group[];
  selectedGroupIds: Set<string>;
  onToggleGroup: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  loading: boolean;
}

export function VPLeftRail({
  groups,
  selectedGroupIds,
  onToggleGroup,
  onSelectAll,
  onClearAll,
  loading,
}: VPLeftRailProps) {
  const selectedCount = selectedGroupIds.size;

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col overflow-hidden"
      style={{
        background: T.railBg,
        borderRight: `1px solid ${T.railBorder}`,
        color: T.textPrimary,
      }}
    >
      <div className="p-5 overflow-auto flex-1">
        {/* Section label */}
        <p
          className="text-[10px] uppercase tracking-[0.12em] font-medium mb-4"
          style={{ color: T.textMuted }}
        >
          Filters
        </p>

        {/* Groups section */}
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: T.textPrimary }}>Groups</p>

          {/* Action buttons row */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="h-7 px-3 rounded-full text-[11px] font-medium transition-colors"
              style={{ background: T.btnBg, color: T.textSecondary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.btnHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.btnBg)}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="h-7 px-3 rounded-full text-[11px] font-medium transition-colors"
              style={{ background: T.btnBg, color: T.textSecondary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.btnHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.btnBg)}
            >
              Clear
            </button>
          </div>

          {/* Selected count */}
          <p className="text-[11px] mb-3" style={{ color: T.textMuted }}>
            Selected: {selectedCount} of {groups.length}
          </p>

          {/* Divider */}
          <div className="h-px mb-2" style={{ background: T.rowBorder }} />

          {loading ? (
            <p className="text-xs py-4" style={{ color: T.textMuted }}>Loading…</p>
          ) : (
            <div className="space-y-0">
              {groups.map((g) => {
                const checked = selectedGroupIds.has(g.id);
                return (
                  <label
                    key={g.id}
                    className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md cursor-pointer transition-colors"
                    style={{ background: checked ? "rgba(255,255,255,0.04)" : "transparent" }}
                    onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = checked ? "rgba(255,255,255,0.04)" : "transparent"; }}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggleGroup(g.id)}
                      className="border-white/30 data-[state=checked]:bg-[var(--vp-primary-500)] data-[state=checked]:border-[var(--vp-primary-500)] shrink-0"
                    />
                    <span
                      className="w-[10px] h-[10px] rounded-full shrink-0"
                      style={{ backgroundColor: g.colorHex }}
                    />
                    <span className="text-sm truncate" style={{ color: T.textSecondary }}>{g.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
