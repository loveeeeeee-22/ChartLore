"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { UserSession } from "@/lib/types";
import { notifyStorageChange, STORAGE_KEYS } from "@/lib/storage";
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

function buildSession(id: string, email: string, fullName?: string | null): UserSession {
  return {
    id,
    email,
    fullName: fullName?.trim() || "",
  };
}

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.user);
  return raw ? (JSON.parse(raw) as UserSession) : null;
}

function storeSession(nextSession: UserSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (nextSession) {
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextSession));
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.user);
  }

  notifyStorageChange(STORAGE_KEYS.user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<UserSession | null>(() => readStoredUser());
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error("Failed to load auth session", error);
        setLoading(false);
        return;
      }

      if (data.session?.user) {
        const user = data.session.user;
        const nextSession = buildSession(
          user.id,
          user.email ?? "",
          user.user_metadata.full_name ?? user.user_metadata.fullName,
        );
        setSession(nextSession);
        storeSession(nextSession);
      } else {
        setSession(readStoredUser());
      }

      setLoading(false);
    };

    void syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextAuthSession) => {
      if (!mounted) {
        return;
      }

      if (nextAuthSession?.user) {
        const user = nextAuthSession.user;
        const nextSession = buildSession(
          user.id,
          user.email ?? "",
          user.user_metadata.full_name ?? user.user_metadata.fullName,
        );
        setSession(nextSession);
        storeSession(nextSession);
      } else {
        setSession(null);
        storeSession(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const supabase = getSupabaseBrowserClient();

        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { error: error.message };
          }

          if (data.user) {
            const nextSession = buildSession(
              data.user.id,
              data.user.email ?? email,
              data.user.user_metadata.full_name ?? data.user.user_metadata.fullName,
            );
            setSession(nextSession);
            storeSession(nextSession);
          }

          return {};
        }

        const fallbackSession = buildSession(
          "demo-user",
          email,
          email.split("@")[0]?.replace(/\./g, " "),
        );
        setSession(fallbackSession);
        storeSession(fallbackSession);
        return {};
      },
      async signUp(email, password, fullName) {
        const supabase = getSupabaseBrowserClient();

        if (supabase) {
          const emailRedirectTo =
            typeof window !== "undefined"
              ? `${window.location.origin}/sign-in?mode=sign-in&verified=1`
              : undefined;

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
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

          const nextSession = buildSession(
            data.user.id,
            data.user.email ?? email,
            data.user.user_metadata.full_name ?? fullName,
          );
          setSession(nextSession);
          storeSession(nextSession);
          return {};
        }

        const fallbackSession = buildSession("demo-user", email, fullName);
        setSession(fallbackSession);
        storeSession(fallbackSession);
        return {};
      },
      async signOut() {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
        setSession(null);
        storeSession(null);
      },
    }),
    [loading, session],
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
