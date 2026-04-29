"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronLeft, Menu, PanelLeftClose, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useTradeStore } from "@/components/providers/trade-store-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", short: "DB" },
  { href: "/reports", label: "Reports", short: "RP" },
  { href: "/strategy", label: "Strategy", short: "ST" },
  { href: "/analytics", label: "Analytics", short: "AN" },
  { href: "/settings", label: "Settings", short: "SE" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { session, signOut } = useAuth();
  const { accounts } = useTradeStore();
  const primaryAccount = accounts[0];

  return (
    <div className="flex min-h-screen bg-transparent">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-sidebar px-5 py-6 transition-[width,padding] duration-200 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-[108px] px-3" : "w-[280px]",
        )}
      >
        <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "gap-3")}>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-slate-950">
            CL
          </div>
          <div className={cn(sidebarCollapsed && "hidden")}>
            <p className="text-xl font-semibold tracking-tight text-accent">ChartLore</p>
            <p className="text-[10px] uppercase tracking-[0.38em] text-sidebar-foreground">
              Institutional Grade
            </p>
          </div>
        </div>

        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  sidebarCollapsed && "justify-center px-0",
                  active
                    ? "border-accent/25 bg-accent-soft text-accent"
                    : "border-transparent text-sidebar-foreground hover:border-border hover:bg-white/4 hover:text-foreground",
                )}
              >
                <span className={cn(sidebarCollapsed && "hidden")}>{item.label}</span>
                <span
                  className={cn(
                    "rounded-full border border-current/15 px-2 py-1 text-[10px] uppercase tracking-[0.2em]",
                    sidebarCollapsed && "px-3 py-2 text-xs",
                  )}
                >
                  {item.short}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "space-y-4 rounded-[24px] border border-border bg-card-soft p-4",
            sidebarCollapsed && "hidden",
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted">Primary Account</p>
          <div className="space-y-1">
            <p className="text-base font-semibold">{primaryAccount.name}</p>
            <p className="text-sm text-muted">{primaryAccount.broker}</p>
          </div>
          <p className="font-mono text-xl text-success">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: primaryAccount.currency,
            }).format(primaryAccount.balance)}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex size-11 items-center justify-center rounded-2xl border border-border bg-card-soft text-muted lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="hidden size-11 items-center justify-center rounded-2xl border border-border bg-card-soft text-muted transition hover:text-foreground lg:flex"
            >
              {sidebarCollapsed ? <ChevronLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-muted">
                    {pathname.replace("/", "") || "dashboard"}
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-balance">
                    Build edge with structured review
                  </h1>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 rounded-full border border-border bg-card-soft px-4 py-3 text-sm text-muted">
                    <span className="block size-2 rounded-full bg-success shadow-[0_0_12px_rgba(80,227,164,0.7)]" />
                    {session?.email ?? "demo@chartlore.app"}
                  </div>
                  <Link
                    href="/trades/new"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-strong"
                  >
                    <Plus className="size-4" />
                    Log Trade
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="rounded-full border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-accent/35 hover:text-foreground"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {mobileOpen ? (
          <div className="border-b border-border bg-sidebar px-4 py-4 lg:hidden">
            <nav className="flex gap-2 overflow-x-auto hide-scrollbar">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-4 py-2 text-sm",
                      active
                        ? "border-accent/25 bg-accent-soft text-accent"
                        : "border-border text-sidebar-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
