import { existsSync, readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { MarketCandle } from "../types/market.types";

export type HistoricalDataValidationResult = {
  symbol: string;
  source: string;
  rows: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  missingValues: number;
  duplicateDates: string[];
  invalidOhlcRows: number;
  volumeIssues: number;
  sortedAscending: boolean;
  dataQualityScore: number;
  approvedForBacktesting: boolean;
  warnings: string[];
  errors: string[];
};

type CsvRecord = Record<string, string | undefined>;

export function parseHistoricalCsvFile(filePath: string, symbol: string): MarketCandle[] {
  if (!existsSync(filePath)) {
    throw new Error(`CSV market data file does not exist: ${filePath}`);
  }

  const rawCsv = readFileSync(filePath, "utf8");
  const records = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRecord[];

  const candles = records.map((record, index) => parseCsvRecord(record, index + 2, symbol));
  return candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function validateCandles(
  candles: MarketCandle[],
  symbol: string,
  source: string,
): HistoricalDataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dates = new Set<string>();
  const duplicateDates: string[] = [];
  let invalidOhlcRows = 0;
  let volumeIssues = 0;
  let sortedAscending = true;

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const previous = candles[index - 1];

    if (!candle) continue;

    if (dates.has(candle.date)) {
      duplicateDates.push(candle.date);
    }
    dates.add(candle.date);

    if (previous && new Date(candle.date).getTime() < new Date(previous.date).getTime()) {
      sortedAscending = false;
    }

    if (!isValidOhlc(candle)) {
      invalidOhlcRows += 1;
    }

    if (candle.volume < 0 || !Number.isFinite(candle.volume)) {
      volumeIssues += 1;
    }
  }

  if (candles.length === 0) errors.push("Dataset has no rows.");
  if (duplicateDates.length > 0) errors.push(`Duplicate dates found: ${duplicateDates.join(", ")}`);
  if (invalidOhlcRows > 0) errors.push(`${invalidOhlcRows} rows have invalid OHLC relationships.`);
  if (volumeIssues > 0) errors.push(`${volumeIssues} rows have invalid volume values.`);
  if (candles.length < 120) warnings.push("Dataset has fewer than 120 candles; validation confidence is limited.");
  if (!sortedAscending) warnings.push("Rows were not sorted ascending by date. Provider will sort rows before use.");

  const penalty = duplicateDates.length * 10 + invalidOhlcRows * 15 + volumeIssues * 10 + (candles.length < 120 ? 15 : 0);
  const dataQualityScore = Math.max(0, 100 - penalty);

  return {
    symbol: symbol.toUpperCase(),
    source,
    rows: candles.length,
    dateRange: {
      start: candles[0]?.date ?? null,
      end: candles[candles.length - 1]?.date ?? null,
    },
    missingValues: 0,
    duplicateDates,
    invalidOhlcRows,
    volumeIssues,
    sortedAscending,
    dataQualityScore,
    approvedForBacktesting: errors.length === 0 && candles.length >= 30,
    warnings,
    errors,
  };
}

export function validateHistoricalCsvFile(filePath: string, symbol: string): HistoricalDataValidationResult {
  try {
    const candles = parseHistoricalCsvFile(filePath, symbol);
    return validateCandles(candles, symbol, filePath);
  } catch (error) {
    return {
      symbol: symbol.toUpperCase(),
      source: filePath,
      rows: 0,
      dateRange: { start: null, end: null },
      missingValues: 0,
      duplicateDates: [],
      invalidOhlcRows: 0,
      volumeIssues: 0,
      sortedAscending: false,
      dataQualityScore: 0,
      approvedForBacktesting: false,
      warnings: [],
      errors: [error instanceof Error ? error.message : "Unknown CSV validation error."],
    };
  }
}

function parseCsvRecord(record: CsvRecord, lineNumber: number, symbol: string): MarketCandle {
  const requiredColumns = ["date", "open", "high", "low", "close", "volume"] as const;

  for (const column of requiredColumns) {
    const value = record[column];
    if (value === undefined || value === "") {
      throw new Error(`Missing value for "${column}" on CSV line ${lineNumber}.`);
    }
  }

  const date = normalizeDate(record.date ?? "", lineNumber);
  const open = parseNumber(record.open ?? "", "open", lineNumber);
  const high = parseNumber(record.high ?? "", "high", lineNumber);
  const low = parseNumber(record.low ?? "", "low", lineNumber);
  const close = parseNumber(record.close ?? "", "close", lineNumber);
  const volume = parseNumber(record.volume ?? "", "volume", lineNumber);
  const candle: MarketCandle = { symbol: symbol.toUpperCase(), date, open, high, low, close, volume };

  if (!isValidOhlc(candle)) {
    throw new Error(`Invalid OHLC relationship on CSV line ${lineNumber}.`);
  }

  if (volume < 0) {
    throw new Error(`Volume must be >= 0 on CSV line ${lineNumber}.`);
  }

  return candle;
}

function normalizeDate(value: string, lineNumber: number): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    throw new Error(`Invalid date "${value}" on CSV line ${lineNumber}.`);
  }

  return value.length >= 10 ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
}

function parseNumber(value: string, column: string, lineNumber: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for "${column}" on CSV line ${lineNumber}: ${value}`);
  }

  return parsed;
}

function isValidOhlc(candle: MarketCandle): boolean {
  return (
    candle.high >= candle.open &&
    candle.high >= candle.close &&
    candle.high >= candle.low &&
    candle.low <= candle.open &&
    candle.low <= candle.close &&
    candle.low <= candle.high
  );
}
