import type { Trade } from "./trade.types";

export type BacktestResult = {
  symbol: string;
  strategy: string;
  initialCapital: number;
  finalCapital: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  approvedForPaperTrading: boolean;
  rejectionReasons: string[];
  trades: Trade[];
};

export type BacktestMetrics = Omit<
  BacktestResult,
  "symbol" | "strategy" | "initialCapital" | "finalCapital" | "approvedForPaperTrading" | "rejectionReasons" | "trades"
>;
