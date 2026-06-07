import { evaluateDrawdownGuard } from "../risk/drawdownGuard";
import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";
import { closePaperPosition, openPaperPosition } from "./paperBroker";
import { createPaperPortfolio, updatePaperEquity, type PaperPortfolio } from "./paperPortfolio";

export type PaperTradingEvent = {
  date: string;
  close: number;
  action: StrategySignal["action"];
  reason: string;
  brokerMessage: string;
  equity: number;
};

export type PaperTradingSession = {
  symbol: string;
  strategy: string;
  mode: "simulation only";
  startingCapital: number;
  finalPortfolio: PaperPortfolio;
  latestSignal: StrategySignal;
  events: PaperTradingEvent[];
  drawdownGuard: ReturnType<typeof evaluateDrawdownGuard>;
  note: string;
};

export function runPaperTradingSession(
  candles: MarketCandle[],
  strategy: Strategy,
  startingCapital = 100,
): PaperTradingSession {
  let portfolio = createPaperPortfolio(startingCapital);
  let peakEquity = startingCapital;
  const events: PaperTradingEvent[] = [];
  let latestSignal: StrategySignal = { action: "HOLD", reason: "No candles processed.", confidence: 0 };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    if (!candle) continue;

    latestSignal = strategy.generateSignal(candles, index);
    let brokerMessage = "No simulated order created.";

    if (latestSignal.action === "BUY") {
      const result = openPaperPosition(portfolio, candle, strategy.key);
      portfolio = result.portfolio;
      brokerMessage = result.message;
    }

    if (latestSignal.action === "SELL") {
      const result = closePaperPosition(portfolio, candle, strategy.key);
      portfolio = result.portfolio;
      brokerMessage = result.message;
    }

    portfolio = updatePaperEquity(portfolio, candle.close);
    peakEquity = Math.max(peakEquity, portfolio.equity);

    events.push({
      date: candle.date,
      close: candle.close,
      action: latestSignal.action,
      reason: latestSignal.reason,
      brokerMessage,
      equity: portfolio.equity,
    });
  }

  const finalCandle = candles[candles.length - 1];
  const drawdownGuard = evaluateDrawdownGuard(portfolio.equity, peakEquity);

  return {
    symbol: candles[0]?.symbol ?? "UNKNOWN",
    strategy: strategy.key,
    mode: "simulation only",
    startingCapital,
    finalPortfolio: finalCandle ? updatePaperEquity(portfolio, finalCandle.close) : portfolio,
    latestSignal,
    events,
    drawdownGuard,
    note: "Mode: simulation only. Real trading is disabled.",
  };
}
