import type { Trade } from "../types/trade.types";

export const sampleTrades: Trade[] = [
  trade("J-001", "BTC", "rsi", "2025-01-03", "2025-01-06", 41850, 42610, 0.006),
  trade("J-002", "BTC", "ema", "2025-01-08", "2025-01-10", 43020, 42440, 0.005),
  trade("J-003", "BTC", "breakout", "2025-01-12", "2025-01-17", 43500, 44780, 0.004),
  trade("J-004", "ETH", "rsi", "2025-01-15", "2025-01-18", 2260, 2328, 0.11),
  trade("J-005", "BTC", "rsi", "2025-01-20", "2025-01-22", 44120, 43690, 0.005),
  trade("J-006", "ETH", "ema", "2025-01-24", "2025-01-27", 2350, 2415, 0.1),
  trade("J-007", "BTC", "breakout", "2025-02-02", "2025-02-05", 45200, 45920, 0.004),
  trade("J-008", "BTC", "ema", "2025-02-06", "2025-02-09", 45800, 45180, 0.004),
  trade("J-009", "ETH", "breakout", "2025-02-10", "2025-02-12", 2430, 2495, 0.09),
  trade("J-010", "BTC", "rsi", "2025-02-14", "2025-02-16", 44950, 45640, 0.005),
  trade("J-011", "BTC", "ema", "2025-02-17", "2025-02-19", 45720, 46210, 0.004),
  trade("J-012", "ETH", "rsi", "2025-02-20", "2025-02-23", 2510, 2468, 0.09),
];

function trade(
  id: string,
  symbol: string,
  strategy: string,
  entryDate: string,
  exitDate: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
): Trade {
  const pnl = (exitPrice - entryPrice) * quantity;
  const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;

  return {
    id,
    symbol,
    strategy,
    direction: "long",
    entryDate,
    exitDate,
    entryPrice,
    exitPrice,
    quantity,
    pnl: round(pnl),
    pnlPercent: round(pnlPercent),
    result: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
  };
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
