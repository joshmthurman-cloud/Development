"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { TransactionResult, Failure } from "./types";
import styles from "./page.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TransactionResult[] | null>(null);
  const [expandedTrx, setExpandedTrx] = useState<Set<string>>(new Set());
  const [selectedFailure, setSelectedFailure] = useState<{
    rowKey: string;
    failureIndex: number;
    failure: Failure;
  } | null>(null);
  const [cellDropdown, setCellDropdown] = useState<{
    trxPk: string;
    column: string;
    anchorRect: { top: number; left: number; width: number; cellTop: number; cellBottom: number };
  } | null>(null);
  const [yellowCellDropdown, setYellowCellDropdown] = useState<{
    rowKey: string;
    column: string;
    anchorRect: { top: number; left: number; width: number; cellTop: number; cellBottom: number };
    message: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cellDropdownRef = useRef<HTMLDivElement>(null);
  const yellowCellDropdownRef = useRef<HTMLDivElement>(null);

  const acceptFile = useCallback((f: File | null) => {
    if (f && !f.name.toLowerCase().endsWith(".xlsx")) {
      setError("Please use an .xlsx file.");
      return;
    }
    setFile(f ?? null);
    setError(null);
    setResults(null);
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0] ?? null);
  }, [acceptFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile]
  );

  const onDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const submit = useCallback(async () => {
    if (!file) {
      setError("Please select an .xlsx file.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setExpandedTrx(new Set());
    setSelectedFailure(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || res.statusText || `HTTP ${res.status}`);
      }
      const data: TransactionResult[] = await res.json();
      setResults(data);
    } catch (e) {
      const isNetworkError =
        e instanceof TypeError ||
        (e instanceof Error && (e.message === "Failed to fetch" || e.message.includes("NetworkError")));
      const message = isNetworkError
        ? "Could not reach the analyzer. Make sure the backend is running and that NEXT_PUBLIC_API_URL points to it (e.g. http://10.200.0.235:8900 on the server)."
        : e instanceof Error
          ? e.message
          : "Upload failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const toggleRow = useCallback((trxPk: string) => {
    setExpandedTrx((prev) => {
      const next = new Set(prev);
      if (next.has(trxPk)) next.delete(trxPk);
      else next.add(trxPk);
      return next;
    });
  }, []);

  const onErrorCellClick = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>, row: TransactionResult, column: string) => {
      e.stopPropagation();
      setYellowCellDropdown(null);
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      setCellDropdown((prev) =>
        prev?.trxPk === row.trx_pk && prev?.column === column
          ? null
          : {
              trxPk: row.trx_pk,
              column,
              anchorRect: {
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
                cellTop: rect.top,
                cellBottom: rect.bottom,
              },
            }
      );
    },
    []
  );

  const YELLOW_DEFAULT_MESSAGE = "Computed validation: Line Item Total = (Quantity * Unit Cost) - Discount per Line Item";

  const onYellowCellClick = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>, row: TransactionResult, rowIndex: number, column: string) => {
      e.stopPropagation();
      setCellDropdown(null);
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const rowKey = `row-${rowIndex}`;
      const message = row.source_amount_message ?? YELLOW_DEFAULT_MESSAGE;
      setYellowCellDropdown((prev) =>
        prev?.rowKey === rowKey && prev?.column === column
          ? null
          : {
              rowKey,
              column,
              anchorRect: {
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
                cellTop: rect.top,
                cellBottom: rect.bottom,
              },
              message,
            }
      );
    },
    []
  );

  useEffect(() => {
    if (!cellDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cellDropdownRef.current?.contains(target)) return;
      setCellDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cellDropdown]);

  useEffect(() => {
    if (!yellowCellDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (yellowCellDropdownRef.current?.contains(target)) return;
      setYellowCellDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [yellowCellDropdown]);

  const openCellDropdownRow = results?.find((r) => r.trx_pk === cellDropdown?.trxPk);
  const openCellFailures =
    openCellDropdownRow?.failures.filter(
      (f) => f.content_column === cellDropdown?.column
    ) ?? [];

  const goHome = useCallback(() => {
    setResults(null);
    setFile(null);
    setError(null);
    setCellDropdown(null);
    setYellowCellDropdown(null);
    setExpandedTrx(new Set());
    setSelectedFailure(null);
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          <button
            type="button"
            onClick={goHome}
            className={styles.titleButton}
            title="Back to upload a new file"
          >
            CEDP Error Analyzer
          </button>
        </h1>
        {!results && (
          <div className={styles.uploadSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={onFileChange}
              className={styles.fileInput}
              id="xlsx-upload"
            />
            <div
              className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""} ${file ? styles.dropZoneHasFile : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={onDropZoneClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDropZoneClick();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Select or drop .xlsx file"
            >
              {file ? (
                <span className={styles.dropZoneFile}>{file.name}</span>
              ) : (
                <>
                  <span className={styles.dropZoneText}>Drag and drop your file here</span>
                  <span className={styles.dropZoneSub}>or click to select</span>
                </>
              )}
            </div>
            <div className={styles.analyzeWrap}>
              <button
                type="button"
                onClick={submit}
                disabled={loading || !file}
                className={styles.submitBtn}
              >
                {loading ? "Analyzing…" : "Analyze"}
              </button>
            </div>
          </div>
        )}
        {error && <p className={styles.error}>{error}</p>}
        {results && results.length > 0 && (() => {
          const displayCols = results[0].column_order ?? Object.keys(results[0].row_data);
          const colSpan = 1 + displayCols.length + 2;
          return (
          <div className={styles.results}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Merchant Name</th>
                  {displayCols.map((col) => (
                    <th key={col} title={col}>{col.replace(/\n/g, " ")}</th>
                  ))}
                  <th>Failure Count</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    <tr>
                      <td
                        className={
                          row.highlight_columns.includes(row.merchant_name_column)
                            ? styles.cellError
                            : (row.yellow_columns ?? []).includes(row.merchant_name_column)
                              ? styles.cellWarning
                              : undefined
                        }
                        onClick={
                          row.highlight_columns.includes(row.merchant_name_column)
                            ? (e) => onErrorCellClick(e, row, row.merchant_name_column)
                            : (row.yellow_columns ?? []).includes(row.merchant_name_column)
                              ? (e) => onYellowCellClick(e, row, rowIndex, row.merchant_name_column)
                              : undefined
                        }
                        role={
                          row.highlight_columns.includes(row.merchant_name_column) ||
                          (row.yellow_columns ?? []).includes(row.merchant_name_column)
                            ? "button"
                            : undefined
                        }
                        title={
                          row.highlight_columns.includes(row.merchant_name_column)
                            ? "Click for failure details"
                            : (row.yellow_columns ?? []).includes(row.merchant_name_column)
                              ? "Click for validation details"
                              : undefined
                        }
                      >
                        {row.merchant_name}
                      </td>
                      {displayCols.map((col) => {
                        const isError = row.highlight_columns.includes(col);
                        const isWarning = !isError && (row.yellow_columns ?? []).includes(col);
                        return (
                          <td
                            key={col}
                            className={isError ? styles.cellError : isWarning ? styles.cellWarning : undefined}
                            onClick={
                              isError
                                ? (e) => onErrorCellClick(e, row, col)
                                : isWarning
                                  ? (e) => onYellowCellClick(e, row, rowIndex, col)
                                  : undefined
                            }
                            role={isError || isWarning ? "button" : undefined}
                            title={
                              isError
                                ? "Click for failure details"
                                : isWarning
                                  ? "Click for validation details"
                                  : undefined
                            }
                          >
                            {row.row_data[col] ?? ""}
                          </td>
                        );
                      })}
                      <td>{row.failures.length}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleRow(`row-${rowIndex}`)}
                          className={styles.expandBtn}
                          aria-expanded={expandedTrx.has(`row-${rowIndex}`)}
                        >
                          {expandedTrx.has(`row-${rowIndex}`) ? "▼" : "▶"}
                        </button>
                      </td>
                    </tr>
                    {expandedTrx.has(`row-${rowIndex}`) && (
                      <tr key={`row-${rowIndex}-detail`}>
                        <td colSpan={colSpan} className={styles.accordionCell}>
                          <div className={styles.accordion}>
                            {row.source_amount_message && (
                              <div className={styles.sourceAmountMessage}>
                                {row.source_amount_message}
                              </div>
                            )}
                            {selectedFailure?.rowKey === `row-${rowIndex}` &&
                              selectedFailure.failure != null && (
                                <div className={styles.highlightPanel}>
                                  <strong>Mapped column:</strong>{" "}
                                  {selectedFailure.failure.content_column
                                    ? selectedFailure.failure.content_column
                                    : "Field mapping not set"}
                                  {selectedFailure.failure.transaction_value !=
                                    null && (
                                    <>
                                      {" "}
                                      <strong>Value:</strong>{" "}
                                      {selectedFailure.failure.transaction_value}
                                    </>
                                  )}
                                </div>
                              )}
                            <ul className={styles.failureList}>
                              {row.failures.map((f, i) => (
                                <li
                                  key={`${row.trx_pk}-${f.error_code}-${i}`}
                                  className={
                                    selectedFailure?.rowKey === `row-${rowIndex}` &&
                                    selectedFailure?.failureIndex === i
                                      ? styles.failureItemSelected
                                      : styles.failureItem
                                  }
                                  onClick={() =>
                                    setSelectedFailure({
                                      rowKey: `row-${rowIndex}`,
                                      failureIndex: i,
                                      failure: f,
                                    })
                                  }
                                >
                                  <strong>{f.error_code}</strong>
                                  <div className={styles.failureMeta}>
                                    {f.field_name && (
                                      <span>Field: {f.field_name}</span>
                                    )}
                                    <span>
                                      {f.content_column
                                        ? f.content_column
                                        : "Field mapping not set"}
                                    </span>
                                  </div>
                                  {f.description && (
                                    <p className={styles.failureDesc}>
                                      {f.description}
                                    </p>
                                  )}
                                  {f.notes && (
                                    <p className={styles.failureNotes}>
                                      {f.notes}
                                    </p>
                                  )}
                                  <div className={styles.failureAttrs}>
                                    {[f.type, f.size, f.mco].filter(Boolean).length > 0 && (
                                      <span>
                                        Type: {f.type} / Size: {f.size} / M/C/O:{" "}
                                        {f.mco}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          );
        })()}
        {cellDropdown && (() => {
          const r = cellDropdown.anchorRect;
          const spaceBelow = typeof window !== "undefined" ? window.innerHeight - r.cellBottom - 24 : 400;
          const spaceAbove = typeof window !== "undefined" ? r.cellTop - 24 : 400;
          const showAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
          const maxH = showAbove ? spaceAbove : Math.min(400, spaceBelow);
          return (
          <div
            ref={cellDropdownRef}
            className={styles.cellDropdown}
            style={{
              position: "fixed",
              ...(showAbove
                ? { bottom: typeof window !== "undefined" ? window.innerHeight - r.cellTop + 8 : undefined, top: "auto" }
                : { top: r.top + 4 }
              ),
              left: r.left,
              minWidth: Math.max(r.width, 320),
              maxWidth: 480,
              maxHeight: maxH > 0 ? maxH : 400,
            }}
          >
            <div className={styles.cellDropdownTitle}>
              Why this failed
            </div>
            <div className={styles.cellDropdownColumn}>
              {cellDropdown.column.replace(/\n/g, " ")}
            </div>
            <ul className={styles.cellDropdownList}>
              {openCellFailures.map((f, i) => (
                <li key={`${cellDropdown.trxPk}-${f.error_code}-${i}`} className={styles.cellDropdownItem}>
                  <strong>{f.error_code}</strong>
                  {f.field_name && (
                    <div className={styles.cellDropdownMeta}>Field: {f.field_name}</div>
                  )}
                  {f.description && (
                    <p className={styles.cellDropdownDesc}>{f.description}</p>
                  )}
                  {f.notes && (
                    <p className={styles.cellDropdownNotes}>{f.notes}</p>
                  )}
                  {[f.type, f.size, f.mco].some(Boolean) && (
                    <div className={styles.cellDropdownAttrs}>
                      Type: {f.type} / Size: {f.size} / M/C/O: {f.mco}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          );
        })()}
        {yellowCellDropdown && (() => {
          const r = yellowCellDropdown.anchorRect;
          const spaceBelow = typeof window !== "undefined" ? window.innerHeight - r.cellBottom - 24 : 400;
          const spaceAbove = typeof window !== "undefined" ? r.cellTop - 24 : 400;
          const showAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
          return (
          <div
            ref={yellowCellDropdownRef}
            className={styles.yellowCellDropdown}
            style={{
              position: "fixed",
              ...(showAbove
                ? { bottom: typeof window !== "undefined" ? window.innerHeight - r.cellTop + 8 : undefined, top: "auto" }
                : { top: r.top + 4 }
              ),
              left: r.left,
              minWidth: Math.max(r.width, 320),
              maxWidth: 480,
            }}
          >
            <div className={styles.yellowCellDropdownTitle}>
              Validation
            </div>
            <p className={styles.yellowCellDropdownMessage}>
              {yellowCellDropdown.message}
            </p>
          </div>
          );
        })()}
      </main>
    </div>
  );
}
