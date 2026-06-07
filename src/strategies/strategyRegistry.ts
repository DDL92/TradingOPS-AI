import { BreakoutStrategy } from "./breakout.strategy";
import { EmaCrossoverStrategy } from "./emaCrossover.strategy";
import { MacdConfirmationStrategy } from "./macdConfirmation.strategy";
import { RsiMeanReversionStrategy } from "./rsiMeanReversion.strategy";
import { SupportResistanceBounceStrategy } from "./supportResistanceBounce.strategy";
import { VolumeBreakoutStrategy } from "./volumeBreakout.strategy";
import { VwapApproximationStrategy } from "./vwapApproximation.strategy";
import type { Strategy } from "../types/strategy.types";

export const strategies: Strategy[] = [
  new RsiMeanReversionStrategy(),
  new EmaCrossoverStrategy(),
  new BreakoutStrategy(),
  new MacdConfirmationStrategy(),
  new VolumeBreakoutStrategy(),
  new SupportResistanceBounceStrategy(),
  new VwapApproximationStrategy(),
];

export function getStrategyByKey(key: string): Strategy {
  const strategy = strategies.find((candidate) => candidate.key === key.toLowerCase());

  if (!strategy) {
    throw new Error(`Unknown strategy "${key}". Available strategies: ${strategies.map((item) => item.key).join(", ")}`);
  }

  return strategy;
}
