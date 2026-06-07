import type { MarketCandle } from "../types/market.types";

export interface MarketDataProvider {
  getCandles(symbol: string): MarketCandle[];
}
