"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, UserPlus } from "lucide-react";
import { Button, Card, FieldLabel, TextInput } from "@/components/common/primitives";
import { useAuth } from "@/components/providers/auth-provider";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [fullName, setFullName] = useState("Alex Rivera");
  const [email, setEmail] = useState("alex@chartlore.app");
  const [password, setPassword] = useState("demo-password");
  const [confirmPassword, setConfirmPassword] = useState("demo-password");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");

    if (mode === "sign-up" && password !== confirmPassword) {
      setPending(false);
      setError("Passwords do not match.");
      return;
    }

    const result =
      mode === "sign-in"
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if ("requiresConfirmation" in result && result.requiresConfirmation) {
      setNotice("Account created. Check your email to confirm your account before signing in.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-xl p-8">
        <p className="text-[11px] uppercase tracking-[0.34em] text-accent">ChartLore Access</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance">
          {mode === "sign-in" ? "Sign in to your trading journal" : "Create your ChartLore account"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          {mode === "sign-in"
            ? "If Supabase environment variables are not present, this screen falls back to a local demo session so the full product can still be explored end to end."
            : "Create a new account with your own details. When Supabase email confirmation is enabled, you'll be prompted to verify your email before signing in."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-full border border-border bg-card-soft p-1">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setError("");
              setNotice("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === "sign-in" ? "bg-accent text-slate-950" : "text-muted hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign-up");
              setError("");
              setNotice("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === "sign-up" ? "bg-accent text-slate-950" : "text-muted hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          {mode === "sign-up" ? (
            <div className="space-y-2">
              <FieldLabel>Full Name</FieldLabel>
              <TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
          ) : null}

          <div className="space-y-2">
            <FieldLabel>Email</FieldLabel>
            <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel>Password</FieldLabel>
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {mode === "sign-up" ? (
            <div className="space-y-2">
              <FieldLabel>Confirm Password</FieldLabel>
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[22px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4" />
                {error}
              </div>
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-[22px] border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              {notice}
            </div>
          ) : null}

          <Button type="submit" className="w-full py-3" disabled={pending}>
            {mode === "sign-in" ? <Lock className="mr-2 size-4" /> : <UserPlus className="mr-2 size-4" />}
            {pending
              ? mode === "sign-in"
                ? "Signing In..."
                : "Creating Account..."
              : mode === "sign-in"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
