import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Button({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  href?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400";
  const variants: Record<string, string> = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-900/10",
    secondary: "bg-ink-900 text-papyrus-50 hover:bg-ink-800",
    outline: "border border-ink-300 bg-transparent text-ink-800 hover:bg-papyrus-100 border-ink-200",
    ghost: "bg-transparent text-ink-700 hover:bg-papyrus-200",
    danger: "bg-error text-white hover:opacity-90",
    gold: "bg-gold-400 text-ink-900 hover:bg-gold-500 shadow-sm",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3.5 text-base",
  };
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {props.children as ReactNode}
      </Link>
    );
  }
  return <button className={cls} {...props} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200/60 bg-white shadow-[0_2px_18px_rgba(32,28,20,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "primary",
  className,
}: {
  children: ReactNode;
  tone?: "primary" | "gold" | "success" | "warning" | "error" | "neutral";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-50 text-primary-700 border-primary-200",
    gold: "bg-gold-50 text-gold-700 border-gold-200",
    success: "bg-green-50 text-[--color-success] border-green-200",
    warning: "bg-amber-50 text-[--color-warning] border-amber-200",
    error: "bg-red-50 text-[--color-error] border-red-200",
    neutral: "bg-ink-900/5 text-ink-600 border-ink-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink-700", className)}>{children}</label>;
}

export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "gold" }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/8">
      <div
        className={cn("h-full rounded-full transition-all", tone === "gold" ? "bg-gold-400" : "bg-primary-500")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-papyrus-100/50 px-6 py-14 text-center">
      {icon}
      <p className="text-base font-bold text-ink-800">{title}</p>
      {description && <p className="max-w-md text-sm text-ink-500">{description}</p>}
      {action}
    </div>
  );
}

export function Alert({
  tone = "primary",
  children,
}: {
  tone?: "primary" | "success" | "warning" | "error";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-50 text-primary-800 border-primary-200",
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-amber-50 text-amber-900 border-amber-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "right",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "right" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <span className="mb-3 inline-block rounded-full border border-gold-300 bg-gold-50 px-3 py-1 text-xs font-bold text-gold-700">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-ink-600">{description}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "primary" | "gold";
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-ink-500">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-bold", tone === "gold" ? "text-gold-600" : "text-primary-700")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </Card>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-ink-200/70", className)} />;
}
