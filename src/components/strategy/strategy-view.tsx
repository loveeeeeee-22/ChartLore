"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Button, Card } from "@/components/common/primitives";
import { PageHeader } from "@/components/common/page-header";
import { useTradeStore } from "@/components/providers/trade-store-provider";
import { filterTrades, formatCurrency, getStrategyRollups } from "@/lib/trade-metrics";
import { useFilters } from "@/components/common/filter-bar";

export function StrategyView() {
  const store = useTradeStore();
  const filters = useFilters();
  const strategyRollups = getStrategyRollups(filterTrades(store.trades, filters), store.strategies);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Strategy"
        title="Playbooks, expectancy, and consistency in one place"
        description="Each strategy is measured from the same centralized trade math, so your dashboard, reports, and analytics stay in agreement."
        actions={
          <Button>Create Strategy</Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Lead Playbook</p>
          <h3 className="mt-2 text-3xl font-semibold">{strategyRollups[0]?.name}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-success/18 bg-success-soft p-5">
              <p className="text-sm text-success">Net P&L</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatCurrency(strategyRollups[0]?.netPnl ?? 0)}
              </p>
            </div>
            <div className="rounded-[24px] border border-accent/18 bg-accent-soft p-5">
              <p className="text-sm text-accent">Win Rate</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {strategyRollups[0]?.winRate ?? 0}%
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-muted">
            {store.strategies.find((strategy) => strategy.id === strategyRollups[0]?.strategyId)?.thesis}
          </p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Blueprint Priorities</p>
          <div className="mt-5 space-y-3">
            {store.strategies.map((strategy) => (
              <div key={strategy.id} className="rounded-[22px] border border-border bg-card-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{strategy.name}</p>
                    <p className="mt-1 text-xs text-muted">{strategy.playbook}</p>
                  </div>
                  <Badge
                    tone={
                      strategy.status === "active"
                        ? "success"
                        : strategy.status === "revising"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {strategy.status}
                  </Badge>
                </div>
              </div>
            ))}
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
              {strategyRollups.map((strategy) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
