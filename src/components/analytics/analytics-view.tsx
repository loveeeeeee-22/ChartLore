"use client";

import { useState } from "react";
import { Card } from "@/components/common/primitives";
import { FilterBar, useFilters } from "@/components/common/filter-bar";
import { PageHeader } from "@/components/common/page-header";
import { useTradeStore } from "@/components/providers/trade-store-provider";
import {
  enrichTrade,
  filterTrades,
  formatCurrency,
  getActiveSymbols,
  getDistribution,
  getHeatmap,
  getHoldTimeBuckets,
  getMaeMfeSeries,
  getRuleAdherenceHeatmap,
} from "@/lib/trade-metrics";

export function AnalyticsView() {
  const store = useTradeStore();
  const filters = useFilters();
  const trades = filterTrades(store.trades, filters);
  const heatmap = getHeatmap(trades);
  const distribution = getDistribution(trades);
  const holdBuckets = getHoldTimeBuckets(trades);
  const maeMfeSeries = getMaeMfeSeries(trades);
  const ruleAdherence = getRuleAdherenceHeatmap(trades);
  const [hoveredRuleDate, setHoveredRuleDate] = useState<string | null>(null);
  const activeRuleCell = hoveredRuleDate
    ? ruleAdherence.find((cell) => cell.date === hoveredRuleDate) ?? null
    : null;
  const seenMonths = new Set<string>();
  const monthMarkers = ruleAdherence.filter((cell) => {
    if (cell.weekdayIndex !== 0) return false;
    if (seenMonths.has(cell.monthLabel)) return false;
    seenMonths.add(cell.monthLabel);
    return true;
  });
  const totalWeeks = Math.max(...ruleAdherence.map((cell) => cell.weekIndex)) + 1;
  const activeRuleDate = activeRuleCell?.date ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Behavior, distributions, and edge diagnostics"
        description="The analytics layer leans into the competitive angle you chose: deeper review signals built from the same trade record instead of disconnected dashboards."
      />
      <FilterBar
        symbols={getActiveSymbols(store.trades.map(enrichTrade))}
        accounts={store.accounts}
        strategies={store.strategies}
        tags={store.tags}
      />

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Hourly Heatmap</p>
          <h3 className="mt-2 text-2xl font-semibold">P&L by weekday and session hour</h3>
          <div className="mt-6 overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-[auto_repeat(12,minmax(0,1fr))] gap-2">
              <div />
              {["09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"].map((hour) => (
                <div key={hour} className="text-center text-[11px] uppercase tracking-[0.22em] text-muted">
                  {hour}
                </div>
              ))}
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                <div key={day} className="contents">
                  <div className="flex items-center pr-2 text-[11px] uppercase tracking-[0.22em] text-muted">
                    {day}
                  </div>
                  {heatmap
                    .filter((cell) => cell.day === day)
                    .map((cell) => (
                      <div
                        key={`${cell.day}-${cell.hour}`}
                        className="group relative aspect-square"
                        title={`${day} ${cell.hour}:00 • ${formatCurrency(cell.value)}`}
                      >
                        <div
                          className={`absolute inset-0 rounded-2xl border border-border transition duration-150 group-hover:scale-[1.06] group-hover:border-accent/35 ${
                            cell.value > 0
                              ? "bg-success/20"
                              : cell.value < 0
                                ? "bg-danger/20"
                                : "bg-card-soft"
                          }`}
                        />
                        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-sidebar/92 px-2 text-center opacity-0 transition duration-150 group-hover:opacity-100">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                            {day} {cell.hour}
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-foreground">
                            {formatCurrency(cell.value)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Hold-Time Behavior</p>
          <h3 className="mt-2 text-2xl font-semibold">Outcome quality by duration</h3>
          <div className="mt-6 space-y-5">
            {holdBuckets.map((bucket) => (
              <div key={bucket.label} className="group">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{bucket.label}</span>
                  <span className="font-semibold text-success">{bucket.winRate}% WR</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-card-soft">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-success transition-all duration-150 group-hover:brightness-110"
                    style={{ width: `${bucket.winRate}%` }}
                    title={`${bucket.label} • ${bucket.tradeCount} trades • ${bucket.winRate}% win rate`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">R-Multiple Distribution</p>
        <h3 className="mt-2 text-2xl font-semibold">How your wins and losses cluster</h3>
        <div className="mt-8 grid gap-4 md:grid-cols-6">
          {distribution.map((bucket) => (
            <div
              key={bucket.label}
              className="rounded-[24px] border border-border bg-card-soft p-4 transition duration-150 hover:-translate-y-1 hover:border-accent/25"
              title={`${bucket.label} contains ${bucket.count} trades`}
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{bucket.label}</p>
              <p className="mt-4 text-3xl font-semibold">{bucket.count}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Rule Adherence Heatmap</p>
        <h3 className="mt-2 text-2xl font-semibold">How consistently your rules were followed</h3>
        <div className="mt-6 rounded-[28px] border border-border bg-card-soft/50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Daily discipline score across the full 2026 trading calendar
              </p>
              <p className="mt-1 text-xs text-muted">
                Hover any square to inspect adherence without leaving the heatmap.
              </p>
            </div>
            <div className="min-w-[240px] rounded-[22px] border border-border bg-background/80 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Hover Detail</p>
              {activeRuleCell ? (
                <>
                  <p className="mt-2 text-sm font-semibold">
                    {activeRuleCell.monthLabel} {activeRuleCell.date.slice(-2)}, 2026
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {activeRuleCell.tradeCount === 0
                      ? "No trades logged on this day."
                      : `${activeRuleCell.tradeCount} trade${activeRuleCell.tradeCount > 1 ? "s" : ""} reviewed.`}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-success">
                    {activeRuleCell.tradeCount === 0 ? "Unrated" : `${activeRuleCell.score}% adherence`}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold">Move across the calendar</p>
                  <p className="mt-1 text-xs text-muted">
                    The detail panel stays inside the module so the year grid can remain compact.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div className="min-w-[920px]">
              <div
                className="grid items-end gap-x-1 gap-y-2"
                style={{ gridTemplateColumns: `auto repeat(${Math.max(...ruleAdherence.map((cell) => cell.weekIndex)) + 1}, minmax(0, 10px))` }}
              >
                <div />
                {Array.from({ length: totalWeeks }).map((_, weekIndex) => {
                  const marker = monthMarkers.find((item) => item.weekIndex === weekIndex);
                  return (
                    <div
                      key={`month-${weekIndex}`}
                      className="text-[10px] uppercase tracking-[0.18em] text-muted"
                    >
                      {marker?.monthLabel ?? ""}
                    </div>
                  );
                })}

                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, dayIndex) => (
                  <div key={day} className="contents">
                    <div className="flex h-[10px] items-center pr-2 text-[10px] uppercase tracking-[0.18em] text-muted">
                      {day}
                    </div>
                    {Array.from({ length: totalWeeks }).map(
                      (_, weekIndex) => {
                        const cell = ruleAdherence.find(
                          (entry) => entry.weekIndex === weekIndex && entry.weekdayIndex === dayIndex,
                        );
                        if (!cell) {
                          return <div key={`${weekIndex}-${dayIndex}`} className="h-[10px] w-[10px]" />;
                        }

                        return (
                          <button
                            key={cell.date}
                            type="button"
                            onMouseEnter={() => setHoveredRuleDate(cell.date)}
                            onFocus={() => setHoveredRuleDate(cell.date)}
                            className={`h-[10px] w-[10px] rounded-[3px] border transition duration-150 focus:outline-none ${
                              activeRuleDate === cell.date
                                ? "border-accent/70 ring-1 ring-accent/40"
                                : "border-border/60 hover:border-accent/45 focus:border-accent/45"
                            }`}
                            style={{
                              backgroundColor:
                                cell.tradeCount === 0
                                  ? "rgba(20,30,48,0.72)"
                                  : cell.score < 55
                                    ? `rgba(255,107,107,${Math.max(cell.score / 100, 0.4)})`
                                    : cell.score < 75
                                      ? `rgba(246,196,87,${Math.max(cell.score / 100, 0.35)})`
                                      : `rgba(80, 227, 164, ${Math.max(cell.score / 100, 0.32)})`,
                              boxShadow:
                                activeRuleDate === cell.date
                                  ? "0 0 0 1px rgba(125,166,255,0.18)"
                                  : "none",
                            }}
                            aria-label={`${cell.monthLabel} ${cell.date.slice(-2)}, 2026: ${cell.tradeCount === 0 ? "No trades" : `${cell.score}% adherence`}`}
                          />
                        );
                      },
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">MAE / MFE</p>
        <h3 className="mt-2 text-2xl font-semibold">Adverse versus favorable excursion</h3>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {maeMfeSeries.map((point) => (
            <div
              key={point.symbol}
              className="rounded-[24px] border border-border bg-card-soft p-4 transition duration-150 hover:-translate-y-1 hover:border-accent/25"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{point.symbol}</p>
                <p className="text-xs text-muted">{point.setup}</p>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted">MAE</span>
                    <span className="font-semibold text-danger">{point.mae.toFixed(2)}R</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-background/65">
                    <div
                      className="h-full rounded-full bg-danger transition-all duration-150 hover:brightness-110"
                      style={{ width: `${Math.min(point.mae * 25, 100)}%` }}
                      title={`${point.symbol} MAE ${point.mae.toFixed(2)}R`}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted">MFE</span>
                    <span className="font-semibold text-success">{point.mfe.toFixed(2)}R</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-background/65">
                    <div
                      className="h-full rounded-full bg-success transition-all duration-150 hover:brightness-110"
                      style={{ width: `${Math.min(point.mfe * 25, 100)}%` }}
                      title={`${point.symbol} MFE ${point.mfe.toFixed(2)}R`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
