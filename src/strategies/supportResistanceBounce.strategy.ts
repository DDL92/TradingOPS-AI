import { calculateSupportResistance, isWithinPercent } from "../indicators";
import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";

export class SupportResistanceBounceStrategy implements Strategy {
  name = "Support Resistance Bounce";
  key = "support-resistance";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    if (index < 20) {
      return { action: "HOLD", reason: "Not enough candles for support/resistance levels.", confidence: 0 };
    }

    const current = candles[index];
    const levels = calculateSupportResistance(candles, index, 20);

    if (!current || !levels) {
      return { action: "HOLD", reason: "Support/resistance window is incomplete.", confidence: 0 };
    }

    const nearSupport = isWithinPercent(current.close, levels.support, 1.5);
    const nearResistance = isWithinPercent(current.close, levels.resistance, 1.5);
    const closesGreen = current.close > current.open;

    if (nearSupport && closesGreen) {
      return {
        action: "BUY",
        reason: "Price bounced near 20-candle support and closed green.",
        confidence: 0.72,
      };
    }

    if (nearResistance || current.close < levels.support) {
      return {
        action: "SELL",
        reason: nearResistance ? "Price is near 20-candle resistance." : "Price broke below support.",
        confidence: 0.7,
      };
    }

    return { action: "HOLD", reason: "Price is between support and resistance.", confidence: 0.3 };
  }
}
