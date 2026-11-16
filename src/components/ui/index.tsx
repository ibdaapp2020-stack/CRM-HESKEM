import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line/80 bg-navy-2/80 shadow-[0_0_0_1px_rgba(34,211,238,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variant === "primary" &&
          "bg-cyan text-navy hover:bg-cyan-2 shadow-[0_0_24px_rgba(34,211,238,0.18)]",
        variant === "ghost" && "bg-transparent text-ink hover:bg-navy-3",
        variant === "outline" &&
          "border border-line bg-navy-3/60 text-ink hover:border-cyan/50",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-500",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-cyan/70",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line bg-navy px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-cyan/70",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("mb-1 block text-xs text-muted", className)}>
      {children}
    </label>
  );
}

export function Badge({
  children,
  tone = "cyan",
}: {
  children: React.ReactNode;
  tone?: "cyan" | "amber" | "rose" | "slate" | "green";
}) {
  const tones = {
    cyan: "bg-cyan/15 text-cyan-2 border-cyan/30",
    amber: "bg-amber-400/15 text-amber-200 border-amber-300/30",
    rose: "bg-rose-500/15 text-rose-200 border-rose-400/30",
    slate: "bg-white/5 text-muted border-white/10",
    green: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
