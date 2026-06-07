import type { MarketCandle } from "../types/market.types";
import { SampleMarketDataProvider } from "./sampleMarketDataProvider";

const provider = new SampleMarketDataProvider();

export const sampleMarketData: Record<string, MarketCandle[]> = {
  BTC: provider.getCandles("BTC"),
};

export function getMarketData(symbol: string): MarketCandle[] {
  return provider.getCandles(symbol);
}
