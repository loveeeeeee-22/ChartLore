"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  FieldLabel,
  Select,
  TextArea,
  TextInput,
} from "@/components/common/primitives";
import { PageHeader } from "@/components/common/page-header";
import { useTradeStore } from "@/components/providers/trade-store-provider";
import { filterTrades, formatCurrency, getStrategyRollups } from "@/lib/trade-metrics";
import { useFilters } from "@/components/common/filter-bar";

export function StrategyView() {
  const store = useTradeStore();
  const filters = useFilters();
  const strategyRollups = getStrategyRollups(filterTrades(store.trades, filters), store.strategies);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [strategyName, setStrategyName] = useState("");
  const [strategyRules, setStrategyRules] = useState("");
  const [strategyError, setStrategyError] = useState("");
  const [creating, setCreating] = useState(false);
  const leadStrategy = strategyRollups[0];

  const handleCreateStrategy = async () => {
    setStrategyError("");

    if (!strategyName.trim() || !strategyRules.trim()) {
      setStrategyError("Add a strategy name and at least one rule.");
      return;
    }

    setCreating(true);
    const created = await store.addStrategy({
      name: strategyName,
      rules: strategyRules,
    });
    setCreating(false);

    if (!created) {
      setStrategyError("Unable to create strategy right now.");
      return;
    }

    setStrategyName("");
    setStrategyRules("");
    setShowCreatePanel(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Strategy"
        title="Playbooks, expectancy, and consistency in one place"
        description="Each strategy is measured from the same centralized trade math, so your dashboard, reports, and analytics stay in agreement."
        actions={
          <Button type="button" onClick={() => setShowCreatePanel((current) => !current)}>
            Create Strategy
          </Button>
        }
      />
      {showCreatePanel ? (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">New Strategy</p>
              <h3 className="mt-2 text-2xl font-semibold">Define your playbook</h3>
            </div>
            <Button type="button" variant="secondary" onClick={() => setShowCreatePanel(false)}>
              Close
            </Button>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="space-y-2">
              <FieldLabel>Strategy Name</FieldLabel>
              <TextInput value={strategyName} onChange={(event) => setStrategyName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <FieldLabel>Rules</FieldLabel>
              <TextArea
                rows={6}
                value={strategyRules}
                onChange={(event) => setStrategyRules(event.target.value)}
                placeholder="Write the rules, conditions, and execution notes for this strategy."
              />
            </div>
            {strategyError ? (
              <div className="rounded-[22px] border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
                {strategyError}
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button type="button" onClick={handleCreateStrategy} disabled={creating}>
                {creating ? "Creating..." : "Save Strategy"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Lead Playbook</p>
          <h3 className="mt-2 text-3xl font-semibold">{leadStrategy?.name ?? "No strategies yet"}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-success/18 bg-success-soft p-5">
              <p className="text-sm text-success">Net P&L</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatCurrency(leadStrategy?.netPnl ?? 0)}
              </p>
            </div>
            <div className="rounded-[24px] border border-accent/18 bg-accent-soft p-5">
              <p className="text-sm text-accent">Win Rate</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {leadStrategy?.winRate ?? 0}%
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-muted">
            {store.strategies.find((strategy) => strategy.id === leadStrategy?.strategyId)?.thesis ??
              "Create your first strategy to start tracking named playbooks and rules here."}
          </p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Blueprint Priorities</p>
          <div className="mt-5 space-y-3">
            {store.strategies.length > 0 ? (
              store.strategies.map((strategy) => (
                <div key={strategy.id} className="rounded-[22px] border border-border bg-card-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{strategy.name}</p>
                      <p className="mt-1 text-xs text-muted">{strategy.playbook}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={strategy.status === "active" ? "success" : "warning"}>
                        {strategy.status === "active" ? "In Play" : "Being Revised"}
                      </Badge>
                      <Select
                        value={strategy.status === "active" ? "active" : "revising"}
                        onChange={(event) =>
                          void store.updateStrategyStatus(
                            strategy.id,
                            event.target.value as "active" | "revising",
                          )
                        }
                        className="min-w-[160px]"
                      >
                        <option value="active">In Play</option>
                        <option value="revising">Being Revised</option>
                      </Select>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-border bg-card-soft p-4 text-sm text-muted">
                No strategies yet. Create one to define the rules you want ChartLore to track.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden px-0 py-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Strategy Matrix</p>
            <h3 className="mt-2 text-xl font-semibold">Cross-playbook performance</h3>
          </div>
          <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            Deeper diagnostics
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-card-soft text-[11px] uppercase tracking-[0.28em] text-muted">
              <tr>
                <th className="px-5 py-4">Strategy</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Trades</th>
                <th className="px-5 py-4">Expectancy</th>
                <th className="px-5 py-4">Consistency</th>
                <th className="px-5 py-4 text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {strategyRollups.length > 0 ? (
                strategyRollups.map((strategy) => (
                  <tr key={strategy.strategyId}>
                    <td className="px-5 py-4 font-semibold">{strategy.name}</td>
                    <td className="px-5 py-4 capitalize">{strategy.status}</td>
                    <td className="px-5 py-4">{strategy.totalTrades}</td>
                    <td className="px-5 py-4">{formatCurrency(strategy.expectancy)}</td>
                    <td className="px-5 py-4">{strategy.consistency}/100</td>
                    <td className="px-5 py-4 text-right font-semibold text-success">
                      {formatCurrency(strategy.netPnl)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                    No strategies yet. Create one above to start building your strategy library.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
