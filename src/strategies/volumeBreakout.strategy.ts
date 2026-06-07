import { calculateAverageVolume, calculateSupportResistance } from "../indicators";
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
    const twentyLevels = calculateSupportResistance(candles, index, 20);
    const tenLevels = calculateSupportResistance(candles, index, 10);
    const averageVolume = calculateAverageVolume(candles, index, 20);

    if (!current || !twentyLevels || !tenLevels || averageVolume === null) {
      return { action: "HOLD", reason: "Volume breakout windows are incomplete.", confidence: 0 };
    }

    if (current.close > twentyLevels.resistance && current.volume >= averageVolume * 1.5) {
      return {
        action: "BUY",
        reason: "Close broke the 20-candle high with volume at least 1.5x average.",
        confidence: Number(Math.min(0.95, 0.6 + current.volume / averageVolume / 10).toFixed(2)),
      };
    }

    if (current.close < tenLevels.support) {
      return {
        action: "SELL",
        reason: "Close fell below the previous 10-candle low.",
        confidence: 0.68,
      };
    }

    return { action: "HOLD", reason: "No volume-confirmed breakout.", confidence: 0.25 };
  }
}
