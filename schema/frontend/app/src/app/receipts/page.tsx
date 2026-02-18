"use client";

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { logger } from "@/lib/logger";

interface UploadedReceipt {
  id: string;
  filename: string;
  uploadedAt: string;
  status: "pending" | "confirmed" | "rejected";
  previewUrl?: string;
}

export default function ReceiptsPage() {
  const { activeBusiness } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [recentUploads, setRecentUploads] = useState<UploadedReceipt[]>([]);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!activeBusiness || selectedFiles.length === 0) return;

    logger.receiptUploadInit({
      businessId: activeBusiness.id,
      fileCount: selectedFiles.length,
    });

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("receipts", file));

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/businesses/${activeBusiness.id}/receipts`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      const data = await res.json();
      setRecentUploads((prev) => [...data.receipts, ...prev]);
      setSelectedFiles([]);
      setUploadResult(`${data.receipts.length} receipt(s) uploaded successfully`);
      logger.receiptConfirm({
        businessId: activeBusiness.id,
        count: data.receipts.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadResult(message);
      logger.receiptUploadFailure({
        businessId: activeBusiness.id,
        error: message,
      });
    } finally {
      setIsUploading(false);
    }
  }, [activeBusiness, selectedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--sb-text)]">Receipts</h1>
        <p className="text-sm text-[var(--sb-muted)] mt-1">
          Upload and manage receipt images
        </p>
      </div>

      {/* Upload Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Click or drag files to upload receipts"
        className={`
          sb-card cursor-pointer text-center py-12 border-2 border-dashed transition-colors duration-150
          ${isDragOver
            ? "border-[var(--sb-accent)] bg-[color-mix(in_srgb,var(--sb-accent)_5%,transparent)]"
            : "border-[var(--sb-border)] hover:border-[var(--sb-accent)]"
          }
        `.trim()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          aria-hidden="true"
        />

        <svg
          className="mx-auto mb-4 text-[var(--sb-muted)]"
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 30l10-10 10 10M24 20v18M8 38h32"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M40 28V10a2 2 0 00-2-2H10a2 2 0 00-2 2v18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <p className="text-sm font-medium text-[var(--sb-text)]">
          Drag & drop receipts here, or click to browse
        </p>
        <p className="text-xs text-[var(--sb-muted)] mt-1">
          Supports images and PDF files
        </p>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="sb-card">
          <h2 className="text-sm font-semibold text-[var(--sb-text)] mb-3">
            Selected Files ({selectedFiles.length})
          </h2>
          <ul className="space-y-2" role="list">
            {selectedFiles.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between py-2 px-3 rounded-[var(--sb-radius-input)] bg-[var(--sb-surface-alt)]"
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 2h5l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <span className="text-sm text-[var(--sb-text)]">{file.name}</span>
                  <span className="text-xs text-[var(--sb-muted)]">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  aria-label={`Remove ${file.name}`}
                  className="text-[var(--sb-muted)] hover:text-[var(--sb-danger)] transition-colors p-1"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleUpload} isLoading={isUploading}>
              Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
            </Button>
            <Button variant="ghost" onClick={() => setSelectedFiles([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div
          role="alert"
          className={`sb-card text-sm ${
            uploadResult.includes("success")
              ? "text-[var(--sb-success)] bg-[var(--sb-success-bg)]"
              : "text-[var(--sb-danger)] bg-[var(--sb-danger-bg)]"
          }`}
        >
          {uploadResult}
        </div>
      )}

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <div className="sb-card">
          <h2 className="text-sm font-semibold text-[var(--sb-text)] mb-3">
            Recent Uploads
          </h2>
          <ul className="space-y-2" role="list">
            {recentUploads.map((receipt) => (
              <li
                key={receipt.id}
                className="flex items-center justify-between py-2 px-3 rounded-[var(--sb-radius-input)] border border-[var(--sb-border)]"
              >
                <span className="text-sm text-[var(--sb-text)]">
                  {receipt.filename}
                </span>
                <Badge
                  variant={
                    receipt.status === "confirmed"
                      ? "success"
                      : receipt.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {receipt.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
