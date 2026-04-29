"use client";

import { useState } from "react";
import { Link2, PlusCircle, Trash2 } from "lucide-react";
import { Badge, Button, Card, FieldLabel, Select, TextInput, TextArea } from "@/components/common/primitives";
import { PageHeader } from "@/components/common/page-header";
import { type AccountDraft, useTradeStore } from "@/components/providers/trade-store-provider";

export function SettingsView() {
  const { profile, accounts, updateProfile, addAccount, removeAccount } = useTradeStore();
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [country, setCountry] = useState(profile.country);
  const [phone, setPhone] = useState(profile.phone);
  const [city, setCity] = useState(profile.city);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [focus, setFocus] = useState(profile.focus);
  const [newAccount, setNewAccount] = useState<AccountDraft>({
    name: "",
    broker: "",
    type: "futures",
    balance: 0,
    currency: "USD",
  });

  const handleSaveProfile = () => {
    updateProfile({
      ...profile,
      fullName,
      email,
      country,
      phone,
      city,
      timezone,
      focus,
      initials: fullName
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
  };

  const handleCreateAccount = () => {
    if (!newAccount.name.trim() || !newAccount.broker.trim()) {
      return;
    }

    addAccount(newAccount);
    setNewAccount({
      name: "",
      broker: "",
      type: "futures",
      balance: 0,
      currency: "USD",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace, account, and future integrations"
        description="This section is ready for real auth and broker wiring later, but already gives the product a coherent account-management surface."
        actions={
          <>
            <a
              href="#broker-roadmap"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card-soft px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent/25"
            >
              <Link2 className="size-4" />
              Link Broker
            </a>
            <a
              href="#create-account"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-accent-strong"
            >
              <PlusCircle className="size-4" />
              Create Account
            </a>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Trader Profile</p>
              <h3 className="mt-2 text-2xl font-semibold">Identity and bio</h3>
            </div>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>Full Name</FieldLabel>
              <TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Email</FieldLabel>
              <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Country</FieldLabel>
              <TextInput value={country} onChange={(event) => setCountry(event.target.value)} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Phone Number</FieldLabel>
              <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div className="space-y-2">
              <FieldLabel>City</FieldLabel>
              <TextInput value={city} onChange={(event) => setCity(event.target.value)} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Timezone</FieldLabel>
              <TextInput value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel>Trading Focus</FieldLabel>
              <TextArea rows={5} value={focus} onChange={(event) => setFocus(event.target.value)} />
            </div>
          </div>
        </Card>
        <Card id="broker-roadmap">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Broker Roadmap</p>
          <h3 className="mt-2 text-2xl font-semibold">Integration status</h3>
          <div className="mt-6 space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-[22px] border border-border bg-card-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{account.name}</p>
                    <p className="mt-1 text-xs text-muted">{account.broker}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">Manual Sync</Badge>
                    <button
                      type="button"
                      onClick={() => removeAccount(account.id)}
                      className="inline-flex items-center justify-center rounded-full border border-danger/20 bg-danger-soft p-2 text-danger transition hover:border-danger/35"
                      aria-label={`Delete ${account.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card id="create-account">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Create Account</p>
            <h3 className="mt-2 text-2xl font-semibold">Add a new journal account</h3>
          </div>
          <Button onClick={handleCreateAccount}>Create Account</Button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2 xl:col-span-2">
            <FieldLabel>Account Name</FieldLabel>
            <TextInput
              value={newAccount.name}
              onChange={(event) =>
                setNewAccount((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 xl:col-span-1">
            <FieldLabel>Broker</FieldLabel>
            <TextInput
              value={newAccount.broker}
              onChange={(event) =>
                setNewAccount((current) => ({ ...current, broker: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 xl:col-span-1">
            <FieldLabel>Account Type</FieldLabel>
            <Select
              value={newAccount.type}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  type: event.target.value as AccountDraft["type"],
                }))
              }
            >
              <option value="futures">Futures</option>
              <option value="equities">Equities</option>
              <option value="crypto">Crypto</option>
              <option value="forex">Forex</option>
            </Select>
          </div>
          <div className="space-y-2 xl:col-span-1">
            <FieldLabel>Starting Balance</FieldLabel>
            <TextInput
              type="number"
              step="0.01"
              value={newAccount.balance}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  balance: Number(event.target.value),
                }))
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
