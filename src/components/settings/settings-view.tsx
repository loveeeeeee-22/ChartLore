"use client";

import { useState } from "react";
import { Link2, PlusCircle, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  FieldLabel,
  Select,
  TextInput,
  TextArea,
} from "@/components/common/primitives";
import { PageHeader } from "@/components/common/page-header";
import { type AccountDraft, useTradeStore } from "@/components/providers/trade-store-provider";
import { parseMT5Report, type ParsedTrade } from "@/lib/mt5-parser";
import type { BrokerConnection } from "@/lib/types";

type BrokerDraft = {
  broker: BrokerConnection["broker"];
  label: string;
  apiKey: string;
  apiSecret: string;
  accountId: string;
  csvFile: File | null;
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function toKeyMap(headers: string[]) {
  return headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
}

function findColumnIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
}

function toIsoDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function deriveMarket(symbol: string) {
  const normalized = symbol.toUpperCase();
  if (normalized.includes("XAU") || normalized.includes("GOLD")) {
    return "Commodities";
  }
  if (normalized.includes("BTC") || normalized.includes("ETH")) {
    return "Crypto";
  }
  return "Forex";
}

function readFileAsText(file: File, encoding?: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read import file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    if (encoding) {
      reader.readAsText(file, encoding);
      return;
    }
    reader.readAsText(file);
  });
}

function toBrokerTone(status: BrokerConnection["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "error":
      return "danger";
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}

export function SettingsView() {
  const {
    profile,
    accounts,
    brokerConnections,
    strategies,
    saveTrade,
    updateProfile,
    addAccount,
    addBrokerConnection,
    removeBrokerConnection,
    syncBrokerConnection,
  } = useTradeStore();
  const [draftProfile, setDraftProfile] = useState<Partial<typeof profile>>({});
  const [showBrokerPanel, setShowBrokerPanel] = useState(false);
  const [brokerDraft, setBrokerDraft] = useState<BrokerDraft>({
    broker: "alpaca",
    label: "",
    apiKey: "",
    apiSecret: "",
    accountId: "",
    csvFile: null,
  });
  const [newAccount, setNewAccount] = useState<AccountDraft>({
    name: "",
    broker: "",
    type: "futures",
    balance: 0,
    currency: "USD",
  });
  const [brokerNotice, setBrokerNotice] = useState("");
  const [brokerError, setBrokerError] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [parsedMt5Trades, setParsedMt5Trades] = useState<ParsedTrade[]>([]);
  const [mt5Preview, setMt5Preview] = useState("");

  const handleSaveProfile = async () => {
    const fullName = draftProfile.fullName ?? profile.fullName;
    await updateProfile({
      ...profile,
      fullName,
      email: draftProfile.email ?? profile.email,
      country: draftProfile.country ?? profile.country,
      phone: draftProfile.phone ?? profile.phone,
      city: draftProfile.city ?? profile.city,
      timezone: draftProfile.timezone ?? profile.timezone,
      focus: draftProfile.focus ?? profile.focus,
      initials: fullName
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
    setDraftProfile({});
  };

  const handleCreateAccount = async () => {
    if (!newAccount.name.trim() || !newAccount.broker.trim()) {
      return;
    }

    await addAccount(newAccount);
    setNewAccount({
      name: "",
      broker: "",
      type: "futures",
      balance: 0,
      currency: "USD",
    });
  };

  const importCsvTrades = async (file: File) => {
    if (!accounts[0]?.id || !strategies[0]?.id) {
      throw new Error("Create at least one ChartLore account before importing CSV trades.");
    }

    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      throw new Error("CSV file is empty or missing trade rows.");
    }

    const headers = toKeyMap(splitCsvLine(rows[0]));
    const symbolIndex = findColumnIndex(headers, ["symbol", "ticker", "instrument"]);
    const sideIndex = findColumnIndex(headers, ["side", "direction"]);
    const qtyIndex = findColumnIndex(headers, ["qty", "quantity", "size", "units"]);
    const entryIndex = findColumnIndex(headers, ["entry"]);
    const exitIndex = findColumnIndex(headers, ["exit", "close price"]);
    const openTimeIndex = findColumnIndex(headers, ["open time", "opened", "entry time"]);
    const closeTimeIndex = findColumnIndex(headers, ["close time", "closed", "exit time"]);

    if (
      symbolIndex < 0 ||
      sideIndex < 0 ||
      qtyIndex < 0 ||
      entryIndex < 0 ||
      exitIndex < 0 ||
      openTimeIndex < 0 ||
      closeTimeIndex < 0
    ) {
      throw new Error("CSV columns must include Symbol, Side/Direction, Qty, Entry, Exit, Open Time, and Close Time.");
    }

    let imported = 0;

    for (const row of rows.slice(1)) {
      const cells = splitCsvLine(row);
      if (cells.length === 0) {
        continue;
      }

      const symbol = cells[symbolIndex]?.trim();
      if (!symbol) {
        continue;
      }

      const sideRaw = cells[sideIndex]?.trim().toLowerCase();
      const side = sideRaw?.includes("sell") || sideRaw?.includes("short") ? "short" : "long";
      const quantity = Number(cells[qtyIndex] ?? 0);
      const entryPrice = Number(cells[entryIndex] ?? 0);
      const exitPrice = Number(cells[exitIndex] ?? 0);
      const openedAt = toIsoDate(cells[openTimeIndex] ?? "");
      const closedAt = toIsoDate(cells[closeTimeIndex] ?? "");

      await saveTrade({
        accountId: accounts[0].id,
        strategyId: strategies[0].id,
        symbol,
        market: symbol,
        side,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        entryPrice: Number.isFinite(entryPrice) ? entryPrice : 0,
        exitPrice: Number.isFinite(exitPrice) ? exitPrice : 0,
        stopPrice: Number.isFinite(entryPrice) ? entryPrice : 0,
        fees: 0,
        setup: "CSV Import",
        thesis: `Imported from CSV file ${file.name}`,
        openedAt,
        closedAt,
        conviction: 3,
        tags: [],
      });
      imported += 1;
    }

    return imported;
  };

  const importMt5Trades = async (parsedTrades: ParsedTrade[]) => {
    if (!accounts[0]?.id || !strategies[0]?.id) {
      throw new Error("Create at least one ChartLore account before importing MT5 trades.");
    }

    if (!parsedTrades.length) {
      throw new Error("No MT5 trades were available to import.");
    }

    let imported = 0;

    for (const trade of parsedTrades) {
      await saveTrade({
        accountId: accounts[0].id,
        strategyId: strategies[0].id,
        symbol: trade.symbol,
        market: deriveMarket(trade.symbol),
        side: trade.side,
        quantity: trade.volume,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        stopPrice: trade.stopPrice,
        fees: trade.commission + trade.swap,
        setup: trade.setup,
        thesis: "",
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        conviction: 3,
        tags: [],
      });
      imported += 1;
    }

    return imported;
  };

  const handleImportFileChange = async (file: File | null) => {
    setBrokerError("");
    setBrokerNotice("");
    setMt5Preview("");
    setParsedMt5Trades([]);
    setBrokerDraft((current) => ({ ...current, csvFile: file }));

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
      try {
        const text = await readFileAsText(file, "UTF-16");
        const parsedTrades = parseMT5Report(text);

        if (!parsedTrades.length) {
          throw new Error("No valid MT5 trades were found in that HTML report.");
        }

        const firstDate = new Date(parsedTrades[0].openedAt).toLocaleDateString();
        const lastDate = new Date(parsedTrades[parsedTrades.length - 1].closedAt).toLocaleDateString();

        setParsedMt5Trades(parsedTrades);
        setMt5Preview(`Found ${parsedTrades.length} trades from ${firstDate} to ${lastDate}`);
      } catch (error) {
        setBrokerDraft((current) => ({ ...current, csvFile: null }));
        setBrokerError(
          error instanceof Error ? error.message : "Unable to parse that MT5 HTML report.",
        );
      }
    }
  };

  const handleConnectBroker = async () => {
    setConnecting(true);
    setBrokerError("");
    setBrokerNotice("");

    try {
      const label = brokerDraft.label.trim() || `${brokerDraft.broker.toUpperCase()} Connection`;

      if (brokerDraft.broker === "csv" && !brokerDraft.csvFile) {
        throw new Error("Choose an MT5 HTML or CSV file before connecting.");
      }

      if (brokerDraft.broker === "alpaca" && (!brokerDraft.apiKey.trim() || !brokerDraft.apiSecret.trim())) {
        throw new Error("Alpaca requires both API Key and API Secret.");
      }

      if (brokerDraft.broker === "oanda" && (!brokerDraft.apiKey.trim() || !brokerDraft.accountId.trim())) {
        throw new Error("OANDA requires API Key and Account ID.");
      }

      const created = await addBrokerConnection({
        broker: brokerDraft.broker,
        label,
        status: brokerDraft.broker === "manual" || brokerDraft.broker === "csv" ? "active" : "pending",
        apiKey: brokerDraft.apiKey.trim() || undefined,
        apiSecret: brokerDraft.apiSecret.trim() || undefined,
        accountId: brokerDraft.accountId.trim() || undefined,
        lastSyncedAt: undefined,
      });

      if (!created) {
        throw new Error("Unable to create broker connection.");
      }

      if (brokerDraft.broker === "csv" && brokerDraft.csvFile) {
        const lowerName = brokerDraft.csvFile.name.toLowerCase();
        const imported =
          lowerName.endsWith(".html") || lowerName.endsWith(".htm")
            ? await importMt5Trades(parsedMt5Trades)
            : await importCsvTrades(brokerDraft.csvFile);

        setBrokerNotice(`${imported} trades imported successfully`);
      } else {
        setBrokerNotice(`${label} connected successfully.`);
      }

      setShowBrokerPanel(false);
      setBrokerDraft({
        broker: "alpaca",
        label: "",
        apiKey: "",
        apiSecret: "",
        accountId: "",
        csvFile: null,
      });
      setParsedMt5Trades([]);
      setMt5Preview("");
    } catch (error) {
      setBrokerError(error instanceof Error ? error.message : "Broker connection failed.");
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncConnection = async (connectionId: string) => {
    setSyncingId(connectionId);
    setBrokerError("");
    setBrokerNotice("");
    const result = await syncBrokerConnection(connectionId);
    setSyncingId(null);

    if (result.error) {
      setBrokerError(result.error);
      return;
    }

    setBrokerNotice(`Sync completed. Imported ${result.imported} trade${result.imported === 1 ? "" : "s"}.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace, account, and future integrations"
        description="This section is ready for real auth and broker wiring later, but already gives the product a coherent account-management surface."
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowBrokerPanel((current) => !current)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card-soft px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent/25"
            >
              <Link2 className="size-4" />
              Link Broker
            </button>
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

      {showBrokerPanel ? (
        <Card id="broker-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Link Broker</p>
              <h3 className="mt-2 text-2xl font-semibold">Connect a new trade source</h3>
            </div>
            <Button type="button" variant="secondary" onClick={() => setShowBrokerPanel(false)}>
              Close
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>Broker</FieldLabel>
              <Select
                value={brokerDraft.broker}
                onChange={(event) =>
                  setBrokerDraft((current) => ({
                    ...current,
                    broker: event.target.value as BrokerConnection["broker"],
                  }))
                }
              >
                <option value="alpaca">Alpaca</option>
                <option value="oanda">OANDA</option>
                <option value="csv">MT5 / CSV Import</option>
                <option value="manual">Manual</option>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput
                value={brokerDraft.label}
                onChange={(event) =>
                  setBrokerDraft((current) => ({ ...current, label: event.target.value }))
                }
              />
            </div>

            {brokerDraft.broker === "alpaca" ? (
              <>
                <div className="space-y-2">
                  <FieldLabel>API Key</FieldLabel>
                  <TextInput
                    value={brokerDraft.apiKey}
                    onChange={(event) =>
                      setBrokerDraft((current) => ({ ...current, apiKey: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>API Secret</FieldLabel>
                  <TextInput
                    type="password"
                    value={brokerDraft.apiSecret}
                    onChange={(event) =>
                      setBrokerDraft((current) => ({ ...current, apiSecret: event.target.value }))
                    }
                  />
                </div>
              </>
            ) : null}

            {brokerDraft.broker === "oanda" ? (
              <>
                <div className="space-y-2">
                  <FieldLabel>API Key</FieldLabel>
                  <TextInput
                    value={brokerDraft.apiKey}
                    onChange={(event) =>
                      setBrokerDraft((current) => ({ ...current, apiKey: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Account ID</FieldLabel>
                  <TextInput
                    value={brokerDraft.accountId}
                    onChange={(event) =>
                      setBrokerDraft((current) => ({ ...current, accountId: event.target.value }))
                    }
                  />
                </div>
              </>
            ) : null}

            {brokerDraft.broker === "csv" ? (
              <div className="space-y-2 md:col-span-2">
                <FieldLabel>MT5 / CSV File</FieldLabel>
                <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-border bg-card-soft px-4 py-3 text-sm text-muted transition hover:border-accent/25">
                  <Upload className="size-4" />
                  <span>{brokerDraft.csvFile?.name ?? "Choose an MT5 .html/.htm or .csv file"}</span>
                  <input
                    type="file"
                    accept=".html,.htm,.csv,text/csv"
                    className="hidden"
                    onChange={(event) => void handleImportFileChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {mt5Preview ? (
                  <p className="text-sm text-success">{mt5Preview}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {brokerError ? (
            <div className="mt-4 rounded-[22px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              {brokerError}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={handleConnectBroker} disabled={connecting}>
              {connecting ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </Card>
      ) : null}

      {brokerNotice ? (
        <div className="rounded-[22px] border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
          {brokerNotice}
        </div>
      ) : null}

      {brokerError ? (
        <div className="rounded-[22px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          {brokerError}
        </div>
      ) : null}

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
              <TextInput
                value={draftProfile.fullName ?? profile.fullName}
                onChange={(event) =>
                  setDraftProfile((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Email</FieldLabel>
              <TextInput
                value={draftProfile.email ?? profile.email}
                onChange={(event) =>
                  setDraftProfile((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Country</FieldLabel>
              <TextInput
                value={draftProfile.country ?? profile.country}
                onChange={(event) =>
                  setDraftProfile((current) => ({ ...current, country: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Phone Number</FieldLabel>
              <TextInput
                value={draftProfile.phone ?? profile.phone}
                onChange={(event) =>
                  setDraftProfile((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>City</FieldLabel>
              <TextInput
                value={draftProfile.city ?? profile.city}
                onChange={(event) =>
                  setDraftProfile((current) => ({ ...current, city: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Timezone</FieldLabel>
              <TextInput
                value={draftProfile.timezone ?? profile.timezone}
                onChange={(event) =>
                  setDraftProfile((current) => ({ ...current, timezone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel>Trading Focus</FieldLabel>
              <TextArea
                rows={5}
                value={draftProfile.focus ?? profile.focus}
                onChange={(event) =>
                  setDraftProfile((current) => ({ ...current, focus: event.target.value }))
                }
              />
            </div>
          </div>
        </Card>

        <Card id="broker-roadmap">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Broker Connections</p>
          <h3 className="mt-2 text-2xl font-semibold">Live sync sources</h3>
          <div className="mt-6 space-y-3">
            {brokerConnections.length === 0 ? (
              <div className="rounded-[22px] border border-border bg-card-soft p-4 text-sm text-muted">
                No broker connections yet. Link Alpaca, OANDA, CSV imports, or manual journaling.
              </div>
            ) : null}

            {brokerConnections.map((connection) => (
              <div key={connection.id} className="rounded-[22px] border border-border bg-card-soft p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{connection.label}</p>
                      <Badge tone={toBrokerTone(connection.status)}>
                        {connection.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">
                      {connection.broker}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      Last synced: {connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : "Never"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleSyncConnection(connection.id)}
                      disabled={syncingId === connection.id}
                    >
                      <RefreshCw className={`mr-2 size-4 ${syncingId === connection.id ? "animate-spin" : ""}`} />
                      {syncingId === connection.id ? "Syncing..." : "Sync Now"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => void removeBrokerConnection(connection.id)}
                      className="inline-flex items-center justify-center rounded-full border border-danger/20 bg-danger-soft p-2 text-danger transition hover:border-danger/35"
                      aria-label={`Remove ${connection.label}`}
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
