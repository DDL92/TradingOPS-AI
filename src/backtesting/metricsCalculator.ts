import type { BacktestMetrics } from "../types/backtest.types";
import type { Trade } from "../types/trade.types";

export function calculateBacktestMetrics(
  trades: Trade[],
  initialCapital: number,
  finalCapital: number,
  equityCurve: number[],
): BacktestMetrics {
  const winningTrades = trades.filter((trade) => trade.result === "win");
  const losingTrades = trades.filter((trade) => trade.result === "loss");
  const grossProfit = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
  const totalTrades = trades.length;
  const winRate = totalTrades === 0 ? 0 : (winningTrades.length / totalTrades) * 100;
  const averageWin = winningTrades.length === 0 ? 0 : grossProfit / winningTrades.length;
  const averageLoss = losingTrades.length === 0 ? 0 : grossLoss / losingTrades.length;
  const lossRate = 100 - winRate;
  const expectancy = (winRate / 100) * averageWin - (lossRate / 100) * averageLoss;

  return {
    totalReturnPercent: round(((finalCapital - initialCapital) / initialCapital) * 100),
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: round(winRate),
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? round(grossProfit) : 0) : round(grossProfit / grossLoss),
    maxDrawdownPercent: round(calculateMaxDrawdown(equityCurve)),
    averageWin: round(averageWin),
    averageLoss: round(averageLoss),
    expectancy: round(expectancy),
  };
}

function calculateMaxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0] ?? 0;
  let maxDrawdown = 0;

  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    const drawdown = peak === 0 ? 0 : ((peak - equity) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
