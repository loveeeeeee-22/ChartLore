"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { UserSession } from "@/lib/types";
import { notifyStorageChange, STORAGE_EVENT, STORAGE_KEYS } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface AuthContextValue {
  session: UserSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error?: string; requiresConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let cachedUserRaw: null | string = null;
let cachedUserValue: UserSession | null = null;

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.user);
  if (raw === cachedUserRaw) {
    return cachedUserValue;
  }

  cachedUserRaw = raw;
  cachedUserValue = raw ? (JSON.parse(raw) as UserSession) : null;
  return cachedUserValue;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handler = () => callback();
      const customHandler = (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string }>).detail;
        if (!detail?.key || detail.key === STORAGE_KEYS.user) {
          callback();
        }
      };

      window.addEventListener("storage", handler);
      window.addEventListener(STORAGE_EVENT, customHandler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(STORAGE_EVENT, customHandler);
      };
    },
    readStoredUser,
    () => null,
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading: false,
      async signIn(email, _password) {
        const supabase = getSupabaseBrowserClient();

        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: _password,
          });

          if (error) {
            return { error: error.message };
          }

          const nextSession = {
            id: data.user.id,
            email: data.user.email ?? email,
            fullName: data.user.user_metadata.full_name ?? "ChartLore Trader",
          };
          window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextSession));
          notifyStorageChange(STORAGE_KEYS.user);
          return {};
        }

        const fallbackSession = {
          id: "demo-user",
          email,
          fullName: email.split("@")[0]?.replace(/\./g, " ") || "ChartLore Trader",
        };
        window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(fallbackSession));
        notifyStorageChange(STORAGE_KEYS.user);
        return {};
      },
      async signUp(email, password, fullName) {
        const supabase = getSupabaseBrowserClient();

        if (supabase) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          });

          if (error) {
            return { error: error.message };
          }

          if (!data.session || !data.user) {
            return { requiresConfirmation: true };
          }

          const nextSession = {
            id: data.user.id,
            email: data.user.email ?? email,
            fullName: data.user.user_metadata.full_name ?? fullName,
          };
          window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextSession));
          notifyStorageChange(STORAGE_KEYS.user);
          return {};
        }

        const fallbackSession = {
          id: "demo-user",
          email,
          fullName: fullName.trim() || email.split("@")[0]?.replace(/\./g, " ") || "ChartLore Trader",
        };
        window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(fallbackSession));
        notifyStorageChange(STORAGE_KEYS.user);
        return {};
      },
      async signOut() {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
        window.localStorage.removeItem(STORAGE_KEYS.user);
        notifyStorageChange(STORAGE_KEYS.user);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
