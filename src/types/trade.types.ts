export type TradeDirection = "long" | "short";
export type TradeResult = "win" | "loss" | "breakeven";

export type Trade = {
  id: string;
  symbol: string;
  strategy: string;
  direction: TradeDirection;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  result: TradeResult;
};
