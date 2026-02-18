"use client";

import { forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: SelectOption[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, id, className = "", ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-[var(--sb-text-secondary)]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full px-3 py-2 text-sm
            bg-[var(--sb-surface)] text-[var(--sb-text)]
            border border-[var(--sb-border)]
            rounded-[var(--sb-radius-input)]
            focus:outline-none focus:ring-2 focus:ring-[var(--sb-accent)] focus:ring-offset-0
            transition-colors duration-150
            ${className}
          `.trim()}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";
export { Select };
export type { SelectOption };
