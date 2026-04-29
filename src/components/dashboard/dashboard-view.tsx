"use client";

import Link from "next/link";
import { ArrowRight, CircleDollarSign, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Badge, Card } from "@/components/common/primitives";
import { FilterBar, useFilters } from "@/components/common/filter-bar";
import { useTradeStore } from "@/components/providers/trade-store-provider";
import {
  enrichTrade,
  filterTrades,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  getActiveSymbols,
  getDashboardMetrics,
  getDateLabel,
  getEquityCurve,
  getHoldTimeBuckets,
  getRecentNotes,
  getStrategyRollups,
} from "@/lib/trade-metrics";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const store = useTradeStore();
  const filters = useFilters();
  const filteredTrades = filterTrades(store.trades, filters);
  const metrics = getDashboardMetrics(filteredTrades, store.dailySnapshots);
  const equityCurve = getEquityCurve(filteredTrades);
  const notes = getRecentNotes(filteredTrades, store.notes);
  const strategyRollups = getStrategyRollups(filteredTrades, store.strategies);
  const holdBuckets = getHoldTimeBuckets(filteredTrades);
  const recentTrades = filteredTrades.slice(0, 5);
  const highestPoint = Math.max(...equityCurve.map((point) => point.value), 1);
  const weakestBucket = [...holdBuckets].sort((a, b) => a.winRate - b.winRate)[0];
  const topTag = store.tags
    .map((tag) => ({
      ...tag,
      total: filteredTrades.filter((trade) => trade.tags.includes(tag.id)).length,
      wins: filteredTrades.filter(
        (trade) => trade.tags.includes(tag.id) && trade.outcome === "win",
      ).length,
    }))
    .filter((tag) => tag.total > 0)
    .sort((a, b) => b.total - a.total)[0];

  const metricCards = [
    {
      label: "Net P&L",
      value: formatCurrency(metrics.netPnl),
      subtitle: `${getDateLabel(filters.dateRange)} performance`,
      icon: CircleDollarSign,
      tone: metrics.netPnl >= 0 ? "success" : "danger",
    },
    {
      label: "Win Rate",
      value: formatPercent(metrics.winRate),
      subtitle: `${metrics.totalTrades} closed trades`,
      icon: Target,
      tone: "accent",
    },
    {
      label: "Profit Factor",
      value: metrics.profitFactor.toFixed(2),
      subtitle: `Expectancy ${formatCurrency(metrics.expectancy)}`,
      icon: TrendingUp,
      tone: "success",
    },
    {
      label: "Max Drawdown",
      value: formatPercent(metrics.maxDrawdown),
      subtitle: `Avg hold ${Math.round(metrics.averageHoldMinutes / 60)}h`,
      icon: TrendingDown,
      tone: "danger",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
          Phase 1 / Dashboard
        </p>
        <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-balance">
          Performance overview with live journal context
        </h2>
        <p className="max-w-4xl text-sm leading-7 text-muted">
          ChartLore is wired as a SaaS-ready trading journal, but it stays productive without
          backend secrets by using a local demo persistence layer until Supabase is connected.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/trades/new"
            className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-accent-strong"
          >
            Log Trade
          </Link>
        </div>
      </div>

      <FilterBar
        symbols={getActiveSymbols(store.trades.map(enrichTrade))}
        accounts={store.accounts}
        strategies={store.strategies}
        tags={store.tags}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted">{card.label}</p>
                <p className="mt-4 text-3xl font-semibold">{card.value}</p>
                <p className="mt-3 text-sm text-muted">{card.subtitle}</p>
              </div>
              <div
                className={cn(
                  "rounded-2xl p-3",
                  card.tone === "success" && "bg-success-soft text-success",
                  card.tone === "danger" && "bg-danger-soft text-danger",
                  card.tone === "accent" && "bg-accent-soft text-accent",
                )}
              >
                <card.icon className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="grid-glow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Equity Curve</p>
              <h3 className="mt-2 text-2xl font-semibold">Cumulative realized edge</h3>
            </div>
            <Badge tone="accent">{getDateLabel(filters.dateRange)}</Badge>
          </div>
          <div className="mt-8 flex min-h-[280px] items-end gap-2">
            {equityCurve.map((point) => (
              <div key={point.id} className="group flex flex-1 flex-col items-center gap-3">
                <div className="flex h-[240px] w-full items-end">
                  <div
                    className="relative w-full rounded-t-[18px] border border-accent/20 bg-gradient-to-t from-accent-soft to-accent/70 transition duration-150 group-hover:scale-y-[1.02] group-hover:border-accent/45"
                    style={{
                      height: `${Math.max((point.value / highestPoint) * 100, 10)}%`,
                    }}
                  >
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-xl border border-border bg-sidebar px-3 py-2 text-[11px] text-foreground shadow-2xl group-hover:block">
                      {point.label}
                      <div className="mt-1 font-semibold">{formatCurrency(point.value)}</div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted">{point.label}</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {formatCompactCurrency(point.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Journal Pulse</p>
            <h3 className="mt-2 text-2xl font-semibold">Review cues for your next session</h3>
            <div className="mt-6 space-y-3">
              <div className="rounded-[22px] border border-success/18 bg-success-soft p-4">
                <p className="text-sm font-semibold text-success">Best setup right now</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {strategyRollups[0]?.name ?? "No trades yet"}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Win rate {strategyRollups[0]?.winRate ?? 0}% with{" "}
                  {formatCurrency(strategyRollups[0]?.netPnl ?? 0)} net realized P&L.
                </p>
              </div>
              <div className="rounded-[22px] border border-warning/18 bg-warning/10 p-4">
                <p className="text-sm font-semibold text-warning">Behavioral watchlist</p>
                {weakestBucket ? (
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Your weakest hold-time bucket is{" "}
                    <span className="font-semibold text-foreground">{weakestBucket.label}</span> at{" "}
                    <span className="font-semibold text-foreground">{weakestBucket.winRate}%</span>{" "}
                    win rate.
                    {topTag ? (
                      <>
                        {" "}The most-used tag in this filtered view is{" "}
                        <span className="font-semibold text-foreground">{topTag.label}</span>.
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Add more trades to surface live pulse guidance here.
                  </p>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/analytics"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent"
          >
            Open deep analytics
            <ArrowRight className="size-4" />
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Recent Trades</p>
              <h3 className="mt-2 text-2xl font-semibold">What just shaped the curve</h3>
            </div>
            <Link href="/reports" className="text-sm font-semibold text-accent">
              Review all logs
            </Link>
          </div>
          <div className="mt-6 overflow-hidden rounded-[24px] border border-border">
            <table className="min-w-full divide-y divide-border text-left">
              <thead className="bg-card-soft text-[11px] uppercase tracking-[0.28em] text-muted">
                <tr>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Setup</th>
                  <th className="px-4 py-3">R</th>
                  <th className="px-4 py-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {recentTrades.map((trade) => (
                  <tr key={trade.id} className="bg-white/1">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold">{trade.symbol}</p>
                        <p className="text-xs text-muted">{trade.market}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p>{trade.setup}</p>
                      <p className="text-xs text-muted">{trade.side.toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{trade.rMultiple.toFixed(2)}R</td>
                    <td
                      className={cn(
                        "px-4 py-4 text-right font-semibold",
                        trade.pnl >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {formatCurrency(trade.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Trader Notes</p>
          <h3 className="mt-2 text-2xl font-semibold">Narrative context</h3>
          <div className="mt-6 space-y-3">
            {notes.slice(0, 3).map((note) => (
              <div key={note.id} className="rounded-[22px] border border-border bg-card-soft p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{note.trade?.symbol}</p>
                  <Badge tone={note.trade?.pnl && note.trade.pnl > 0 ? "success" : "warning"}>
                    {note.trade?.setup}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted">{note.content}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
