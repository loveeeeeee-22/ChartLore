"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock } from "lucide-react";
import { Button, Card, FieldLabel, TextInput } from "@/components/common/primitives";
import { useAuth } from "@/components/providers/auth-provider";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("alex@chartlore.app");
  const [password, setPassword] = useState("demo-password");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await signIn(email, password);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-xl p-8">
        <p className="text-[11px] uppercase tracking-[0.34em] text-accent">ChartLore Access</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance">
          Sign in to your trading journal
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          If Supabase environment variables are not present, this screen falls back to a local
          demo session so the full product can still be explored end to end.
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
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

          {error ? (
            <div className="rounded-[22px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4" />
                {error}
              </div>
            </div>
          ) : null}

          <Button type="submit" className="w-full py-3" disabled={pending}>
            <Lock className="mr-2 size-4" />
            {pending ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
