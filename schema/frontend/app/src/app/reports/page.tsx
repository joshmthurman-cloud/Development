"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

const REPORT_TYPES = [
  {
    id: "profit-loss",
    title: "Profit & Loss",
    description: "Income, expenses, and net income by category and month",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 20V8l5-5h8l5 5v12a1 1 0 01-1 1H4a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 15v3M12 11v7M16 13v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity snapshot",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 12h18M12 3v18" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "tax-summary",
    title: "Tax Summary",
    description: "Categorized deductions and taxable income overview",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 4h16v16H4V4z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12h8M8 8h5M8 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "receipt-log",
    title: "Receipt Log",
    description: "Complete log of all uploaded receipts by date and category",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 2h12a1 1 0 011 1v18l-3-2-3 2-3-2-3 2-3-2V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 7h6M9 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ReportsPage() {
  const { activeBusiness, activeFiscalYear } = useAuth();

  function handleExport(reportId: string) {
    logger.exportRequest({
      reportType: reportId,
      businessId: activeBusiness?.id,
      fiscalYearId: activeFiscalYear?.id,
    });

    // Trigger download via API
    const url = `${process.env.NEXT_PUBLIC_API_URL}/businesses/${activeBusiness?.id}/fiscal-years/${activeFiscalYear?.id}/reports/${reportId}/export`;
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--sb-text)]">Reports</h1>
        <p className="text-sm text-[var(--sb-muted)] mt-1">
          Generate and export financial reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORT_TYPES.map((report) => (
          <div key={report.id} className="sb-card flex items-start gap-4">
            <div className="p-3 rounded-[var(--sb-radius-input)] bg-[var(--sb-surface-alt)] text-[var(--sb-primary)] shrink-0">
              {report.icon}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-[var(--sb-text)]">
                {report.title}
              </h2>
              <p className="text-sm text-[var(--sb-muted)] mt-1 mb-3">
                {report.description}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport(report.id)}
              >
                Export
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
