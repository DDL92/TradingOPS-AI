import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RiskLevel } from "../risk/riskScore";
import type { StrategyAction } from "../types/strategy.types";

export const PAPER_SAFETY_NOTICE = "Simulation only. Real trading is disabled.";
export const PAPER_DATA_DIR = "data/paper";
export const PAPER_SIGNALS_PATH = `${PAPER_DATA_DIR}/paper-signals.json`;
export const PAPER_TRADES_PATH = `${PAPER_DATA_DIR}/paper-trades.json`;
export const PAPER_WATCHLIST_PATH = `${PAPER_DATA_DIR}/paper-watchlist.json`;
export const PAPER_MODE = "PAPER_TEST_ONLY";

export type PaperMode = typeof PAPER_MODE;
export type PaperTradeStatus = "OPEN" | "CLOSED";
export type PaperTradeResult = "win" | "loss" | "breakeven";
export type PaperDataSource = "sample" | "csv";

export type PaperSignalEntry = {
  id: string;
  timestamp: string;
  symbol: string;
  strategy: string;
  dataSource: PaperDataSource;
  latestCandleDate: string;
  latestClose: number;
  signalAction: StrategyAction;
  confidence: number;
  reason: string;
  riskLevel: RiskLevel;
  mode: PaperMode;
  realMoneyAllowed: false;
};

export type PaperTradeEntry = {
  id: string;
  symbol: string;
  strategy: string;
  direction: "long";
  status: PaperTradeStatus;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  simulatedCapital: number;
  reasonOpened: string;
  realMoneyAllowed: false;
  exitDate?: string;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  result?: PaperTradeResult;
  reasonClosed?: string;
};

export type PaperWatchlistEntry = {
  symbol: string;
  strategy: string;
  mode: PaperMode;
  realMoneyAllowed: false;
  reason: string;
};

export function readPaperSignals(): PaperSignalEntry[] {
  return readJsonArray<PaperSignalEntry>(PAPER_SIGNALS_PATH);
}

export function writePaperSignals(signals: PaperSignalEntry[]): void {
  writeJsonArray(PAPER_SIGNALS_PATH, signals);
}

export function appendPaperSignal(signal: PaperSignalEntry): PaperSignalEntry[] {
  const signals = readPaperSignals();
  signals.push(signal);
  writePaperSignals(signals);
  return signals;
}

export function readPaperTrades(): PaperTradeEntry[] {
  return readJsonArray<PaperTradeEntry>(PAPER_TRADES_PATH);
}

export function writePaperTrades(trades: PaperTradeEntry[]): void {
  writeJsonArray(PAPER_TRADES_PATH, trades);
}

export function findOpenPaperTrade(symbol: string, strategy: string): PaperTradeEntry | undefined {
  return readPaperTrades().find(
    (trade) => trade.symbol === symbol.toUpperCase() && trade.strategy === strategy && trade.status === "OPEN",
  );
}

export function upsertPaperTrade(trade: PaperTradeEntry): PaperTradeEntry[] {
  const trades = readPaperTrades();
  const index = trades.findIndex((candidate) => candidate.id === trade.id);

  if (index >= 0) {
    trades[index] = trade;
  } else {
    trades.push(trade);
  }

  writePaperTrades(trades);
  return trades;
}

export function readPaperWatchlist(): PaperWatchlistEntry[] {
  return readJsonArray<PaperWatchlistEntry>(PAPER_WATCHLIST_PATH);
}

export function writePaperWatchlist(entries: PaperWatchlistEntry[]): void {
  writeJsonArray(PAPER_WATCHLIST_PATH, entries);
}

export function ensurePaperDataDir(): void {
  mkdirSync(PAPER_DATA_DIR, { recursive: true });
}

function readJsonArray<T>(path: string): T[] {
  ensurePaperDataDir();
  if (!existsSync(path)) return [];

  const raw = readFileSync(path, "utf8").trim();
  if (raw.length === 0) return [];

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${path} to contain a JSON array.`);
  }

  return parsed as T[];
}

function writeJsonArray<T>(path: string, entries: T[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}
