"use client";

import { useEffect, useRef, useState } from "react";
import type { LedgerEntry } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, MONTH_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: string;
  fiscalYearId?: string;
  categoryName?: string;
  month?: number;
  amount: number;
}

export function DetailDrawer({
  isOpen,
  onClose,
  businessId,
  fiscalYearId,
  categoryName,
  month,
  amount,
}: DetailDrawerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || !businessId || !fiscalYearId || !categoryName || !month) return;

    let mounted = true;
    setIsLoading(true);

    api<LedgerEntry[]>(
      `/businesses/${businessId}/fiscal-years/${fiscalYearId}/ledger/entries?category=${encodeURIComponent(categoryName)}&month=${month}`,
      {},
      "DetailDrawer"
    )
      .then((data) => {
        if (mounted) setEntries(data);
      })
      .catch(() => {
        if (mounted) setEntries([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [isOpen, businessId, fiscalYearId, categoryName, month]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${categoryName} details for ${month ? MONTH_LABELS[month - 1] : ""}`}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-[var(--sb-surface)] shadow-[var(--sb-shadow-modal)] z-50 animate-slide-in-right flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--sb-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--sb-text)]">
              {categoryName}
            </h2>
            <p className="text-sm text-[var(--sb-muted)]">
              {month ? MONTH_LABELS[month - 1] : ""} — {formatCurrency(amount)}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close detail drawer"
            className="p-2 rounded-[var(--sb-radius-input)] hover:bg-[var(--sb-surface-alt)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-[var(--sb-surface-alt)] rounded animate-pulse" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <ul className="space-y-3" role="list">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="p-4 rounded-[var(--sb-radius-card)] border border-[var(--sb-border)] hover:border-[var(--sb-accent)] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-[var(--sb-text)]">
                        {entry.description}
                      </p>
                      <p className="text-xs text-[var(--sb-muted)] mt-0.5">
                        {entry.vendor} — {formatDate(entry.date)}
                      </p>
                    </div>
                    <span
                      className={`font-semibold text-sm ${
                        entry.amount >= 0
                          ? "text-[var(--sb-success)]"
                          : "text-[var(--sb-danger)]"
                      }`}
                    >
                      {formatCurrency(entry.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>Rev. {entry.revision}</Badge>
                    {entry.receiptUrl && (
                      <Badge variant="success">Receipt</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--sb-muted)]">
                No entries found for this period.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--sb-border)]">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </>
  );
}
