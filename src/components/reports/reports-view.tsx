"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Badge, Button, Card } from "@/components/common/primitives";
import { FilterBar, useFilters } from "@/components/common/filter-bar";
import { PageHeader } from "@/components/common/page-header";
import { useTradeStore } from "@/components/providers/trade-store-provider";
import {
  buildCsvRows,
  enrichTrade,
  filterTrades,
  formatCurrency,
  getActiveSymbols,
} from "@/lib/trade-metrics";

export function ReportsView() {
  const store = useTradeStore();
  const filters = useFilters();
  const filteredTrades = filterTrades(store.trades, filters);

  const downloadCsv = () => {
    const csv = buildCsvRows(filteredTrades, store.strategies, store.accounts, store.tags);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chartlore-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Execution logs with exportable review data"
        description="Slice trades by symbol, account, strategy, or behavioral tags and keep every metric aligned across the app."
        actions={
          <Button onClick={downloadCsv}>
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        }
      />
      <FilterBar
        symbols={getActiveSymbols(store.trades.map(enrichTrade))}
        accounts={store.accounts}
        strategies={store.strategies}
        tags={store.tags}
      />
      <Card className="overflow-hidden px-0 py-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Execution Log</p>
            <h3 className="mt-2 text-xl font-semibold">Showing {filteredTrades.length} trades</h3>
          </div>
          <Badge tone="accent">Filters stay synced through URL params</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-card-soft text-[11px] uppercase tracking-[0.28em] text-muted">
              <tr>
                <th className="px-5 py-4">Symbol</th>
                <th className="px-5 py-4">Strategy</th>
                <th className="px-5 py-4">Entry</th>
                <th className="px-5 py-4">Exit</th>
                <th className="px-5 py-4">R</th>
                <th className="px-5 py-4 text-right">P&L</th>
                <th className="px-5 py-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredTrades.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{trade.symbol}</p>
                    <p className="text-xs text-muted">{trade.market}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p>{store.strategies.find((strategy) => strategy.id === trade.strategyId)?.name}</p>
                    <p className="text-xs text-muted">{trade.setup}</p>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{trade.entryPrice}</td>
                  <td className="px-5 py-4 font-mono text-xs">{trade.exitPrice}</td>
                  <td className="px-5 py-4 font-mono text-xs">{trade.rMultiple.toFixed(2)}R</td>
                  <td
                    className={`px-5 py-4 text-right font-semibold ${
                      trade.pnl >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {formatCurrency(trade.pnl)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/trades/${trade.id}`}
                      className="text-sm font-semibold text-accent transition hover:text-accent-strong"
                    >
                      Review
                    </Link>
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
