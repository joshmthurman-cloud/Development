"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (authLoading) return null;

  if (isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sb-bg)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/images/logo.svg"
            alt="Schema Books"
            width={200}
            height={50}
            priority
          />
        </div>

        {/* Login Card */}
        <div className="sb-card">
          <h1 className="text-xl font-semibold text-[var(--sb-text)] mb-1">
            Sign in to your account
          </h1>
          <p className="text-sm text-[var(--sb-muted)] mb-6">
            Enter your credentials to access your dashboard
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              error={error && !password ? " " : undefined}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            {error && (
              <div
                role="alert"
                className="text-sm text-[var(--sb-danger)] bg-[var(--sb-danger-bg)] px-3 py-2 rounded-[var(--sb-radius-input)]"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-xs text-center text-[var(--sb-muted)] mt-6">
          Secure multi-tenant bookkeeping platform
        </p>
      </div>
    </div>
  );
}
