"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category, CategoryTotal, LedgerSummary, LedgerTab, MonthlyValues } from "@/types";
import { api } from "@/lib/api";

const EMPTY_MONTHLY: MonthlyValues = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 };

const TAB_TO_ACCOUNT_TYPE: Record<LedgerTab, string | undefined> = {
  summary: undefined,
  bank: "BANK",
  credit_card: "CREDIT_CARD",
  personally_paid: "PERSONALLY_PAID",
};

function mergeCategories(
  categories: Category[],
  totals: CategoryTotal[]
): CategoryTotal[] {
  const totalMap = new Map(totals.map((t) => [t.name, t]));

  return categories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cat) => {
      const existing = totalMap.get(cat.name);
      return existing ?? {
        name: cat.name,
        group: cat.group,
        total: 0,
        monthly: { ...EMPTY_MONTHLY },
      };
    });
}

interface UseLedgerResult {
  data: CategoryTotal[];
  monthlyTotals: LedgerSummary["monthlyTotals"] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLedger(
  businessId: string | undefined,
  fiscalYearId: string | undefined,
  tab: LedgerTab
): UseLedgerResult {
  const [data, setData] = useState<CategoryTotal[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<LedgerSummary["monthlyTotals"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!businessId || !fiscalYearId) return;

    let mounted = true;
    setIsLoading(true);
    setError(null);

    const accountType = TAB_TO_ACCOUNT_TYPE[tab];
    const query = accountType ? `?accountType=${accountType}` : "";

    Promise.all([
      api<LedgerSummary>(
        `/businesses/${businessId}/fiscal-years/${fiscalYearId}/ledger/summary${query}`,
        {},
        "LedgerView"
      ),
      api<Category[]>(
        `/businesses/${businessId}/categories`,
        {},
        "LedgerView"
      ),
    ])
      .then(([summary, categories]) => {
        if (!mounted) return;

        const filteredCategories = accountType
          ? categories.filter((c) => c.accountType === accountType)
          : categories;

        setData(mergeCategories(filteredCategories, summary.categoryTotals));
        setMonthlyTotals(summary.monthlyTotals);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load ledger data");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [businessId, fiscalYearId, tab, fetchKey]);

  return { data, monthlyTotals, isLoading, error, refetch };
}
