import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";

export class VolumeBreakoutStrategy implements Strategy {
  name = "Volume Breakout";
  key = "volume-breakout";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    if (index < 20) {
      return { action: "HOLD", reason: "Not enough candles for volume breakout.", confidence: 0 };
    }

    const current = candles[index];
    const previousTwenty = candles.slice(index - 20, index);
    const previousTen = candles.slice(index - 10, index);

    if (!current || previousTwenty.length < 20 || previousTen.length < 10) {
      return { action: "HOLD", reason: "Volume breakout windows are incomplete.", confidence: 0 };
    }

    const previousHigh = Math.max(...previousTwenty.map((candle) => candle.high));
    const previousLow = Math.min(...previousTen.map((candle) => candle.low));
    const averageVolume = previousTwenty.reduce((sum, candle) => sum + candle.volume, 0) / previousTwenty.length;

    if (current.close > previousHigh && current.volume >= averageVolume * 1.5) {
      return {
        action: "BUY",
        reason: "Close broke the 20-candle high with volume at least 1.5x average.",
        confidence: Number(Math.min(0.95, 0.6 + current.volume / averageVolume / 10).toFixed(2)),
      };
    }

    if (current.close < previousLow) {
      return {
        action: "SELL",
        reason: "Close fell below the previous 10-candle low.",
        confidence: 0.68,
      };
    }

    return { action: "HOLD", reason: "No volume-confirmed breakout.", confidence: 0.25 };
  }
}
