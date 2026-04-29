"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge, Button, Card, FieldLabel, Select, TextArea, TextInput } from "@/components/common/primitives";
import { useTradeStore, type TradeDraft } from "@/components/providers/trade-store-provider";
import { calculateTradePnl, calculateRMultiple, formatCurrency } from "@/lib/trade-metrics";
import type { Trade } from "@/lib/types";

function toInputDate(dateString: string) {
  return new Date(dateString).toISOString().slice(0, 16);
}

export function TradeForm({ initialTrade }: { initialTrade?: Trade }) {
  const router = useRouter();
  const store = useTradeStore();
  const [newTagLabel, setNewTagLabel] = useState("");
  const [draft, setDraft] = useState<TradeDraft>({
    id: initialTrade?.id,
    accountId: initialTrade?.accountId ?? store.accounts[0]?.id ?? "",
    strategyId: initialTrade?.strategyId ?? store.strategies[0]?.id ?? "",
    symbol: initialTrade?.symbol ?? "",
    market: initialTrade?.market ?? "",
    side: initialTrade?.side ?? "long",
    quantity: initialTrade?.quantity ?? 1,
    entryPrice: initialTrade?.entryPrice ?? 0,
    exitPrice: initialTrade?.exitPrice ?? 0,
    stopPrice: initialTrade?.stopPrice ?? 0,
    fees: initialTrade?.fees ?? 0,
    setup: initialTrade?.setup ?? "",
    thesis: initialTrade?.thesis ?? "",
    openedAt: initialTrade ? toInputDate(initialTrade.openedAt) : "2026-04-29T13:30",
    closedAt: initialTrade ? toInputDate(initialTrade.closedAt) : "2026-04-29T14:15",
    conviction: initialTrade?.conviction ?? 3,
    tags: initialTrade?.tags ?? [],
  });

  const previewTrade = useMemo(
    () =>
      ({
        id: draft.id ?? "preview",
        userId: "preview",
        accountId: draft.accountId,
        strategyId: draft.strategyId,
        symbol: draft.symbol || "NQ1!",
        market: draft.market || "Preview Market",
        side: draft.side,
        quantity: draft.quantity,
        entryPrice: draft.entryPrice,
        exitPrice: draft.exitPrice,
        stopPrice: draft.stopPrice,
        fees: draft.fees,
        setup: draft.setup || "Preview Setup",
        thesis: draft.thesis,
        openedAt: new Date(draft.openedAt).toISOString(),
        closedAt: new Date(draft.closedAt).toISOString(),
        conviction: draft.conviction,
        tags: draft.tags,
        noteIds: [],
        executionIds: [],
      }) satisfies Trade,
    [draft],
  );

  const pnl = calculateTradePnl(previewTrade);
  const rMultiple = calculateRMultiple(previewTrade);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tradeId = store.saveTrade({
      ...draft,
      openedAt: new Date(draft.openedAt).toISOString(),
      closedAt: new Date(draft.closedAt).toISOString(),
    });
    router.push(`/reports?focus=${tradeId}`);
  };

  const toggleTag = (tagId: string) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.includes(tagId)
        ? current.tags.filter((item) => item !== tagId)
        : [...current.tags, tagId],
    }));
  };

  const handleCreateTag = () => {
    const nextLabel = newTagLabel.trim();
    if (!nextLabel) {
      return;
    }

    store.addTag(nextLabel);
    const createdTag = store.tags.find((tag) => tag.label.toLowerCase() === nextLabel.toLowerCase());
    if (createdTag && !draft.tags.includes(createdTag.id)) {
      setDraft((current) => ({ ...current, tags: [...current.tags, createdTag.id] }));
    }
    setNewTagLabel("");
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>Account</FieldLabel>
              <Select
                value={draft.accountId}
                onChange={(event) => setDraft((current) => ({ ...current, accountId: event.target.value }))}
              >
                {store.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel>Strategy</FieldLabel>
              <Select
                value={draft.strategyId}
                onChange={(event) => setDraft((current) => ({ ...current, strategyId: event.target.value }))}
              >
                {store.strategies.map((strategy) => (
                  <option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel>Symbol</FieldLabel>
              <TextInput value={draft.symbol} onChange={(event) => setDraft((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Market</FieldLabel>
              <TextInput value={draft.market} onChange={(event) => setDraft((current) => ({ ...current, market: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Side</FieldLabel>
              <Select
                value={draft.side}
                onChange={(event) => setDraft((current) => ({ ...current, side: event.target.value as "long" | "short" }))}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel>Quantity</FieldLabel>
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={draft.quantity}
                onChange={(event) => setDraft((current) => ({ ...current, quantity: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Entry Price</FieldLabel>
              <TextInput
                type="number"
                step="0.01"
                value={draft.entryPrice}
                onChange={(event) => setDraft((current) => ({ ...current, entryPrice: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Exit Price</FieldLabel>
              <TextInput
                type="number"
                step="0.01"
                value={draft.exitPrice}
                onChange={(event) => setDraft((current) => ({ ...current, exitPrice: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Stop Price</FieldLabel>
              <TextInput
                type="number"
                step="0.01"
                value={draft.stopPrice}
                onChange={(event) => setDraft((current) => ({ ...current, stopPrice: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Fees</FieldLabel>
              <TextInput
                type="number"
                step="0.01"
                value={draft.fees}
                onChange={(event) => setDraft((current) => ({ ...current, fees: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Opened At</FieldLabel>
              <TextInput
                type="datetime-local"
                value={draft.openedAt}
                onChange={(event) => setDraft((current) => ({ ...current, openedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Closed At</FieldLabel>
              <TextInput
                type="datetime-local"
                value={draft.closedAt}
                onChange={(event) => setDraft((current) => ({ ...current, closedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel>Setup Name</FieldLabel>
              <TextInput value={draft.setup} onChange={(event) => setDraft((current) => ({ ...current, setup: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel>Thesis / Notes</FieldLabel>
              <TextArea rows={5} value={draft.thesis} onChange={(event) => setDraft((current) => ({ ...current, thesis: event.target.value }))} />
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Trade Preview</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[20px] border border-success/16 bg-success-soft p-4">
                <p className="text-sm text-success">P&amp;L</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(pnl)}</p>
              </div>
              <div className="rounded-[20px] border border-accent/16 bg-accent-soft p-4">
                <p className="text-sm text-accent">R Multiple</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{rMultiple.toFixed(2)}R</p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Journal Tags</p>
            <div className="mt-4 flex gap-2">
              <TextInput
                placeholder="Create a custom tag"
                value={newTagLabel}
                onChange={(event) => setNewTagLabel(event.target.value)}
              />
              <Button type="button" onClick={handleCreateTag}>
                Add
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {store.tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-1">
                  <button type="button" onClick={() => toggleTag(tag.id)}>
                    <Badge tone={draft.tags.includes(tag.id) ? tag.tone : "neutral"}>{tag.label}</Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => store.removeTag(tag.id)}
                    className="inline-flex items-center justify-center rounded-full border border-border bg-card-soft p-1 text-muted transition hover:text-danger"
                    aria-label={`Delete ${tag.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit">{initialTrade ? "Update Trade" : "Save Trade"}</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
