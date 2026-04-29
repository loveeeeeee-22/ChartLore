import {
  differenceInMinutes,
  eachDayOfInterval,
  endOfYear,
  format,
  getDay,
  isAfter,
  isSameYear,
  parseISO,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
import type {
  Account,
  DailySnapshot,
  Filters,
  Strategy,
  Trade,
  TradeNote,
  TradeOutcome,
  TradeTag,
} from "@/lib/types";

export interface TradeWithMetrics extends Trade {
  pnl: number;
  riskAmount: number;
  rMultiple: number;
  outcome: TradeOutcome;
  holdMinutes: number;
}

export interface DashboardMetrics {
  netPnl: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgRiskReward: number;
  maxDrawdown: number;
  totalTrades: number;
  averageHoldMinutes: number;
}

export interface StrategyRollup {
  strategyId: string;
  name: string;
  status: Strategy["status"];
  netPnl: number;
  winRate: number;
  totalTrades: number;
  expectancy: number;
  averageHoldMinutes: number;
  consistency: number;
}

export interface DistributionBucket {
  label: string;
  count: number;
  tone: "success" | "danger" | "neutral";
}

export interface HeatmapCell {
  day: string;
  hour: string;
  value: number;
}

export interface MaeMfePoint {
  symbol: string;
  setup: string;
  mae: number;
  mfe: number;
}

export interface RuleAdherenceCell {
  date: string;
  dayLabel: string;
  monthLabel: string;
  weekIndex: number;
  weekdayIndex: number;
  score: number;
  tradeCount: number;
}

export function calculateTradePnl(trade: Trade) {
  const direction = trade.side === "long" ? 1 : -1;
  return Number(
    ((trade.exitPrice - trade.entryPrice) * direction * trade.quantity - trade.fees).toFixed(2),
  );
}

export function calculateRiskAmount(trade: Trade) {
  const perUnitRisk =
    trade.side === "long"
      ? trade.entryPrice - trade.stopPrice
      : trade.stopPrice - trade.entryPrice;
  return Number(Math.max(perUnitRisk * trade.quantity, 0.01).toFixed(2));
}

export function calculateRMultiple(trade: Trade) {
  const risk = calculateRiskAmount(trade);
  if (risk <= 0) return 0;
  return Number((calculateTradePnl(trade) / risk).toFixed(2));
}

export function calculateOutcome(pnl: number): TradeOutcome {
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "breakeven";
}

export function enrichTrade(trade: Trade): TradeWithMetrics {
  const pnl = calculateTradePnl(trade);
  return {
    ...trade,
    pnl,
    riskAmount: calculateRiskAmount(trade),
    rMultiple: calculateRMultiple(trade),
    outcome: calculateOutcome(pnl),
    holdMinutes: differenceInMinutes(parseISO(trade.closedAt), parseISO(trade.openedAt)),
  };
}

export function getRangeStart(dateRange: Filters["dateRange"]) {
  const now = new Date("2026-04-29T12:00:00.000Z");
  switch (dateRange) {
    case "7d":
      return subDays(now, 7);
    case "30d":
      return subDays(now, 30);
    case "90d":
      return subDays(now, 90);
    case "ytd":
      return startOfYear(now);
    default:
      return null;
  }
}

export function filterTrades(trades: Trade[], filters: Filters) {
  const start = getRangeStart(filters.dateRange);
  return trades
    .map(enrichTrade)
    .filter((trade) => {
      const opened = parseISO(trade.openedAt);
      const matchesDate = start ? isAfter(opened, start) : true;
      const matchesAccount = filters.accountId === "all" || trade.accountId === filters.accountId;
      const matchesStrategy =
        filters.strategyId === "all" || trade.strategyId === filters.strategyId;
      const matchesSymbol =
        filters.symbol === "all" ||
        trade.symbol.toLowerCase() === filters.symbol.toLowerCase();
      const matchesOutcome = filters.outcome === "all" || trade.outcome === filters.outcome;
      const matchesTag = filters.tag === "all" || trade.tags.includes(filters.tag);
      return (
        matchesDate &&
        matchesAccount &&
        matchesStrategy &&
        matchesSymbol &&
        matchesOutcome &&
        matchesTag
      );
    })
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));
}

export function getDashboardMetrics(trades: TradeWithMetrics[], snapshots: DailySnapshot[]) {
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const averageRiskReward =
    wins.length > 0
      ? wins.reduce((sum, trade) => sum + trade.rMultiple, 0) / wins.length
      : 0;

  return {
    netPnl: Number(totalPnl.toFixed(2)),
    winRate: trades.length ? Number(((wins.length / trades.length) * 100).toFixed(1)) : 0,
    profitFactor:
      grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : Number(grossProfit.toFixed(2)),
    expectancy: trades.length ? Number((totalPnl / trades.length).toFixed(2)) : 0,
    avgRiskReward: Number(averageRiskReward.toFixed(2)),
    maxDrawdown:
      snapshots.length > 0
        ? Number(Math.min(...snapshots.map((snapshot) => snapshot.drawdown)).toFixed(2))
        : 0,
    totalTrades: trades.length,
    averageHoldMinutes: trades.length
      ? Math.round(trades.reduce((sum, trade) => sum + trade.holdMinutes, 0) / trades.length)
      : 0,
  } satisfies DashboardMetrics;
}

export function getEquityCurve(trades: TradeWithMetrics[]) {
  let cumulative = 0;
  return [...trades]
    .reverse()
    .map((trade) => {
      cumulative += trade.pnl;
      return {
        id: trade.id,
        label: format(parseISO(trade.closedAt), "MMM d"),
        value: Number(cumulative.toFixed(2)),
      };
    });
}

export function getStrategyRollups(
  trades: TradeWithMetrics[],
  strategies: Strategy[],
): StrategyRollup[] {
  return strategies
    .map((strategy) => {
      const strategyTrades = trades.filter((trade) => trade.strategyId === strategy.id);
      const wins = strategyTrades.filter((trade) => trade.pnl > 0).length;
      const pnl = strategyTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      const expectancy = strategyTrades.length ? pnl / strategyTrades.length : 0;
      const consistency =
        strategyTrades.length === 0
          ? 0
          : Math.min(
              100,
              Math.round(
                (strategyTrades.reduce((sum, trade) => sum + Math.max(trade.rMultiple, 0), 0) /
                  strategyTrades.length) *
                  20 +
                  (wins / strategyTrades.length) * 45,
              ),
            );

      return {
        strategyId: strategy.id,
        name: strategy.name,
        status: strategy.status,
        netPnl: Number(pnl.toFixed(2)),
        winRate: strategyTrades.length
          ? Number(((wins / strategyTrades.length) * 100).toFixed(1))
          : 0,
        totalTrades: strategyTrades.length,
        expectancy: Number(expectancy.toFixed(2)),
        averageHoldMinutes: strategyTrades.length
          ? Math.round(
              strategyTrades.reduce((sum, trade) => sum + trade.holdMinutes, 0) /
                strategyTrades.length,
            )
          : 0,
        consistency,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

export function getHoldTimeBuckets(trades: TradeWithMetrics[]) {
  const definitions = [
    { label: "0-30m", min: 0, max: 30 },
    { label: "30m-4h", min: 31, max: 240 },
    { label: "4h-24h", min: 241, max: 1440 },
  ];

  return definitions.map((bucket) => {
    const matches = trades.filter(
      (trade) => trade.holdMinutes >= bucket.min && trade.holdMinutes <= bucket.max,
    );
    const wins = matches.filter((trade) => trade.outcome === "win").length;
    return {
      label: bucket.label,
      tradeCount: matches.length,
      winRate: matches.length ? Math.round((wins / matches.length) * 100) : 0,
    };
  });
}

export function getDistribution(trades: TradeWithMetrics[]): DistributionBucket[] {
  const ranges = [
    { label: "< -1R", min: -999, max: -1.01, tone: "danger" as const },
    { label: "-1R", min: -1.0, max: -0.01, tone: "danger" as const },
    { label: "0R", min: -0.009, max: 0.009, tone: "neutral" as const },
    { label: "0-1R", min: 0.01, max: 1.0, tone: "success" as const },
    { label: "1-2R", min: 1.01, max: 2.0, tone: "success" as const },
    { label: "> 2R", min: 2.01, max: 999, tone: "success" as const },
  ];
  return ranges.map((range) => ({
    label: range.label,
    count: trades.filter((trade) => trade.rMultiple >= range.min && trade.rMultiple <= range.max)
      .length,
    tone: range.tone,
  }));
}

export function getHeatmap(trades: TradeWithMetrics[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hours = ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
  const map = new Map<string, number>();

  for (const trade of trades) {
    const opened = parseISO(trade.openedAt);
    const day = format(opened, "EEE");
    const hour = format(opened, "HH");
    const key = `${day}-${hour}`;
    map.set(key, Number(((map.get(key) ?? 0) + trade.pnl).toFixed(2)));
  }

  return days.flatMap((day) =>
    hours.map((hour) => ({
      day,
      hour,
      value: map.get(`${day}-${hour}`) ?? 0,
    })),
  );
}

export function getMaeMfeSeries(trades: TradeWithMetrics[]): MaeMfePoint[] {
  return trades.slice(0, 8).map((trade) => ({
    symbol: trade.symbol,
    setup: trade.setup,
    mae: Number(
      Math.max(
        0.15,
        Math.min(
          4,
          trade.outcome === "loss"
            ? Math.abs(trade.rMultiple) * 0.95
            : Math.max(0.25, Math.abs(trade.rMultiple) * 0.38),
        ),
      ).toFixed(2),
    ),
    mfe: Number(
      Math.max(
        0.25,
        Math.min(
          5,
          trade.outcome === "win"
            ? Math.max(trade.rMultiple, 0.5) * 1.18
            : Math.max(0.4, Math.abs(trade.rMultiple) * 0.72),
        ),
      ).toFixed(2),
    ),
  }));
}

export function getRuleAdherenceHeatmap(trades: TradeWithMetrics[]): RuleAdherenceCell[] {
  const year = 2026;
  const days = eachDayOfInterval({
    start: startOfYear(new Date(`${year}-01-01T00:00:00.000Z`)),
    end: endOfYear(new Date(`${year}-01-01T00:00:00.000Z`)),
  });
  const calendarStart = startOfWeek(days[0], { weekStartsOn: 1 });
  const tradesByDate = new Map<string, TradeWithMetrics[]>();

  const baseRuleScore = (trade: TradeWithMetrics, rule: string) => {
    switch (rule) {
      case "Plan Defined":
        return trade.thesis.trim().length > 28 ? 92 : 58;
      case "A+ Quality":
        return trade.tags.includes("tag-a-plus") || trade.conviction >= 4 ? 90 : 54;
      case "Session Discipline":
        return trade.tags.includes("tag-afternoon") ? 42 : 84;
      case "Risk Control":
        return trade.rMultiple >= -1.15 ? 86 : 48;
      case "Execution Quality":
        return trade.tags.includes("tag-clean") || trade.outcome !== "loss" ? 88 : 52;
      default:
        return 60;
    }
  };

  for (const trade of trades) {
    const key = format(parseISO(trade.openedAt), "yyyy-MM-dd");
    const matches = tradesByDate.get(key) ?? [];
    matches.push(trade);
    tradesByDate.set(key, matches);
  }

  return days.map((day) => {
    const iso = format(day, "yyyy-MM-dd");
    const matches = tradesByDate.get(iso) ?? [];
    const weekday = getDay(day);
    const adherenceRules = [
      "Plan Defined",
      "A+ Quality",
      "Session Discipline",
      "Risk Control",
      "Execution Quality",
    ];

    const score =
      matches.length === 0
        ? 0
        : Math.round(
            adherenceRules.reduce((ruleSum, rule) => {
              return (
                ruleSum +
                matches.reduce((tradeSum, trade) => tradeSum + baseRuleScore(trade, rule), 0) /
                  matches.length
              );
            }, 0) / adherenceRules.length,
          );

    return {
      date: iso,
      dayLabel: format(day, "EEE"),
      monthLabel: format(day, "MMM"),
      weekIndex: Math.floor((day.getTime() - calendarStart.getTime()) / (1000 * 60 * 60 * 24 * 7)),
      weekdayIndex: weekday === 0 ? 6 : weekday - 1,
      score,
      tradeCount: matches.length,
    };
  });
}

export function getRecentNotes(trades: TradeWithMetrics[], notes: TradeNote[]) {
  return notes
    .map((note) => ({
      ...note,
      trade: trades.find((trade) => trade.id === note.tradeId),
    }))
    .filter((note) => note.trade)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getActiveSymbols(trades: TradeWithMetrics[]) {
  return Array.from(new Set(trades.map((trade) => trade.symbol))).sort();
}

export function getDateLabel(filters: Filters["dateRange"]) {
  switch (filters) {
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 90 Days";
    case "ytd":
      return "Year to Date";
    default:
      return "All Time";
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function buildCsvRows(
  trades: TradeWithMetrics[],
  strategies: Strategy[],
  accounts: Account[],
  tags: TradeTag[],
) {
  const header = [
    "Symbol",
    "Strategy",
    "Account",
    "Side",
    "Opened",
    "Closed",
    "P&L",
    "R Multiple",
    "Outcome",
    "Tags",
  ];

  const rows = trades.map((trade) => [
    trade.symbol,
    strategies.find((strategy) => strategy.id === trade.strategyId)?.name ?? trade.setup,
    accounts.find((account) => account.id === trade.accountId)?.name ?? trade.accountId,
    trade.side,
    trade.openedAt,
    trade.closedAt,
    String(trade.pnl),
    String(trade.rMultiple),
    trade.outcome,
    trade.tags
      .map((tagId) => tags.find((tag) => tag.id === tagId)?.label ?? tagId)
      .join(" | "),
  ]);

  return [header, ...rows].map((row) => row.join(",")).join("\n");
}

export function isCurrentYear(dateString: string) {
  return isSameYear(parseISO(dateString), new Date("2026-04-29T12:00:00.000Z"));
}
