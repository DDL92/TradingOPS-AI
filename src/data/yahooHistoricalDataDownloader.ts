import YahooFinance from "yahoo-finance2";
import type { MarketCandle } from "../types/market.types";
import { getYahooSymbol } from "./yahooSymbolMap";

const yahooFinance = new YahooFinance({ suppressNotices: ["ripHistorical"] });

export type YahooDownloadOptions = {
  startDate?: string;
  endDate?: string;
  interval?: "1d" | "1wk" | "1mo";
};

export type YahooDownloadResult = {
  symbol: string;
  yahooSymbol: string;
  candles: MarketCandle[];
  skippedRows: number;
  warnings: string[];
};

type YahooHistoricalRow = {
  date?: Date | string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

export async function downloadYahooHistoricalData(
  internalSymbol: string,
  options: YahooDownloadOptions = {},
): Promise<YahooDownloadResult> {
  const mapping = getYahooSymbol(internalSymbol);
  const period1 = options.startDate ? new Date(options.startDate) : yearsAgo(5);
  const period2 = options.endDate ? new Date(options.endDate) : new Date();
  const interval = options.interval ?? "1d";
  const warnings: string[] = [];

  validateDate(period1, "startDate");
  validateDate(period2, "endDate");

  let rows: YahooHistoricalRow[];
  try {
    rows = (await yahooFinance.historical(mapping.yahooSymbol, {
      period1,
      period2,
      interval,
    })) as YahooHistoricalRow[];
  } catch (error) {
    throw new Error(
      `Unable to download Yahoo historical data for ${mapping.internalSymbol} (${mapping.yahooSymbol}). ${
        error instanceof Error ? error.message : "Unknown network or provider error."
      }`,
    );
  }

  const candlesByDate = new Map<string, MarketCandle>();
  let skippedRows = 0;

  for (const row of rows) {
    const candle = toCandle(mapping.internalSymbol, row);

    if (!candle || !isValidCandle(candle)) {
      skippedRows += 1;
      continue;
    }

    if (candlesByDate.has(candle.date)) {
      warnings.push(`Duplicate date removed for ${mapping.internalSymbol}: ${candle.date}`);
    }

    candlesByDate.set(candle.date, candle);
  }

  const candles = [...candlesByDate.values()].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (candles.length === 0) {
    warnings.push(`No valid candles were downloaded for ${mapping.internalSymbol}.`);
  }

  if (skippedRows > 0) {
    warnings.push(`${skippedRows} incomplete or invalid Yahoo rows were skipped.`);
  }

  return {
    symbol: mapping.internalSymbol,
    yahooSymbol: mapping.yahooSymbol,
    candles,
    skippedRows,
    warnings,
  };
}

function toCandle(symbol: string, row: YahooHistoricalRow): MarketCandle | null {
  if (
    row.date === undefined ||
    row.open === undefined ||
    row.high === undefined ||
    row.low === undefined ||
    row.close === undefined ||
    row.volume === undefined ||
    row.open === null ||
    row.high === null ||
    row.low === null ||
    row.close === null ||
    row.volume === null
  ) {
    return null;
  }

  return {
    symbol,
    date: formatDate(row.date),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  };
}

function isValidCandle(candle: MarketCandle): boolean {
  return (
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    Number.isFinite(candle.volume) &&
    candle.high >= candle.open &&
    candle.high >= candle.close &&
    candle.high >= candle.low &&
    candle.low <= candle.open &&
    candle.low <= candle.close &&
    candle.low <= candle.high &&
    candle.volume >= 0
  );
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function validateDate(date: Date, label: string): void {
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label}. Use YYYY-MM-DD.`);
  }
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
