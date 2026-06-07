import {
  appendPaperSignal,
  PAPER_MODE,
  type PaperDataSource,
  type PaperSignalEntry,
} from "./persistentPaperJournal";
import type { RiskLevel } from "../risk/riskScore";
import type { MarketCandle } from "../types/market.types";
import type { StrategySignal } from "../types/strategy.types";

export type RecordPaperSignalInput = {
  symbol: string;
  strategy: string;
  dataSource: PaperDataSource;
  latestCandle: MarketCandle;
  signal: StrategySignal;
  riskLevel: RiskLevel;
  sequence: number;
  timestamp?: string;
};

export function recordPaperSignal(input: RecordPaperSignalInput): PaperSignalEntry {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const entry: PaperSignalEntry = {
    id: buildSignalId(input.symbol, input.strategy, timestamp, input.sequence),
    timestamp,
    symbol: input.symbol.toUpperCase(),
    strategy: input.strategy,
    dataSource: input.dataSource,
    latestCandleDate: input.latestCandle.date,
    latestClose: round(input.latestCandle.close),
    signalAction: input.signal.action,
    confidence: input.signal.confidence,
    reason: input.signal.reason,
    riskLevel: input.riskLevel,
    mode: PAPER_MODE,
    realMoneyAllowed: false,
  };

  appendPaperSignal(entry);
  return entry;
}

function buildSignalId(symbol: string, strategy: string, timestamp: string, sequence: number): string {
  return `signal-${symbol.toUpperCase()}-${strategy}-${timestamp}-${sequence}`.replace(/[^A-Za-z0-9_-]/g, "-");
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
