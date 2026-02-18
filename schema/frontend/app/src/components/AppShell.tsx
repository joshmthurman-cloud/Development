"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sb-bg)]">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-[var(--sb-accent)]"
            viewBox="0 0 24 24"
            fill="none"
            aria-label="Loading"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <p className="text-sm text-[var(--sb-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--sb-bg)]">
      <Sidebar />
      <Header />
      <main
        className="pt-[var(--sb-header-height)]"
        style={{ marginLeft: "var(--sb-sidebar-width)" }}
      >
        <div className="p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
