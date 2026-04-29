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
  const [hoveredMaeMfeId, setHoveredMaeMfeId] = useState<string | null>(null);
  const activeMaeMfePoint =
    hoveredMaeMfeId ? maeMfeSeries.find((point) => point.id === hoveredMaeMfeId) ?? null : null;
  const maxMae = Math.max(...maeMfeSeries.map((point) => point.mae), 1);
  const maxMfe = Math.max(...maeMfeSeries.map((point) => point.mfe), 1);

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
        <h3 className="mt-2 text-2xl font-semibold">Adverse versus favorable excursion scatter</h3>
        {maeMfeSeries.length > 0 ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] border border-border bg-card-soft/50 p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                <span>Higher MFE</span>
                <span>Lower MAE</span>
              </div>
              <div className="relative mt-4 h-[360px] rounded-[24px] border border-border bg-background/55">
                <div className="absolute inset-0">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`h-${index}`}
                      className="absolute left-0 right-0 border-t border-border/60"
                      style={{ top: `${(index + 1) * 20}%` }}
                    />
                  ))}
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`v-${index}`}
                      className="absolute top-0 bottom-0 border-l border-border/60"
                      style={{ left: `${(index + 1) * 20}%` }}
                    />
                  ))}
                </div>
                {maeMfeSeries.map((point) => (
                  <button
                    key={point.id}
                    type="button"
                    onMouseEnter={() => setHoveredMaeMfeId(point.id)}
                    onFocus={() => setHoveredMaeMfeId(point.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none"
                    style={{
                      left: `${(point.mae / maxMae) * 100}%`,
                      bottom: `${(point.mfe / maxMfe) * 100}%`,
                    }}
                    aria-label={`${point.symbol}: MAE ${point.mae.toFixed(2)}R, MFE ${point.mfe.toFixed(2)}R`}
                  >
                    <span
                      className={`block size-4 rounded-full border-2 shadow-[0_0_0_4px_rgba(11,19,38,0.45)] transition duration-150 ${
                        point.outcome === "win"
                          ? "border-success bg-success"
                          : point.outcome === "loss"
                            ? "border-danger bg-danger"
                            : "border-accent bg-accent"
                      } ${hoveredMaeMfeId === point.id ? "scale-125" : "scale-100"}`}
                    />
                  </button>
                ))}
                <div className="pointer-events-none absolute bottom-3 left-4 text-[11px] uppercase tracking-[0.18em] text-muted">
                  MAE (R)
                </div>
                <div className="pointer-events-none absolute left-4 top-4 text-[11px] uppercase tracking-[0.18em] text-muted">
                  MFE (R)
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-card-soft/50 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Scatter Detail</p>
              {activeMaeMfePoint ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-2xl font-semibold">{activeMaeMfePoint.symbol}</p>
                    <p className="mt-1 text-sm text-muted">{activeMaeMfePoint.setup || "Manual review entry"}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-danger/20 bg-danger-soft p-4">
                      <p className="text-sm text-danger">MAE</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {activeMaeMfePoint.mae.toFixed(2)}R
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-success/20 bg-success/10 p-4">
                      <p className="text-sm text-success">MFE</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {activeMaeMfePoint.mfe.toFixed(2)}R
                      </p>
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-border bg-background/55 p-4">
                    <p className="text-sm text-muted">Closed Result</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatCurrency(activeMaeMfePoint.pnl)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[20px] border border-border bg-background/55 p-4 text-sm text-muted">
                  Hover a point to inspect the saved manual MAE/MFE review for that trade.
                </div>
              )}
              <div className="mt-6 rounded-[20px] border border-border bg-background/55 p-4 text-sm text-muted">
                Manual MAE/MFE values are entered in the trade review screen and plotted here in R multiples.
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[24px] border border-border bg-card-soft p-5 text-sm text-muted">
            No manual MAE/MFE reviews yet. Open any trade from the report log and enter MAE/MFE in the review form to populate this chart.
          </div>
        )}
      </Card>
    </div>
  );
}
