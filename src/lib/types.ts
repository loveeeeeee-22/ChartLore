export type TradeSide = "long" | "short";
export type TradeOutcome = "win" | "loss" | "breakeven";
export type StrategyStatus = "active" | "revising" | "paused";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  tier: "pro" | "elite";
  initials: string;
  focus: string;
  country: string;
  phone: string;
  city: string;
  timezone: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  broker: string;
  balance: number;
  currency: string;
  type: "futures" | "equities" | "crypto" | "forex";
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  slug: string;
  status: StrategyStatus;
  playbook: string;
  thesis: string;
  timeframes: string[];
  tags: string[];
}

export interface TradeTag {
  id: string;
  label: string;
  tone: "accent" | "success" | "warning" | "danger" | "neutral";
}

export interface TradeNote {
  id: string;
  tradeId: string;
  content: string;
  createdAt: string;
}

export interface TradeExecution {
  id: string;
  tradeId: string;
  quantity: number;
  price: number;
  executedAt: string;
  kind: "entry" | "scale_in" | "partial_exit" | "exit";
}

export interface DailySnapshot {
  id: string;
  date: string;
  netPnl: number;
  accountBalance: number;
  drawdown: number;
}

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  strategyId: string;
  symbol: string;
  market: string;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  fees: number;
  setup: string;
  thesis: string;
  screenshot?: string;
  openedAt: string;
  closedAt: string;
  conviction: number;
  tags: string[];
  noteIds: string[];
  executionIds: string[];
}

export interface Filters {
  dateRange: "7d" | "30d" | "90d" | "ytd" | "all";
  accountId: string;
  strategyId: string;
  symbol: string;
  outcome: "all" | TradeOutcome;
  tag: string;
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
}
