"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  pendingReceipts: number;
  recentEntries: {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
  }[];
}

function KpiCard({
  label,
  value,
  trend,
  variant = "default",
}: {
  label: string;
  value: string;
  trend?: string;
  variant?: "default" | "success" | "danger" | "warning";
}) {
  const colorMap = {
    default: "text-[var(--sb-text)]",
    success: "text-[var(--sb-success)]",
    danger: "text-[var(--sb-danger)]",
    warning: "text-[var(--sb-warning)]",
  };

  return (
    <div className="sb-card flex flex-col gap-2">
      <p className="sb-kpi-label">{label}</p>
      <p className={`sb-kpi-value ${colorMap[variant]}`}>{value}</p>
      {trend && (
        <p className="text-xs text-[var(--sb-muted)]">{trend}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { activeBusiness, activeFiscalYear } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeBusiness || !activeFiscalYear) return;

    let mounted = true;
    setIsLoading(true);

    api<DashboardData>(
      `/businesses/${activeBusiness.id}/fiscal-years/${activeFiscalYear.id}/dashboard`,
      {},
      "Dashboard"
    )
      .then((d) => {
        if (mounted) setData(d);
      })
      .catch(() => {
        if (mounted) {
          setData({
            totalIncome: 0,
            totalExpenses: 0,
            netIncome: 0,
            pendingReceipts: 0,
            recentEntries: [],
          });
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [activeBusiness, activeFiscalYear]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[var(--sb-surface-alt)] rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sb-card h-[120px] animate-pulse bg-[var(--sb-surface-alt)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--sb-text)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--sb-muted)] mt-1">
            {activeBusiness?.name} — {activeFiscalYear?.label}
          </p>
        </div>
        <Link
          href="/ledger"
          className="text-sm font-medium text-[var(--sb-accent)] hover:underline"
        >
          View Ledger →
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="Total Income"
          value={formatCompactCurrency(data?.totalIncome ?? 0)}
          variant="success"
        />
        <KpiCard
          label="Total Expenses"
          value={formatCompactCurrency(data?.totalExpenses ?? 0)}
          variant="danger"
        />
        <KpiCard
          label="Net Income"
          value={formatCompactCurrency(data?.netIncome ?? 0)}
          variant={(data?.netIncome ?? 0) >= 0 ? "success" : "danger"}
        />
        <KpiCard
          label="Pending Receipts"
          value={String(data?.pendingReceipts ?? 0)}
          variant={data?.pendingReceipts ? "warning" : "default"}
        />
      </div>

      {/* Recent Entries */}
      <div className="sb-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--sb-text)]">
            Recent Entries
          </h2>
          <Badge variant="info">{data?.recentEntries?.length ?? 0} entries</Badge>
        </div>

        {data?.recentEntries && data.recentEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-[var(--sb-border)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--sb-muted)] uppercase tracking-wide">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--sb-muted)] uppercase tracking-wide">Description</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--sb-muted)] uppercase tracking-wide">Category</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--sb-muted)] uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[var(--sb-border)] last:border-0 hover:bg-[var(--sb-surface-alt)] transition-colors"
                  >
                    <td className="py-2.5 px-3 text-[var(--sb-text-secondary)]">{entry.date}</td>
                    <td className="py-2.5 px-3 font-medium text-[var(--sb-text)]">{entry.description}</td>
                    <td className="py-2.5 px-3">
                      <Badge>{entry.category}</Badge>
                    </td>
                    <td className={`py-2.5 px-3 text-right font-medium ${entry.amount >= 0 ? "text-[var(--sb-success)]" : "text-[var(--sb-danger)]"}`}>
                      {formatCurrency(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--sb-muted)] text-center py-8">
            No recent entries found.
          </p>
        )}
      </div>
    </div>
  );
}
