import { addDays, format } from "date-fns";
import type { MarketCandle } from "../types/market.types";
import type { MarketDataProvider } from "./marketDataProvider.interface";

export class SampleMarketDataProvider implements MarketDataProvider {
  private readonly candlesBySymbol: Record<string, MarketCandle[]> = {
    BTC: generateBtcCandles(),
  };

  getCandles(symbol: string): MarketCandle[] {
    const candles = this.candlesBySymbol[symbol.toUpperCase()];

    if (!candles) {
      throw new Error(`No local sample market data found for symbol: ${symbol}`);
    }

    return candles;
  }
}

function generateBtcCandles(): MarketCandle[] {
  const startDate = new Date(2025, 0, 1);
  const candles: MarketCandle[] = [];
  let previousClose = 42000;

  for (let index = 0; index < 160; index += 1) {
    const trend = index * 42;
    const cycle = Math.sin(index / 6) * 1150;
    const shortCycle = Math.sin(index / 2.7) * 360;
    const shock = index % 37 === 0 ? -950 : index % 53 === 0 ? 1250 : 0;
    const close = roundPrice(42000 + trend + cycle + shortCycle + shock);
    const open = roundPrice(previousClose);
    const high = roundPrice(Math.max(open, close) + 260 + Math.abs(Math.sin(index)) * 180);
    const low = roundPrice(Math.min(open, close) - 260 - Math.abs(Math.cos(index)) * 160);
    const volume = Math.round(900 + Math.abs(Math.sin(index / 3)) * 420 + index * 3);

    candles.push({
      symbol: "BTC",
      date: format(addDays(startDate, index), "yyyy-MM-dd"),
      open,
      high,
      low,
      close,
      volume,
    });

    previousClose = close;
  }

  return candles;
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}
