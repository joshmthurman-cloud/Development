export interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "bookkeeper" | "viewer";
}

export interface Business {
  id: string;
  name: string;
  fiscalYearEnd: string;
}

export interface FiscalYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface MonthlyValues {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
  7: number;
  8: number;
  9: number;
  10: number;
  11: number;
  12: number;
}

export interface CategoryTotal {
  name: string;
  group: string;
  total: number;
  monthly: MonthlyValues;
}

export interface MonthlyTotals {
  income: MonthlyValues;
  expenses: MonthlyValues;
}

export interface LedgerSummary {
  categoryTotals: CategoryTotal[];
  monthlyTotals: MonthlyTotals;
}

export interface Category {
  id: string;
  name: string;
  group: string;
  accountType: AccountType;
  sortOrder: number;
}

export type AccountType = "BANK" | "CREDIT_CARD" | "PERSONALLY_PAID";

export type LedgerTab = "summary" | "bank" | "credit_card" | "personally_paid";

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  vendor: string;
  receiptUrl?: string;
  revision: number;
}

export interface LogEvent {
  route: string;
  sheetTab: string;
  fiscalYearId: string;
  businessId: string;
  correlationId: string;
  uiComponent: string;
  action: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  status: number;
  message: string;
  correlationId?: string;
}
