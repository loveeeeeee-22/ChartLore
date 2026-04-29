"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  accounts as seedAccounts,
  dailySnapshots,
  profile,
  strategies as seedStrategies,
  tags as seedTags,
  tradeNotes,
  tradeExecutions,
  trades as seedTrades,
} from "@/lib/mock-data";
import { notifyStorageChange, STORAGE_EVENT, STORAGE_KEYS } from "@/lib/storage";
import type {
  Account,
  DailySnapshot,
  Profile,
  Strategy,
  Trade,
  TradeExecution,
  TradeNote,
  TradeTag,
} from "@/lib/types";

export interface TradeDraft {
  id?: string;
  accountId: string;
  strategyId: string;
  symbol: string;
  market: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  fees: number;
  setup: string;
  thesis: string;
  openedAt: string;
  closedAt: string;
  conviction: number;
  tags: string[];
}

export interface AccountDraft {
  name: string;
  broker: string;
  type: Account["type"];
  balance: number;
  currency: string;
}

interface TradeStoreValue {
  profile: Profile;
  accounts: Account[];
  strategies: Strategy[];
  tags: TradeTag[];
  notes: TradeNote[];
  executions: TradeExecution[];
  dailySnapshots: DailySnapshot[];
  trades: Trade[];
  saveTrade: (draft: TradeDraft) => string;
  getTradeById: (id: string) => Trade | undefined;
  updateProfile: (nextProfile: Profile) => void;
  addTag: (label: string) => void;
  addAccount: (draft: AccountDraft) => void;
  removeAccount: (accountId: string) => void;
  removeTag: (tagId: string) => void;
}

const TradeStoreContext = createContext<TradeStoreValue | null>(null);

let cachedProfileRaw: null | string = null;
let cachedProfileValue: Profile = profile;
let cachedAccountsRaw: null | string = null;
let cachedAccountsValue: Account[] = seedAccounts;
let cachedTradesRaw: null | string = null;
let cachedTradesValue: Trade[] = seedTrades;
let cachedTagsRaw: null | string = null;
let cachedTagsValue: TradeTag[] = seedTags;

function readStoredProfile() {
  if (typeof window === "undefined") {
    return profile;
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.profile);
  if (raw === cachedProfileRaw) {
    return cachedProfileValue;
  }

  cachedProfileRaw = raw;
  cachedProfileValue = raw ? (JSON.parse(raw) as Profile) : profile;
  return cachedProfileValue;
}

function readStoredAccounts() {
  if (typeof window === "undefined") {
    return seedAccounts;
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.accounts);
  if (raw === cachedAccountsRaw) {
    return cachedAccountsValue;
  }

  cachedAccountsRaw = raw;
  cachedAccountsValue = raw ? (JSON.parse(raw) as Account[]) : seedAccounts;
  return cachedAccountsValue;
}

function readStoredTrades() {
  if (typeof window === "undefined") {
    return seedTrades;
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.trades);
  if (raw === cachedTradesRaw) {
    return cachedTradesValue;
  }

  cachedTradesRaw = raw;
  cachedTradesValue = raw ? (JSON.parse(raw) as Trade[]) : seedTrades;
  return cachedTradesValue;
}

function readStoredTags() {
  if (typeof window === "undefined") {
    return seedTags;
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.tags);
  if (raw === cachedTagsRaw) {
    return cachedTagsValue;
  }

  cachedTagsRaw = raw;
  cachedTagsValue = raw ? (JSON.parse(raw) as TradeTag[]) : seedTags;
  return cachedTagsValue;
}

export function TradeStoreProvider({ children }: { children: ReactNode }) {
  const profileState = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handler = () => callback();
      const customHandler = (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string }>).detail;
        if (!detail?.key || detail.key === STORAGE_KEYS.profile) {
          callback();
        }
      };

      window.addEventListener("storage", handler);
      window.addEventListener(STORAGE_EVENT, customHandler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(STORAGE_EVENT, customHandler);
      };
    },
    readStoredProfile,
    () => profile,
  );

  const accounts = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handler = () => callback();
      const customHandler = (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string }>).detail;
        if (!detail?.key || detail.key === STORAGE_KEYS.accounts) {
          callback();
        }
      };

      window.addEventListener("storage", handler);
      window.addEventListener(STORAGE_EVENT, customHandler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(STORAGE_EVENT, customHandler);
      };
    },
    readStoredAccounts,
    () => seedAccounts,
  );

  const trades = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handler = () => callback();
      const customHandler = (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string }>).detail;
        if (!detail?.key || detail.key === STORAGE_KEYS.trades) {
          callback();
        }
      };

      window.addEventListener("storage", handler);
      window.addEventListener(STORAGE_EVENT, customHandler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(STORAGE_EVENT, customHandler);
      };
    },
    readStoredTrades,
    () => seedTrades,
  );

  const tags = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handler = () => callback();
      const customHandler = (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string }>).detail;
        if (!detail?.key || detail.key === STORAGE_KEYS.tags) {
          callback();
        }
      };

      window.addEventListener("storage", handler);
      window.addEventListener(STORAGE_EVENT, customHandler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(STORAGE_EVENT, customHandler);
      };
    },
    readStoredTags,
    () => seedTags,
  );

  const value = useMemo<TradeStoreValue>(
    () => ({
      profile: profileState,
      accounts,
      strategies: seedStrategies,
      tags,
      notes: tradeNotes,
      executions: tradeExecutions,
      dailySnapshots,
      trades,
      saveTrade(draft) {
        const nextTrade: Trade = {
          id: draft.id ?? `trade-${Date.now()}`,
          userId: profileState.id,
          accountId: draft.accountId,
          strategyId: draft.strategyId,
          symbol: draft.symbol,
          market: draft.market,
          side: draft.side,
          quantity: draft.quantity,
          entryPrice: draft.entryPrice,
          exitPrice: draft.exitPrice,
          stopPrice: draft.stopPrice,
          fees: draft.fees,
          setup: draft.setup,
          thesis: draft.thesis,
          openedAt: draft.openedAt,
          closedAt: draft.closedAt,
          conviction: draft.conviction,
          tags: draft.tags,
          noteIds: [],
          executionIds: [],
        };

        const exists = trades.some((trade) => trade.id === nextTrade.id);
        const nextTrades = exists
          ? trades.map((trade) => (trade.id === nextTrade.id ? nextTrade : trade))
          : [nextTrade, ...trades];
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(nextTrades));
          notifyStorageChange(STORAGE_KEYS.trades);
        }

        return nextTrade.id;
      },
      getTradeById(id) {
        return trades.find((trade) => trade.id === id);
      },
      updateProfile(nextProfile) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(nextProfile));
          notifyStorageChange(STORAGE_KEYS.profile);
        }
      },
      addTag(label) {
        const cleanLabel = label.trim();
        if (!cleanLabel) {
          return;
        }

        const nextTag: TradeTag = {
          id: `tag-${cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
          label: cleanLabel,
          tone: "accent",
        };
        const nextTags = [nextTag, ...tags];
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(nextTags));
          notifyStorageChange(STORAGE_KEYS.tags);
        }
      },
      addAccount(draft) {
        const nextAccount: Account = {
          id: `acct-${Date.now()}`,
          userId: profileState.id,
          name: draft.name,
          broker: draft.broker,
          balance: draft.balance,
          currency: draft.currency,
          type: draft.type,
        };
        const nextAccounts = [nextAccount, ...accounts];
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(nextAccounts));
          notifyStorageChange(STORAGE_KEYS.accounts);
        }
      },
      removeAccount(accountId) {
        if (accounts.length <= 1 || typeof window === "undefined") {
          return;
        }

        const nextAccounts = accounts.filter((account) => account.id !== accountId);
        const nextTrades = trades.filter((trade) => trade.accountId !== accountId);
        window.localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(nextAccounts));
        window.localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(nextTrades));
        notifyStorageChange(STORAGE_KEYS.accounts);
        notifyStorageChange(STORAGE_KEYS.trades);
      },
      removeTag(tagId) {
        if (typeof window === "undefined") {
          return;
        }

        const nextTags = tags.filter((tag) => tag.id !== tagId);
        const nextTrades = trades.map((trade) => ({
          ...trade,
          tags: trade.tags.filter((item) => item !== tagId),
        }));
        window.localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(nextTags));
        window.localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(nextTrades));
        notifyStorageChange(STORAGE_KEYS.tags);
        notifyStorageChange(STORAGE_KEYS.trades);
      },
    }),
    [accounts, profileState, tags, trades],
  );

  return <TradeStoreContext.Provider value={value}>{children}</TradeStoreContext.Provider>;
}

export function useTradeStore() {
  const context = useContext(TradeStoreContext);
  if (!context) {
    throw new Error("useTradeStore must be used inside TradeStoreProvider");
  }
  return context;
}
