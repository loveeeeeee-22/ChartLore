"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  accounts as seedAccounts,
  dailySnapshots as seedDailySnapshots,
  profile as seedProfile,
  strategies as seedStrategies,
  tags as seedTags,
  tradeExecutions as seedTradeExecutions,
  tradeNotes as seedTradeNotes,
  trades as seedTrades,
} from "@/lib/mock-data";
import { notifyStorageChange, STORAGE_KEYS } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase";
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
import { useAuth } from "@/components/providers/auth-provider";

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
  saveTrade: (draft: TradeDraft) => Promise<string>;
  getTradeById: (id: string) => Trade | undefined;
  updateProfile: (nextProfile: Profile) => Promise<void>;
  addTag: (label: string) => Promise<TradeTag | undefined>;
  addAccount: (draft: AccountDraft) => Promise<Account | undefined>;
  removeAccount: (accountId: string) => Promise<void>;
  removeTag: (tagId: string) => Promise<void>;
}

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  tier: "pro" | "elite";
  focus: string;
  country: string;
  phone: string;
  city: string;
  timezone: string;
};

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  broker: string;
  balance: number;
  currency: string;
  type: Account["type"];
};

type StrategyRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  status: Strategy["status"];
  playbook: string;
  thesis: string;
  timeframes: string[] | null;
  strategy_tags: string[] | null;
};

type TagRow = {
  id: string;
  user_id: string;
  label: string;
  tone: TradeTag["tone"];
};

type TradeRow = {
  id: string;
  user_id: string;
  account_id: string;
  strategy_id: string;
  symbol: string;
  market: string;
  side: Trade["side"];
  quantity: number;
  entry_price: number;
  exit_price: number;
  stop_price: number;
  fees: number;
  setup: string;
  thesis: string;
  screenshot_url: string | null;
  opened_at: string;
  closed_at: string;
  conviction: number;
};

type TradeTagLinkRow = {
  trade_id: string;
  tag_id: string;
};

type TradeNoteRow = {
  id: string;
  trade_id: string;
  content: string;
  created_at: string;
};

type TradeExecutionRow = {
  id: string;
  trade_id: string;
  quantity: number;
  price: number;
  executed_at: string;
  kind: TradeExecution["kind"];
};

type DailySnapshotRow = {
  id: string;
  date: string;
  net_pnl: number;
  account_balance: number;
  drawdown: number;
};

const TradeStoreContext = createContext<TradeStoreValue | null>(null);

function buildInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStoredItem<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function setStoredItem<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  notifyStorageChange(key);
}

function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    initials: row.initials,
    tier: row.tier,
    focus: row.focus,
    country: row.country,
    phone: row.phone,
    city: row.city,
    timezone: row.timezone,
  };
}

function accountFromRow(row: AccountRow): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    broker: row.broker,
    balance: Number(row.balance),
    currency: row.currency,
    type: row.type,
  };
}

function strategyFromRow(row: StrategyRow): Strategy {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    playbook: row.playbook,
    thesis: row.thesis,
    timeframes: row.timeframes ?? [],
    tags: row.strategy_tags ?? [],
  };
}

function tagFromRow(row: TagRow): TradeTag {
  return {
    id: row.id,
    label: row.label,
    tone: row.tone,
  };
}

function noteFromRow(row: TradeNoteRow): TradeNote {
  return {
    id: row.id,
    tradeId: row.trade_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function executionFromRow(row: TradeExecutionRow): TradeExecution {
  return {
    id: row.id,
    tradeId: row.trade_id,
    quantity: Number(row.quantity),
    price: Number(row.price),
    executedAt: row.executed_at,
    kind: row.kind,
  };
}

function snapshotFromRow(row: DailySnapshotRow): DailySnapshot {
  return {
    id: row.id,
    date: row.date,
    netPnl: Number(row.net_pnl),
    accountBalance: Number(row.account_balance),
    drawdown: Number(row.drawdown),
  };
}

function tradeFromRow(
  row: TradeRow,
  tagLinks: TradeTagLinkRow[],
  notes: TradeNote[],
  executions: TradeExecution[],
): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    strategyId: row.strategy_id,
    symbol: row.symbol,
    market: row.market,
    side: row.side,
    quantity: Number(row.quantity),
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    stopPrice: Number(row.stop_price),
    fees: Number(row.fees),
    setup: row.setup,
    thesis: row.thesis,
    screenshot: row.screenshot_url ?? undefined,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    conviction: row.conviction,
    tags: tagLinks.filter((link) => link.trade_id === row.id).map((link) => link.tag_id),
    noteIds: notes.filter((note) => note.tradeId === row.id).map((note) => note.id),
    executionIds: executions.filter((execution) => execution.tradeId === row.id).map((execution) => execution.id),
  };
}

function toProfileInsert(profile: Profile) {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    initials: profile.initials,
    tier: profile.tier,
    focus: profile.focus,
    country: profile.country,
    phone: profile.phone,
    city: profile.city,
    timezone: profile.timezone,
  };
}

function toTradeInsert(userId: string, draft: TradeDraft) {
  return {
    id: draft.id,
    user_id: userId,
    account_id: draft.accountId,
    strategy_id: draft.strategyId,
    symbol: draft.symbol,
    market: draft.market,
    side: draft.side,
    quantity: draft.quantity,
    entry_price: draft.entryPrice,
    exit_price: draft.exitPrice,
    stop_price: draft.stopPrice,
    fees: draft.fees,
    setup: draft.setup,
    thesis: draft.thesis,
    opened_at: draft.openedAt,
    closed_at: draft.closedAt,
    conviction: draft.conviction,
  };
}

export function TradeStoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const hasSupa = Boolean(getSupabaseBrowserClient());
  const [profile, setProfile] = useState<Profile | null>(() =>
    hasSupa ? null : getStoredItem(STORAGE_KEYS.profile, seedProfile),
  );
  const [accounts, setAccounts] = useState<Account[]>(() =>
    hasSupa ? [] : getStoredItem(STORAGE_KEYS.accounts, seedAccounts),
  );
  const [strategies, setStrategies] = useState<Strategy[]>(() => (hasSupa ? [] : seedStrategies));
  const [tags, setTags] = useState<TradeTag[]>(() =>
    hasSupa ? [] : getStoredItem(STORAGE_KEYS.tags, seedTags),
  );
  const [notes, setNotes] = useState<TradeNote[]>(() => (hasSupa ? [] : seedTradeNotes));
  const [executions, setExecutions] = useState<TradeExecution[]>(() =>
    hasSupa ? [] : seedTradeExecutions,
  );
  const [dailySnapshots, setDailySnapshots] = useState<DailySnapshot[]>(() =>
    hasSupa ? [] : seedDailySnapshots,
  );
  const [trades, setTrades] = useState<Trade[]>(() =>
    hasSupa ? [] : getStoredItem(STORAGE_KEYS.trades, seedTrades),
  );

  const supabase = getSupabaseBrowserClient();
  const isSupabaseMode = Boolean(supabase && session && session.id !== "demo-user");
  const safeProfile = useMemo(
    () =>
      profile ??
      (session
        ? {
            id: session.id,
            email: session.email,
            fullName: session.fullName || "ChartLore Trader",
            initials: buildInitials(session.fullName || "ChartLore Trader"),
            tier: "pro" as const,
            focus: "",
            country: "",
            phone: "",
            city: "",
            timezone: "UTC",
          }
        : seedProfile),
    [profile, session],
  );

  useEffect(() => {
    if (!isSupabaseMode) {
      return;
    }

    let cancelled = false;

    const loadSupabaseState = async () => {
      if (!supabase || !session) {
        return;
      }

      const userId = session.id;
      const profileFallback: Profile = {
        id: userId,
        email: session.email,
        fullName: session.fullName || "ChartLore Trader",
        initials: buildInitials(session.fullName || "ChartLore Trader"),
        tier: "pro",
        focus: "",
        country: "",
        phone: "",
        city: "",
        timezone: "UTC",
      };

      const profileQuery = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle<ProfileRow>();

      if (profileQuery.error) {
        console.error("Failed to load profile", profileQuery.error);
      }

      if (!profileQuery.data) {
        const insertResult = await supabase.from("profiles").insert(toProfileInsert(profileFallback));
        if (insertResult.error) {
          console.error("Failed to create profile", insertResult.error);
        }
      }

      const [strategiesSeedCheck, tagsSeedCheck] = await Promise.all([
        supabase.from("strategies").select("id").eq("user_id", userId).limit(1),
        supabase.from("tags").select("id").eq("user_id", userId).limit(1),
      ]);

      if (!strategiesSeedCheck.error && (strategiesSeedCheck.data?.length ?? 0) === 0) {
        const seededStrategies = seedStrategies.map((strategy) => ({
          id: strategy.id,
          user_id: userId,
          name: strategy.name,
          slug: strategy.slug,
          status: strategy.status,
          playbook: strategy.playbook,
          thesis: strategy.thesis,
          timeframes: strategy.timeframes,
          strategy_tags: strategy.tags,
        }));
        const strategyInsert = await supabase.from("strategies").upsert(seededStrategies, {
          onConflict: "id",
        });
        if (strategyInsert.error) {
          console.error("Failed to seed strategies", strategyInsert.error);
        }
      }

      if (!tagsSeedCheck.error && (tagsSeedCheck.data?.length ?? 0) === 0) {
        const seededTags = seedTags.map((tag) => ({
          id: tag.id,
          user_id: userId,
          label: tag.label,
          tone: tag.tone,
        }));
        const tagInsert = await supabase.from("tags").upsert(seededTags, { onConflict: "id" });
        if (tagInsert.error) {
          console.error("Failed to seed tags", tagInsert.error);
        }
      }

      const [
        profileResult,
        accountsResult,
        strategiesResult,
        tagsResult,
        tradesResult,
        tradeTagsResult,
        notesResult,
        executionsResult,
        snapshotsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single<ProfileRow>(),
        supabase.from("accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("strategies").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("tags").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("trades").select("*").eq("user_id", userId).order("opened_at", { ascending: false }),
        supabase.from("trade_tags").select("trade_id, tag_id").eq("user_id", userId),
        supabase.from("trade_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("trade_executions").select("*").eq("user_id", userId).order("executed_at", { ascending: false }),
        supabase.from("daily_snapshots").select("*").eq("user_id", userId).order("date", { ascending: false }),
      ]);

      if (cancelled) {
        return;
      }

      if (profileResult.error) console.error("Failed to fetch profile", profileResult.error);
      if (accountsResult.error) console.error("Failed to fetch accounts", accountsResult.error);
      if (strategiesResult.error) console.error("Failed to fetch strategies", strategiesResult.error);
      if (tagsResult.error) console.error("Failed to fetch tags", tagsResult.error);
      if (tradesResult.error) console.error("Failed to fetch trades", tradesResult.error);
      if (tradeTagsResult.error) console.error("Failed to fetch trade tags", tradeTagsResult.error);
      if (notesResult.error) console.error("Failed to fetch notes", notesResult.error);
      if (executionsResult.error) console.error("Failed to fetch executions", executionsResult.error);
      if (snapshotsResult.error) console.error("Failed to fetch snapshots", snapshotsResult.error);

      const nextNotes = (notesResult.data ?? []).map((row) => noteFromRow(row as TradeNoteRow));
      const nextExecutions = (executionsResult.data ?? []).map((row) =>
        executionFromRow(row as TradeExecutionRow),
      );

      setProfile(profileResult.data ? profileFromRow(profileResult.data as ProfileRow) : profileFallback);
      setAccounts((accountsResult.data ?? []).map((row) => accountFromRow(row as AccountRow)));
      setStrategies((strategiesResult.data ?? []).map((row) => strategyFromRow(row as StrategyRow)));
      setTags((tagsResult.data ?? []).map((row) => tagFromRow(row as TagRow)));
      setNotes(nextNotes);
      setExecutions(nextExecutions);
      setDailySnapshots((snapshotsResult.data ?? []).map((row) => snapshotFromRow(row as DailySnapshotRow)));
      setTrades(
        (tradesResult.data ?? []).map((row) =>
          tradeFromRow(
            row as TradeRow,
            (tradeTagsResult.data ?? []) as TradeTagLinkRow[],
            nextNotes,
            nextExecutions,
          ),
        ),
      );
    };

    void loadSupabaseState();

    return () => {
      cancelled = true;
    };
  }, [isSupabaseMode, session, supabase]);

  const value = useMemo<TradeStoreValue>(
    () => ({
      profile: safeProfile,
      accounts,
      strategies,
      tags,
      notes,
      executions,
      dailySnapshots,
      trades,
      async saveTrade(draft) {
        const nextTrade: Trade = {
          id: draft.id ?? `trade-${Date.now()}`,
          userId: safeProfile.id,
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
          noteIds: draft.id ? trades.find((trade) => trade.id === draft.id)?.noteIds ?? [] : [],
          executionIds: draft.id
            ? trades.find((trade) => trade.id === draft.id)?.executionIds ?? []
            : [],
        };

        if (!isSupabaseMode || !supabase || !session) {
          const exists = trades.some((trade) => trade.id === nextTrade.id);
          const nextTrades = exists
            ? trades.map((trade) => (trade.id === nextTrade.id ? nextTrade : trade))
            : [nextTrade, ...trades];
          setTrades(nextTrades);
          setStoredItem(STORAGE_KEYS.trades, nextTrades);
          return nextTrade.id;
        }

        const tradeUpsert = await supabase
          .from("trades")
          .upsert(toTradeInsert(session.id, { ...draft, id: nextTrade.id }), { onConflict: "id" });

        if (tradeUpsert.error) {
          console.error("Failed to save trade", tradeUpsert.error);
          return nextTrade.id;
        }

        const deleteLinks = await supabase
          .from("trade_tags")
          .delete()
          .eq("user_id", session.id)
          .eq("trade_id", nextTrade.id);
        if (deleteLinks.error) {
          console.error("Failed to reset trade tags", deleteLinks.error);
        }

        if (draft.tags.length > 0) {
          const insertLinks = await supabase.from("trade_tags").insert(
            draft.tags.map((tagId) => ({
              user_id: session.id,
              trade_id: nextTrade.id,
              tag_id: tagId,
            })),
          );
          if (insertLinks.error) {
            console.error("Failed to save trade tags", insertLinks.error);
          }
        }

        setTrades((current) => {
          const exists = current.some((trade) => trade.id === nextTrade.id);
          return exists
            ? current.map((trade) => (trade.id === nextTrade.id ? nextTrade : trade))
            : [nextTrade, ...current];
        });
        return nextTrade.id;
      },
      getTradeById(id) {
        return trades.find((trade) => trade.id === id);
      },
      async updateProfile(nextProfile) {
        setProfile(nextProfile);

        if (!isSupabaseMode || !supabase || !session) {
          setStoredItem(STORAGE_KEYS.profile, nextProfile);
          return;
        }

        const result = await supabase.from("profiles").upsert(toProfileInsert(nextProfile), {
          onConflict: "id",
        });
        if (result.error) {
          console.error("Failed to update profile", result.error);
        }
      },
      async addTag(label) {
        const cleanLabel = label.trim();
        if (!cleanLabel) {
          return undefined;
        }

        if (!isSupabaseMode || !supabase || !session) {
          const nextTag: TradeTag = {
            id: `tag-${cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
            label: cleanLabel,
            tone: "accent",
          };
          const nextTags = [nextTag, ...tags];
          setTags(nextTags);
          setStoredItem(STORAGE_KEYS.tags, nextTags);
          return nextTag;
        }

        const existing = tags.find((tag) => tag.label.toLowerCase() === cleanLabel.toLowerCase());
        if (existing) {
          return existing;
        }

        const result = await supabase
          .from("tags")
          .insert({
            user_id: session.id,
            label: cleanLabel,
            tone: "accent",
          })
          .select("*")
          .single<TagRow>();

        if (result.error || !result.data) {
          console.error("Failed to create tag", result.error);
          return undefined;
        }

        const nextTag = tagFromRow(result.data as TagRow);
        setTags((current) => [nextTag, ...current]);
        return nextTag;
      },
      async addAccount(draft) {
        if (!isSupabaseMode || !supabase || !session) {
          const nextAccount: Account = {
            id: `acct-${Date.now()}`,
            userId: safeProfile.id,
            name: draft.name,
            broker: draft.broker,
            balance: draft.balance,
            currency: draft.currency,
            type: draft.type,
          };
          const nextAccounts = [nextAccount, ...accounts];
          setAccounts(nextAccounts);
          setStoredItem(STORAGE_KEYS.accounts, nextAccounts);
          return nextAccount;
        }

        const result = await supabase
          .from("accounts")
          .insert({
            user_id: session.id,
            name: draft.name,
            broker: draft.broker,
            balance: draft.balance,
            currency: draft.currency,
            type: draft.type,
          })
          .select("*")
          .single<AccountRow>();

        if (result.error || !result.data) {
          console.error("Failed to create account", result.error);
          return undefined;
        }

        const nextAccount = accountFromRow(result.data as AccountRow);
        setAccounts((current) => [nextAccount, ...current]);
        return nextAccount;
      },
      async removeAccount(accountId) {
        if (accounts.length <= 1) {
          return;
        }

        if (!isSupabaseMode || !supabase || !session) {
          const nextAccounts = accounts.filter((account) => account.id !== accountId);
          const nextTrades = trades.filter((trade) => trade.accountId !== accountId);
          setAccounts(nextAccounts);
          setTrades(nextTrades);
          setStoredItem(STORAGE_KEYS.accounts, nextAccounts);
          setStoredItem(STORAGE_KEYS.trades, nextTrades);
          return;
        }

        const tradeIds = trades.filter((trade) => trade.accountId === accountId).map((trade) => trade.id);
        if (tradeIds.length > 0) {
          const deleteTradeTags = await supabase
            .from("trade_tags")
            .delete()
            .eq("user_id", session.id)
            .in("trade_id", tradeIds);
          if (deleteTradeTags.error) {
            console.error("Failed to delete trade tags for account", deleteTradeTags.error);
          }

          const deleteTrades = await supabase
            .from("trades")
            .delete()
            .eq("user_id", session.id)
            .eq("account_id", accountId);
          if (deleteTrades.error) {
            console.error("Failed to delete trades for account", deleteTrades.error);
          }
        }

        const deleteAccount = await supabase
          .from("accounts")
          .delete()
          .eq("user_id", session.id)
          .eq("id", accountId);
        if (deleteAccount.error) {
          console.error("Failed to delete account", deleteAccount.error);
          return;
        }

        setAccounts((current) => current.filter((account) => account.id !== accountId));
        setTrades((current) => current.filter((trade) => trade.accountId !== accountId));
      },
      async removeTag(tagId) {
        if (!isSupabaseMode || !supabase || !session) {
          const nextTags = tags.filter((tag) => tag.id !== tagId);
          const nextTrades = trades.map((trade) => ({
            ...trade,
            tags: trade.tags.filter((item) => item !== tagId),
          }));
          setTags(nextTags);
          setTrades(nextTrades);
          setStoredItem(STORAGE_KEYS.tags, nextTags);
          setStoredItem(STORAGE_KEYS.trades, nextTrades);
          return;
        }

        const deleteLinks = await supabase
          .from("trade_tags")
          .delete()
          .eq("user_id", session.id)
          .eq("tag_id", tagId);
        if (deleteLinks.error) {
          console.error("Failed to delete trade-tag links", deleteLinks.error);
        }

        const deleteTag = await supabase
          .from("tags")
          .delete()
          .eq("user_id", session.id)
          .eq("id", tagId);
        if (deleteTag.error) {
          console.error("Failed to delete tag", deleteTag.error);
          return;
        }

        setTags((current) => current.filter((tag) => tag.id !== tagId));
        setTrades((current) =>
          current.map((trade) => ({
            ...trade,
            tags: trade.tags.filter((item) => item !== tagId),
          })),
        );
      },
    }),
    [accounts, dailySnapshots, executions, isSupabaseMode, notes, safeProfile, session, strategies, supabase, tags, trades],
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
