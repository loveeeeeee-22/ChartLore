"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="panel rounded-[28px] px-8 py-10 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-muted">Loading Workspace</p>
          <h1 className="mt-3 text-2xl font-semibold text-balance">Preparing your trading desk</h1>
        </div>
      </div>
    );
  }

  if (session || pathname === "/sign-in") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="panel max-w-xl rounded-[28px] border border-accent/25 px-8 py-10">
        <div className="flex items-center gap-3 text-accent">
          <div className="rounded-2xl bg-accent-soft p-3">
            <ShieldAlert className="size-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]">Secure Journal Access</p>
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-balance">
          Sign in to unlock the full ChartLore workspace
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          This starter uses a demo auth flow until Supabase environment variables are connected.
          Once they are present, the same sign-in screen will switch to real email/password auth.
        </p>
        <Link
          href="/sign-in"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-accent-strong"
        >
          <Lock className="size-4" />
          Continue to Sign In
        </Link>
      </div>
    </div>
  );
}
