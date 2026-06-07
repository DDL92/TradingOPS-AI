import { tradingConfig } from "../config/tradingConfig";
import type { MarketCandle } from "../types/market.types";
import type { Trade } from "../types/trade.types";
import type { PaperPortfolio } from "./paperPortfolio";
import { round, updatePaperEquity } from "./paperPortfolio";

export type PaperOrderResult = {
  portfolio: PaperPortfolio;
  message: string;
};

export function openPaperPosition(
  portfolio: PaperPortfolio,
  candle: MarketCandle,
  strategy: string,
): PaperOrderResult {
  if (portfolio.openPosition) {
    return { portfolio, message: "Skipped BUY because a paper position is already open." };
  }

  const allocatedCapital = portfolio.cash * (tradingConfig.positionSizePercent / 100);
  if (allocatedCapital <= 0) {
    return { portfolio, message: "Skipped BUY because available paper cash is zero." };
  }

  const nextPortfolio = updatePaperEquity(
    {
      ...portfolio,
      cash: round(portfolio.cash - allocatedCapital),
      openPosition: {
        symbol: candle.symbol,
        entryDate: candle.date,
        entryPrice: candle.close,
        quantity: allocatedCapital / candle.close,
        allocatedCapital,
      },
    },
    candle.close,
  );

  return {
    portfolio: nextPortfolio,
    message: `Opened simulated ${strategy} paper position at ${candle.close}.`,
  };
}

export function closePaperPosition(
  portfolio: PaperPortfolio,
  candle: MarketCandle,
  strategy: string,
): PaperOrderResult {
  if (!portfolio.openPosition) {
    return { portfolio, message: "Skipped SELL because no paper position is open." };
  }

  const position = portfolio.openPosition;
  const exitValue = position.quantity * candle.close;
  const pnl = exitValue - position.allocatedCapital;
  const trade: Trade = {
    id: `paper-${strategy}-${(portfolio.tradeLog.length + 1).toString().padStart(3, "0")}`,
    symbol: position.symbol,
    strategy,
    direction: "long",
    entryDate: position.entryDate,
    exitDate: candle.date,
    entryPrice: round(position.entryPrice),
    exitPrice: round(candle.close),
    quantity: Number(position.quantity.toFixed(8)),
    pnl: round(pnl),
    pnlPercent: round((pnl / position.allocatedCapital) * 100),
    result: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
  };

  const nextPortfolio = updatePaperEquity(
    {
      ...portfolio,
      cash: round(portfolio.cash + position.allocatedCapital + pnl),
      openPosition: null,
      tradeLog: [...portfolio.tradeLog, trade],
    },
    candle.close,
  );

  return {
    portfolio: nextPortfolio,
    message: `Closed simulated ${strategy} paper position at ${candle.close}.`,
  };
}
