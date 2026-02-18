"use client";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--sb-surface-alt)] text-[var(--sb-text-secondary)]",
  success: "bg-[var(--sb-success-bg)] text-[var(--sb-success)]",
  danger: "bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]",
  warning: "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]",
  info: "bg-[var(--sb-info-bg)] text-[var(--sb-info)]",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        text-xs font-medium
        rounded-[var(--sb-radius-pill)]
        ${variantStyles[variant]}
        ${className}
      `.trim()}
    >
      {children}
    </span>
  );
}
