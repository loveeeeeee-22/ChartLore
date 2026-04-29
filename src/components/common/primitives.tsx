"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: ReactNode;
}) {
  return (
    <section className={cn("panel rounded-[28px] p-5", className)} {...props}>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "border-border bg-white/5 text-muted",
    accent: "border-accent/20 bg-accent-soft text-accent",
    success: "border-success/20 bg-success-soft text-success",
    warning: "border-warning/20 bg-warning/10 text-warning",
    danger: "border-danger/20 bg-danger-soft text-danger",
  };

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-accent text-slate-950 hover:bg-accent-strong",
    secondary: "border border-border bg-card-soft text-foreground hover:border-accent/25",
    ghost: "text-muted hover:text-foreground",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabel({
  children,
}: {
  children: ReactNode;
}) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">{children}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-foreground outline-none ring-0 transition placeholder:text-muted-foreground focus:border-accent/35",
        props.className,
      )}
    />
  );
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/35",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-2xl border border-border bg-input px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/35",
        props.className,
      )}
    />
  );
}
