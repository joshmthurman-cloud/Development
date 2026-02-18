"use client";

import { useCallback, useMemo, useState } from "react";
import type { CategoryTotal, LedgerSummary, MonthlyValues } from "@/types";
import { formatCurrency, MONTH_LABELS } from "@/lib/format";

interface LedgerTableProps {
  data: CategoryTotal[];
  monthlyTotals: LedgerSummary["monthlyTotals"] | null;
  netMonthly: Record<number, number> | null;
  isLoading: boolean;
  onCellClick: (categoryName: string, group: string, month: number, amount: number) => void;
}

interface GroupState {
  [group: string]: boolean;
}

export function LedgerTable({
  data,
  monthlyTotals,
  netMonthly,
  isLoading,
  onCellClick,
}: LedgerTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<GroupState>({});

  const groups = useMemo(() => {
    const map = new Map<string, CategoryTotal[]>();
    data.forEach((cat) => {
      const items = map.get(cat.group) || [];
      items.push(cat);
      map.set(cat.group, items);
    });
    return map;
  }, [data]);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const groupTotal = useCallback((categories: CategoryTotal[]): MonthlyValues => {
    const totals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 };
    categories.forEach((cat) => {
      for (let m = 1; m <= 12; m++) {
        totals[m as keyof MonthlyValues] += cat.monthly[m as keyof MonthlyValues];
      }
    });
    return totals as MonthlyValues;
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-10 bg-[var(--sb-surface-alt)] rounded animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--sb-muted)] text-sm">
        No categories found for this view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="ledger-table" role="table" aria-label="Ledger data">
        <thead>
          <tr>
            <th style={{ minWidth: 220 }}>Category</th>
            {MONTH_LABELS.map((label, i) => (
              <th key={i} style={{ minWidth: 100 }}>
                {label}
              </th>
            ))}
            <th style={{ minWidth: 110 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(groups.entries()).map(([group, categories]) => {
            const isExpanded = expandedGroups[group] !== false;
            const gTotal = groupTotal(categories);
            const gTotalSum = categories.reduce((s, c) => s + c.total, 0);

            return (
              <GroupRows
                key={group}
                group={group}
                categories={categories}
                isExpanded={isExpanded}
                groupMonthlyTotal={gTotal}
                groupTotal={gTotalSum}
                onToggle={() => toggleGroup(group)}
                onCellClick={onCellClick}
              />
            );
          })}

          {/* Income totals */}
          {monthlyTotals && (
            <tr className="ledger-total-row">
              <td>Total Income</td>
              {MONTH_LABELS.map((_, i) => (
                <td key={i}>
                  {formatCurrency(monthlyTotals.income[(i + 1) as keyof MonthlyValues])}
                </td>
              ))}
              <td>
                {formatCurrency(
                  Object.values(monthlyTotals.income).reduce((s, v) => s + v, 0)
                )}
              </td>
            </tr>
          )}

          {/* Expense totals */}
          {monthlyTotals && (
            <tr className="ledger-total-row">
              <td>Total Expenses</td>
              {MONTH_LABELS.map((_, i) => (
                <td key={i}>
                  {formatCurrency(monthlyTotals.expenses[(i + 1) as keyof MonthlyValues])}
                </td>
              ))}
              <td>
                {formatCurrency(
                  Object.values(monthlyTotals.expenses).reduce((s, v) => s + v, 0)
                )}
              </td>
            </tr>
          )}

          {/* Net row */}
          {netMonthly && (
            <tr className="ledger-net-row">
              <td>Net Income</td>
              {MONTH_LABELS.map((_, i) => (
                <td key={i}>{formatCurrency(netMonthly[i + 1])}</td>
              ))}
              <td>
                {formatCurrency(
                  Object.values(netMonthly).reduce((s, v) => s + v, 0)
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  categories,
  isExpanded,
  groupMonthlyTotal,
  groupTotal,
  onToggle,
  onCellClick,
}: {
  group: string;
  categories: CategoryTotal[];
  isExpanded: boolean;
  groupMonthlyTotal: MonthlyValues;
  groupTotal: number;
  onToggle: () => void;
  onCellClick: (categoryName: string, group: string, month: number, amount: number) => void;
}) {
  return (
    <>
      {/* Group header */}
      <tr
        className="ledger-group-header"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${group} category group, ${isExpanded ? "expanded" : "collapsed"}`}
      >
        <td>
          <span className="inline-flex items-center gap-2">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
              aria-hidden="true"
            >
              <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {group}
          </span>
        </td>
        {MONTH_LABELS.map((_, i) => (
          <td key={i}>
            {formatCurrency(groupMonthlyTotal[(i + 1) as keyof MonthlyValues])}
          </td>
        ))}
        <td>{formatCurrency(groupTotal)}</td>
      </tr>

      {/* Category rows */}
      {isExpanded &&
        categories.map((cat) => (
          <tr key={cat.name}>
            <td style={{ paddingLeft: 36 }}>{cat.name}</td>
            {MONTH_LABELS.map((_, i) => {
              const month = i + 1;
              const amount = cat.monthly[month as keyof MonthlyValues];
              return (
                <td key={i}>
                  <button
                    type="button"
                    className="ledger-cell-clickable w-full text-right"
                    onClick={() => onCellClick(cat.name, cat.group, month, amount)}
                    aria-label={`${cat.name}, ${MONTH_LABELS[i]}: ${formatCurrency(amount)}`}
                  >
                    {formatCurrency(amount)}
                  </button>
                </td>
              );
            })}
            <td className="font-medium">{formatCurrency(cat.total)}</td>
          </tr>
        ))}
    </>
  );
}
