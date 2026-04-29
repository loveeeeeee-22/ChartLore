import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type BrokerConnectionRow = {
  id: string;
  user_id: string;
  broker: "alpaca" | "oanda" | "csv" | "manual";
  label: string;
  status: "active" | "error" | "pending" | "disconnected";
  api_key: string | null;
  api_secret: string | null;
  account_id: string | null;
  last_synced_at: string | null;
  created_at: string;
};

type AccountRow = { id: string };
type StrategyRow = { id: string };

function buildServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function normalizeMarket(value: string) {
  return value.trim() || "Broker Import";
}

function toIso(value: string | null | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

export async function POST(request: Request) {
  try {
    const { connectionId } = (await request.json()) as { connectionId?: string };

    if (!connectionId) {
      return NextResponse.json({ error: "Missing connectionId." }, { status: 400 });
    }

    const supabase = buildServerClient();

    const connectionResult = await supabase
      .from("broker_connections")
      .select("*")
      .eq("id", connectionId)
      .single<BrokerConnectionRow>();

    if (connectionResult.error || !connectionResult.data) {
      return NextResponse.json(
        { error: connectionResult.error?.message ?? "Broker connection not found." },
        { status: 404 },
      );
    }

    const connection = connectionResult.data;

    if (connection.broker === "csv") {
      return NextResponse.json({ imported: 0, error: "CSV import must be done client-side" }, { status: 400 });
    }

    const [accountResult, strategyResult] = await Promise.all([
      supabase
        .from("accounts")
        .select("id")
        .eq("user_id", connection.user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single<AccountRow>(),
      supabase
        .from("strategies")
        .select("id")
        .eq("user_id", connection.user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single<StrategyRow>(),
    ]);

    if (accountResult.error || !accountResult.data) {
      return NextResponse.json(
        { error: "No local ChartLore account found for this user. Create one before syncing." },
        { status: 400 },
      );
    }

    if (strategyResult.error || !strategyResult.data) {
      return NextResponse.json(
        { error: "No local strategy found for this user. Create one before syncing." },
        { status: 400 },
      );
    }

    let mappedTrades: Array<Record<string, unknown>> = [];

    if (connection.broker === "alpaca") {
      if (!connection.api_key || !connection.api_secret) {
        return NextResponse.json({ error: "Missing Alpaca API credentials." }, { status: 400 });
      }

      const response = await fetch("https://api.alpaca.markets/v2/orders?status=closed&limit=100", {
        headers: {
          "APCA-API-KEY-ID": connection.api_key,
          "APCA-API-SECRET-KEY": connection.api_secret,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: `Alpaca sync failed: ${text}` }, { status: 400 });
      }

      const orders = (await response.json()) as Array<Record<string, string>>;

      mappedTrades = orders
        .filter((order) => order.symbol && order.side && order.filled_avg_price)
        .map((order) => {
          const quantity = Number(order.filled_qty ?? order.qty ?? 0);
          const filledPrice = Number(order.filled_avg_price ?? 0);
          const openedAt = toIso(order.submitted_at);
          const closedAt = toIso(order.filled_at ?? order.updated_at);

          return {
            id: `${connection.id}-alpaca-${order.id}`,
            user_id: connection.user_id,
            account_id: accountResult.data.id,
            strategy_id: strategyResult.data.id,
            symbol: normalizeSymbol(order.symbol ?? "UNKNOWN"),
            market: normalizeMarket(order.symbol ?? "Alpaca"),
            side: order.side === "sell" ? "short" : "long",
            quantity,
            entry_price: filledPrice,
            exit_price: filledPrice,
            stop_price: filledPrice,
            fees: 0,
            setup: `Imported ${connection.label}`,
            thesis: `Imported from Alpaca order ${order.id}`,
            opened_at: openedAt,
            closed_at: closedAt,
            conviction: 3,
          };
        });
    }

    if (connection.broker === "oanda") {
      if (!connection.api_key || !connection.account_id) {
        return NextResponse.json({ error: "Missing OANDA API key or account ID." }, { status: 400 });
      }

      const response = await fetch(
        `https://api-fxtrade.oanda.com/v3/accounts/${connection.account_id}/trades?state=CLOSED`,
        {
          headers: {
            Authorization: `Bearer ${connection.api_key}`,
          },
        },
      );

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: `OANDA sync failed: ${text}` }, { status: 400 });
      }

      const payload = (await response.json()) as {
        trades?: Array<Record<string, string>>;
      };

      mappedTrades = (payload.trades ?? []).map((trade) => {
        const quantity = Math.abs(Number(trade.initialUnits ?? 0));
        const entryPrice = Number(trade.price ?? 0);
        const exitPrice = Number(trade.averageClosePrice ?? trade.price ?? 0);

        return {
          id: `${connection.id}-oanda-${trade.id}`,
          user_id: connection.user_id,
          account_id: accountResult.data.id,
          strategy_id: strategyResult.data.id,
          symbol: normalizeSymbol((trade.instrument ?? "UNKNOWN").replace("_", "/")),
          market: normalizeMarket(trade.instrument ?? "OANDA"),
          side: Number(trade.initialUnits ?? 0) < 0 ? "short" : "long",
          quantity,
          entry_price: entryPrice,
          exit_price: exitPrice,
          stop_price: entryPrice,
          fees: 0,
          setup: `Imported ${connection.label}`,
          thesis: `Imported from OANDA trade ${trade.id}`,
          opened_at: toIso(trade.openTime),
          closed_at: toIso(trade.closeTime ?? trade.openTime),
          conviction: 3,
        };
      });
    }

    if (connection.broker === "manual") {
      return NextResponse.json({ imported: 0, error: "Manual connections do not support remote sync." }, { status: 400 });
    }

    if (mappedTrades.length === 0) {
      await supabase
        .from("broker_connections")
        .update({
          last_synced_at: new Date().toISOString(),
          status: "active",
        })
        .eq("id", connection.id);

      return NextResponse.json({ imported: 0 });
    }

    const upsertResult = await supabase.from("trades").upsert(mappedTrades, { onConflict: "id" });

    if (upsertResult.error) {
      return NextResponse.json({ error: upsertResult.error.message }, { status: 400 });
    }

    const syncTimestamp = new Date().toISOString();
    await supabase
      .from("broker_connections")
      .update({
        last_synced_at: syncTimestamp,
        status: "active",
      })
      .eq("id", connection.id);

    return NextResponse.json({ imported: mappedTrades.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Broker sync failed." },
      { status: 500 },
    );
  }
}
