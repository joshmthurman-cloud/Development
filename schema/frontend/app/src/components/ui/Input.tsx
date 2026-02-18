"use client";

import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--sb-text-secondary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`
            w-full px-3 py-2 text-sm
            bg-[var(--sb-surface)] text-[var(--sb-text)]
            border rounded-[var(--sb-radius-input)]
            transition-colors duration-150
            placeholder:text-[var(--sb-muted)]
            ${error
              ? "border-[var(--sb-danger)] focus:ring-[var(--sb-danger)]"
              : "border-[var(--sb-border)] focus:border-[var(--sb-accent)] focus:ring-[var(--sb-accent)]"
            }
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${className}
          `.trim()}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-[var(--sb-danger)]"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
