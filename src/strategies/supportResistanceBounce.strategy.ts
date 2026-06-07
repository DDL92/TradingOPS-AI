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
    const previousTwenty = candles.slice(index - 20, index);

    if (!current || previousTwenty.length < 20) {
      return { action: "HOLD", reason: "Support/resistance window is incomplete.", confidence: 0 };
    }

    const support = Math.min(...previousTwenty.map((candle) => candle.low));
    const resistance = Math.max(...previousTwenty.map((candle) => candle.high));
    const nearSupport = Math.abs(current.close - support) / support <= 0.015;
    const nearResistance = Math.abs(resistance - current.close) / resistance <= 0.015;
    const closesGreen = current.close > current.open;

    if (nearSupport && closesGreen) {
      return {
        action: "BUY",
        reason: "Price bounced near 20-candle support and closed green.",
        confidence: 0.72,
      };
    }

    if (nearResistance || current.close < support) {
      return {
        action: "SELL",
        reason: nearResistance ? "Price is near 20-candle resistance." : "Price broke below support.",
        confidence: 0.7,
      };
    }

    return { action: "HOLD", reason: "Price is between support and resistance.", confidence: 0.3 };
  }
}
