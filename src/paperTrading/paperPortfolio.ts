import type { Trade } from "../types/trade.types";

export type PaperPosition = {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  allocatedCapital: number;
};

export type PaperPortfolio = {
  startingCapital: number;
  cash: number;
  openPosition: PaperPosition | null;
  equity: number;
  tradeLog: Trade[];
};

export function createPaperPortfolio(startingCapital: number): PaperPortfolio {
  return {
    startingCapital,
    cash: startingCapital,
    openPosition: null,
    equity: startingCapital,
    tradeLog: [],
  };
}

export function updatePaperEquity(portfolio: PaperPortfolio, latestPrice: number): PaperPortfolio {
  const openValue = portfolio.openPosition ? portfolio.openPosition.quantity * latestPrice : 0;

  return {
    ...portfolio,
    equity: round(portfolio.cash + openValue),
  };
}

export function round(value: number): number {
  return Number(value.toFixed(2));
}
