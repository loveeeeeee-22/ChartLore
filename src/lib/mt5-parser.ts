export interface ParsedTrade {
  symbol: string;
  side: "long" | "short";
  volume: number;
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  takeProfit: number;
  profit: number;
  commission: number;
  swap: number;
  openedAt: string;
  closedAt: string;
  setup: string;
}

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, "").replace(/\s+/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid number");
  }
  return parsed;
}

function parseMt5Date(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parsed.toISOString();
}

function isSkippableRow(cells: string[]) {
  const rowText = cells.join(" ").toLowerCase();
  return (
    cells.length === 0 ||
    rowText.includes("open time") ||
    rowText.includes("position") ||
    rowText.includes("positions") ||
    rowText.includes("deals") ||
    rowText.includes("profit factor") ||
    rowText.includes("expected payoff") ||
    rowText.includes("drawdown") ||
    rowText.includes("balance") ||
    rowText.includes("total")
  );
}

export function parseMT5Report(fileContent: string): ParsedTrade[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(fileContent, "text/html");
  const rows = Array.from(document.querySelectorAll("tr"));
  const parsedTrades: ParsedTrade[] = [];

  for (const row of rows) {
    try {
      const cells = Array.from(row.querySelectorAll("td, th")).map((cell) => cell.textContent?.trim() ?? "");

      if (isSkippableRow(cells) || cells.length !== 14) {
        continue;
      }

      const type = cells[3].toLowerCase();
      if (type !== "buy" && type !== "sell") {
        continue;
      }

      parsedTrades.push({
        symbol: cells[2],
        side: type === "buy" ? "long" : "short",
        volume: parseNumber(cells[5]),
        entryPrice: parseNumber(cells[6]),
        stopPrice: parseNumber(cells[7]),
        takeProfit: parseNumber(cells[8]),
        exitPrice: parseNumber(cells[10]),
        commission: parseNumber(cells[11]),
        swap: parseNumber(cells[12]),
        profit: parseNumber(cells[13]),
        openedAt: parseMt5Date(cells[0]),
        closedAt: parseMt5Date(cells[9]),
        setup: cells[4],
      });
    } catch {
      continue;
    }
  }

  return parsedTrades;
}
