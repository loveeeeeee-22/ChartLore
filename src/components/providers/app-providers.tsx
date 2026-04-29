"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TradeStoreProvider } from "@/components/providers/trade-store-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TradeStoreProvider>{children}</TradeStoreProvider>
    </AuthProvider>
  );
}
