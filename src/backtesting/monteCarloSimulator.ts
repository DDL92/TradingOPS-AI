import { runBacktest } from "./backtestEngine";
import { tradingConfig } from "../config/tradingConfig";
import type { MarketCandle } from "../types/market.types";
import type { Strategy } from "../types/strategy.types";

export type SampleSizeQuality = "LOW" | "MODERATE" | "ACCEPTABLE";

export type MonteCarloResult = {
  symbol: string;
  strategy: string;
  simulations: number;
  startingCapital: number;
  targetCapital?: number;
  medianFinalCapital: number;
  worst5thPercentileFinalCapital: number;
  best95thPercentileFinalCapital: number;
  probabilityOfProfit: number;
  probabilityOfTwentyPercentDrawdown: number;
  probabilityOfReachingTarget?: number;
  tradeReturnSamples: number;
  tradeSampleSize: number;
  sampleSizeQuality: SampleSizeQuality;
  warnings: string[];
};

type SimulationRun = {
  finalCapital: number;
  maxDrawdownPercent: number;
};

export function runMonteCarloSimulation(
  candles: MarketCandle[],
  strategy: Strategy,
  startingCapital = 100,
  targetCapital?: number,
  simulations = 1000,
): MonteCarloResult {
  const backtest = runBacktest(candles, strategy, startingCapital);
  const returns = backtest.trades.map((trade) => trade.pnlPercent / 100);
  const sampleSizeQuality = classifySampleSize(returns.length);
  const warnings = buildSampleWarnings(returns.length);
  const runs: SimulationRun[] = [];
  let seed = 42;

  for (let index = 0; index < simulations; index += 1) {
    const shuffled = shuffleDeterministically(returns, () => {
      seed = seededRandom(seed);
      return seed / 2147483647;
    });
    runs.push(simulateReturnPath(shuffled, startingCapital));
  }

  const finalCapitals = runs.map((run) => run.finalCapital).sort((a, b) => a - b);
  const profitableRuns = runs.filter((run) => run.finalCapital > startingCapital).length;
  const drawdownRuns = runs.filter((run) => run.maxDrawdownPercent >= 20).length;
  const targetRuns = targetCapital ? runs.filter((run) => run.finalCapital >= targetCapital).length : 0;

  return {
    symbol: candles[0]?.symbol ?? "UNKNOWN",
    strategy: strategy.key,
    simulations,
    startingCapital,
    ...(targetCapital !== undefined ? { targetCapital } : {}),
    medianFinalCapital: percentile(finalCapitals, 50),
    worst5thPercentileFinalCapital: percentile(finalCapitals, 5),
    best95thPercentileFinalCapital: percentile(finalCapitals, 95),
    probabilityOfProfit: round((profitableRuns / simulations) * 100),
    probabilityOfTwentyPercentDrawdown: round((drawdownRuns / simulations) * 100),
    ...(targetCapital !== undefined ? { probabilityOfReachingTarget: round((targetRuns / simulations) * 100) } : {}),
    tradeReturnSamples: returns.length,
    tradeSampleSize: returns.length,
    sampleSizeQuality,
    warnings,
  };
}

function classifySampleSize(tradeCount: number): SampleSizeQuality {
  if (tradeCount < tradingConfig.monteCarloMinimumTrades) return "LOW";
  if (tradeCount < tradingConfig.monteCarloPreferredTrades) return "MODERATE";
  return "ACCEPTABLE";
}

function buildSampleWarnings(tradeCount: number): string[] {
  if (tradeCount < tradingConfig.monteCarloMinimumTrades) {
    return [
      `Very low trade sample: ${tradeCount} trades. Monte Carlo output is exploratory only and should not be treated as high confidence.`,
    ];
  }

  if (tradeCount < tradingConfig.monteCarloPreferredTrades) {
    return [
      `Trade sample below preferred threshold: ${tradeCount}/${tradingConfig.monteCarloPreferredTrades}. Avoid strong confidence claims.`,
    ];
  }

  return [];
}

function simulateReturnPath(returns: number[], startingCapital: number): SimulationRun {
  let capital = startingCapital;
  let peak = startingCapital;
  let maxDrawdownPercent = 0;

  for (const tradeReturn of returns) {
    capital *= 1 + tradeReturn * 0.25;
    peak = Math.max(peak, capital);
    maxDrawdownPercent = Math.max(maxDrawdownPercent, peak === 0 ? 0 : ((peak - capital) / peak) * 100);
  }

  return {
    finalCapital: round(capital),
    maxDrawdownPercent: round(maxDrawdownPercent),
  };
}

function shuffleDeterministically(values: number[], random: () => number): number[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index];
    const swap = copy[swapIndex];
    if (current === undefined || swap === undefined) continue;
    copy[index] = swap;
    copy[swapIndex] = current;
  }

  return copy;
}

function seededRandom(seed: number): number {
  return (seed * 16807) % 2147483647;
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((percentileValue / 100) * sortedValues.length)));
  return round(sortedValues[index] ?? 0);
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
