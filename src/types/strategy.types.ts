import type { MarketCandle } from "./market.types";

export type StrategyAction = "BUY" | "SELL" | "HOLD";

export type StrategySignal = {
  action: StrategyAction;
  reason: string;
  confidence: number;
};

export type Strategy = {
  name: string;
  key: string;
  generateSignal(candles: MarketCandle[], index: number): StrategySignal;
};
