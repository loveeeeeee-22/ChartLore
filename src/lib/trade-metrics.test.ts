import { describe, expect, it } from "vitest";
import { trades } from "./mock-data";
import {
  calculateOutcome,
  calculateRMultiple,
  calculateRiskAmount,
  calculateTradePnl,
  enrichTrade,
  getDashboardMetrics,
} from "./trade-metrics";

describe("trade metrics", () => {
  it("calculates long trade pnl with fees", () => {
    const trade = trades.find((item) => item.id === "trade-5");
    expect(trade).toBeDefined();
    expect(calculateTradePnl(trade!)).toBeCloseTo(924);
  });

  it("calculates short trade pnl with fees", () => {
    const trade = trades.find((item) => item.id === "trade-11");
    expect(trade).toBeDefined();
    expect(calculateTradePnl(trade!)).toBeCloseTo(435);
  });

  it("marks breakeven trades correctly", () => {
    const trade = trades.find((item) => item.id === "trade-4");
    expect(trade).toBeDefined();
    expect(calculateOutcome(calculateTradePnl(trade!))).toBe("loss");
  });

  it("calculates risk amount and r multiple", () => {
    const trade = trades.find((item) => item.id === "trade-1");
    expect(trade).toBeDefined();
    expect(calculateRiskAmount(trade!)).toBeGreaterThan(100);
    expect(calculateRMultiple(trade!)).toBeGreaterThan(2);
  });

  it("aggregates dashboard metrics from enriched trades", () => {
    const enriched = trades.map(enrichTrade);
    const metrics = getDashboardMetrics(enriched, []);
    expect(metrics.totalTrades).toBe(trades.length);
    expect(metrics.winRate).toBeGreaterThan(40);
    expect(metrics.profitFactor).toBeGreaterThan(1);
    expect(metrics.expectancy).toBeGreaterThan(0);
  });
});
