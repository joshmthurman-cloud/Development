import type { LogEvent } from "@/types";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let globalCorrelationId = generateId();

export function resetCorrelationId(): void {
  globalCorrelationId = generateId();
}

export function getCorrelationId(): string {
  return globalCorrelationId;
}

function buildEvent(
  action: string,
  uiComponent: string,
  meta?: Record<string, unknown>
): LogEvent {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

  return {
    route: path,
    sheetTab: params.get("accountType") || "summary",
    fiscalYearId: params.get("fiscalYearId") || "",
    businessId: params.get("businessId") || "",
    correlationId: globalCorrelationId,
    uiComponent,
    action,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
}

function emit(event: LogEvent): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[Schema Books]", JSON.stringify(event, null, 2));
  }

  // In production, batch and POST to a logging endpoint
  if (process.env.NODE_ENV === "production") {
    navigator.sendBeacon?.(
      `${process.env.NEXT_PUBLIC_API_URL}/logs`,
      JSON.stringify(event)
    );
  }
}

export const logger = {
  loginSuccess: (meta?: Record<string, unknown>) =>
    emit(buildEvent("login_success", "LoginForm", meta)),
  loginFailure: (meta?: Record<string, unknown>) =>
    emit(buildEvent("login_failure", "LoginForm", meta)),
  logout: () =>
    emit(buildEvent("logout", "Header")),
  tokenRefreshFailure: (meta?: Record<string, unknown>) =>
    emit(buildEvent("token_refresh_failure", "AuthProvider", meta)),
  businessSwitch: (meta?: Record<string, unknown>) =>
    emit(buildEvent("business_switch", "BusinessSelector", meta)),
  receiptUploadInit: (meta?: Record<string, unknown>) =>
    emit(buildEvent("receipt_upload_init", "ReceiptUpload", meta)),
  receiptUploadFailure: (meta?: Record<string, unknown>) =>
    emit(buildEvent("receipt_upload_failure", "ReceiptUpload", meta)),
  receiptConfirm: (meta?: Record<string, unknown>) =>
    emit(buildEvent("receipt_confirm", "ReceiptUpload", meta)),
  ledgerEntryPost: (meta?: Record<string, unknown>) =>
    emit(buildEvent("ledger_entry_post", "LedgerView", meta)),
  ledgerReversal: (meta?: Record<string, unknown>) =>
    emit(buildEvent("ledger_reversal", "LedgerView", meta)),
  exportRequest: (meta?: Record<string, unknown>) =>
    emit(buildEvent("export_request", "LedgerView", meta)),
  rollbackRequest: (meta?: Record<string, unknown>) =>
    emit(buildEvent("rollback_request", "LedgerView", meta)),
  apiError: (status: number, message: string, component: string) =>
    emit(buildEvent("api_error", component, { status, message })),
};
