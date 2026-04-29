"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Select } from "@/components/common/primitives";
import type { Filters, Strategy, TradeTag, TradeOutcome } from "@/lib/types";

interface FilterBarProps {
  symbols: string[];
  accounts: { id: string; name: string }[];
  strategies: Strategy[];
  tags: TradeTag[];
}

const defaultFilters: Filters = {
  dateRange: "30d",
  accountId: "all",
  strategyId: "all",
  symbol: "all",
  outcome: "all",
  tag: "all",
};

export function useFilters(): Filters {
  const searchParams = useSearchParams();

  return useMemo(
    () => ({
      dateRange: (searchParams.get("range") as Filters["dateRange"]) ?? defaultFilters.dateRange,
      accountId: searchParams.get("account") ?? defaultFilters.accountId,
      strategyId: searchParams.get("strategy") ?? defaultFilters.strategyId,
      symbol: searchParams.get("symbol") ?? defaultFilters.symbol,
      outcome: (searchParams.get("outcome") as "all" | TradeOutcome) ?? defaultFilters.outcome,
      tag: searchParams.get("tag") ?? defaultFilters.tag,
    }),
    [searchParams],
  );
}

export function FilterBar({ symbols, accounts, strategies, tags }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useFilters();

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const rangeOptions = ["7d", "30d", "90d", "ytd", "all"] as const;

  return (
    <div className="panel rounded-[28px] p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <Button
              key={option}
              type="button"
              variant={filters.dateRange === option ? "primary" : "secondary"}
              className="px-3 py-2 text-xs uppercase tracking-[0.22em]"
              onClick={() => setFilter("range", option)}
            >
              {option}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Select value={filters.accountId} onChange={(event) => setFilter("account", event.target.value)}>
            <option value="all">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          <Select value={filters.strategyId} onChange={(event) => setFilter("strategy", event.target.value)}>
            <option value="all">All Strategies</option>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </Select>
          <Select value={filters.symbol} onChange={(event) => setFilter("symbol", event.target.value)}>
            <option value="all">All Symbols</option>
            {symbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </Select>
          <Select value={filters.outcome} onChange={(event) => setFilter("outcome", event.target.value)}>
            <option value="all">All Outcomes</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="breakeven">Breakeven</option>
          </Select>
          <Select value={filters.tag} onChange={(event) => setFilter("tag", event.target.value)}>
            <option value="all">All Tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
