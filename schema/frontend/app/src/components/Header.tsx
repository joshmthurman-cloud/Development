"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export function Header() {
  const { user, businesses = [], activeBusiness, switchBusiness, fiscalYears = [], activeFiscalYear, switchFiscalYear, logout } = useAuth();

  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center justify-between bg-[var(--sb-surface)] border-b border-[var(--sb-border)]"
      style={{
        left: "var(--sb-sidebar-width)",
        height: "var(--sb-header-height)",
        padding: "0 24px",
      }}
    >
      {/* Left: Business + Fiscal Year selectors */}
      <div className="flex items-center gap-4">
        {businesses.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="business-select" className="text-xs font-medium text-[var(--sb-muted)] uppercase tracking-wide">
              Business
            </label>
            <select
              id="business-select"
              value={activeBusiness?.id || ""}
              onChange={(e) => {
                const biz = businesses.find((b) => b.id === e.target.value);
                if (biz) switchBusiness(biz);
              }}
              className="text-sm font-medium bg-transparent border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--sb-accent)]"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {fiscalYears.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="fy-select" className="text-xs font-medium text-[var(--sb-muted)] uppercase tracking-wide">
              Fiscal Year
            </label>
            <select
              id="fy-select"
              value={activeFiscalYear?.id || ""}
              onChange={(e) => {
                const fy = fiscalYears.find((f) => f.id === e.target.value);
                if (fy) switchFiscalYear(fy);
              }}
              className="text-sm font-medium bg-transparent border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--sb-accent)]"
            >
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: User info + Logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full bg-[var(--sb-accent)] flex items-center justify-center text-white text-sm font-semibold"
              aria-hidden="true"
            >
              {(user.firstName || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[var(--sb-text)] leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-[var(--sb-muted)] leading-tight">
                {user.email}
              </p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
