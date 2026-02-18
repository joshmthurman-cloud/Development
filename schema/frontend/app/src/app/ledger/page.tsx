"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLedger } from "@/hooks/useLedger";
import { LedgerTable } from "@/components/LedgerTable";
import { DetailDrawer } from "@/components/DetailDrawer";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";
import type { LedgerTab } from "@/types";

const TABS: { key: LedgerTab; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "bank", label: "Bank" },
  { key: "credit_card", label: "Credit Card" },
  { key: "personally_paid", label: "Personally Paid" },
];

export default function LedgerPage() {
  const { activeBusiness, activeFiscalYear } = useAuth();
  const [activeTab, setActiveTab] = useState<LedgerTab>("summary");
  const [selectedCell, setSelectedCell] = useState<{
    categoryName: string;
    group: string;
    month: number;
    amount: number;
  } | null>(null);

  const { data, monthlyTotals, isLoading, error, refetch } = useLedger(
    activeBusiness?.id,
    activeFiscalYear?.id,
    activeTab
  );

  const netMonthly = useMemo(() => {
    if (!monthlyTotals) return null;
    const net: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      const key = m as keyof typeof monthlyTotals.income;
      net[m] = monthlyTotals.income[key] - monthlyTotals.expenses[key];
    }
    return net;
  }, [monthlyTotals]);

  const handleCellClick = useCallback(
    (categoryName: string, group: string, month: number, amount: number) => {
      setSelectedCell({ categoryName, group, month, amount });
    },
    []
  );

  const handleExport = useCallback(() => {
    logger.exportRequest({
      businessId: activeBusiness?.id,
      fiscalYearId: activeFiscalYear?.id,
      tab: activeTab,
    });
  }, [activeBusiness, activeFiscalYear, activeTab]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--sb-text)]">
            Ledger
          </h1>
          <p className="text-sm text-[var(--sb-muted)] mt-1">
            {activeBusiness?.name} — {activeFiscalYear?.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refetch}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b border-[var(--sb-border)]"
        role="tablist"
        aria-label="Ledger view tabs"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150
              ${activeTab === tab.key
                ? "border-[var(--sb-accent)] text-[var(--sb-accent)]"
                : "border-transparent text-[var(--sb-muted)] hover:text-[var(--sb-text)] hover:border-[var(--sb-border)]"
              }
            `.trim()}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ledger Content */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={`${TABS.find((t) => t.key === activeTab)?.label} ledger view`}
      >
        {error ? (
          <div className="sb-card text-center py-12">
            <p className="text-[var(--sb-danger)] font-medium mb-2">
              Failed to load ledger data
            </p>
            <p className="text-sm text-[var(--sb-muted)] mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={refetch}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="sb-card overflow-x-auto p-0">
            <LedgerTable
              data={data}
              monthlyTotals={monthlyTotals}
              netMonthly={netMonthly}
              isLoading={isLoading}
              onCellClick={handleCellClick}
            />
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        isOpen={!!selectedCell}
        onClose={() => setSelectedCell(null)}
        businessId={activeBusiness?.id}
        fiscalYearId={activeFiscalYear?.id}
        categoryName={selectedCell?.categoryName}
        month={selectedCell?.month}
        amount={selectedCell?.amount ?? 0}
      />
    </div>
  );
}
