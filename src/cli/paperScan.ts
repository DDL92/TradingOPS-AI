import { Command } from "commander";
import { z } from "zod";
import { runBacktest } from "../backtesting/backtestEngine";
import { tradingConfig } from "../config/tradingConfig";
import {
  createMarketDataProvider,
  parseMarketDataSource,
  type MarketDataSource,
} from "../data/marketDataProviderFactory";
import { loadOrCreatePaperWatchlist } from "../paperTrading/paperTradingWatchlist";
import {
  findOpenPaperTrade,
  PAPER_SAFETY_NOTICE,
  readPaperTrades,
  upsertPaperTrade,
  type PaperDataSource,
  type PaperSignalEntry,
  type PaperTradeEntry,
  type PaperWatchlistEntry,
} from "../paperTrading/persistentPaperJournal";
import { recordPaperSignal } from "../paperTrading/paperSignalRecorder";
import { buildPaperScanMarkdown, type PaperScanReport } from "../reports/paperTradingReportBuilder";
import { calculateRiskScore } from "../risk/riskScore";
import { getStrategyByKey } from "../strategies/strategyRegistry";
import type { MarketCandle } from "../types/market.types";
import type { StrategySignal } from "../types/strategy.types";
import { handleCliError, printSimulationOnlyNotice, printWarnings, writeAndLogJsonReports } from "./cliOutput";

const optionsSchema = z.object({
  data: z.string().default("csv"),
  capital: z.coerce.number().positive().default(100),
});

type PaperScanCounters = {
  buySignals: number;
  sellSignals: number;
  holdSignals: number;
  openedTrades: PaperTradeEntry[];
  closedTrades: PaperTradeEntry[];
  signals: PaperSignalEntry[];
  warnings: string[];
};

const program = new Command();

program
  .name("paper:scan")
  .description("Scan the persistent paper trading watchlist and update simulated paper journal records.")
  .option("--data <source>", "Market data source: csv or sample", "csv")
  .option("--capital <amount>", "Simulated capital used for paper entries", "100")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const dataSource = parseMarketDataSource(options.data);
      const provider = createMarketDataProvider(dataSource);
      const watchlist = loadOrCreatePaperWatchlist();
      const counters = scanWatchlist(watchlist, dataSource, provider, options.capital);
      const report: PaperScanReport = {
        safetyNotice: PAPER_SAFETY_NOTICE,
        dataSource,
        capital: options.capital,
        scannedPairs: watchlist.length,
        buySignals: counters.buySignals,
        sellSignals: counters.sellSignals,
        holdSignals: counters.holdSignals,
        openedSimulatedTrades: counters.openedTrades.length,
        closedSimulatedTrades: counters.closedTrades.length,
        openSimulatedTrades: readPaperTrades().filter((trade) => trade.status === "OPEN").length,
        signals: counters.signals,
        openedTrades: counters.openedTrades,
        closedTrades: counters.closedTrades,
        warnings: counters.warnings,
      };

      printSimulationOnlyNotice();
      printWarnings(report.warnings);
      writeAndLogJsonReports({
        jsonPath: "output/reports/paper-scan-report.json",
        markdownPath: "output/reports/paper-scan-report.md",
        data: report,
        markdown: buildPaperScanMarkdown(report),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function scanWatchlist(
  watchlist: PaperWatchlistEntry[],
  dataSource: MarketDataSource,
  provider: ReturnType<typeof createMarketDataProvider>,
  capital: number,
): PaperScanCounters {
  const counters: PaperScanCounters = {
    buySignals: 0,
    sellSignals: 0,
    holdSignals: 0,
    openedTrades: [],
    closedTrades: [],
    signals: [],
    warnings: [],
  };

  watchlist.forEach((entry, index) => {
    try {
      const symbol = entry.symbol.toUpperCase();
      const strategy = getStrategyByKey(entry.strategy);
      const candles = provider.getCandles(symbol);
      const latestCandle = getLatestCandle(candles, symbol);
      const latestIndex = candles.length - 1;
      const signal = strategy.generateSignal(candles, latestIndex);
      const riskLevel = calculateRiskScore(runBacktest(candles, strategy, capital)).level;
      const paperSignal = recordPaperSignal({
        symbol,
        strategy: strategy.key,
        dataSource: dataSource as PaperDataSource,
        latestCandle,
        signal,
        riskLevel,
        sequence: index + 1,
      });

      counters.signals.push(paperSignal);
      countSignal(signal, counters);
      applySignalToPaperTradeJournal(symbol, strategy.key, latestCandle, signal, capital, counters);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown paper scan error.";
      counters.warnings.push(`${entry.symbol.toUpperCase()} ${entry.strategy}: ${message}`);
    }
  });

  return counters;
}

function applySignalToPaperTradeJournal(
  symbol: string,
  strategy: string,
  latestCandle: MarketCandle,
  signal: StrategySignal,
  capital: number,
  counters: PaperScanCounters,
): void {
  const openTrade = findOpenPaperTrade(symbol, strategy);

  if (signal.action === "BUY" && !openTrade) {
    const trade = openSimulatedTrade(symbol, strategy, latestCandle, signal, capital);
    upsertPaperTrade(trade);
    counters.openedTrades.push(trade);
  }

  if (signal.action === "SELL" && openTrade) {
    const trade = closeSimulatedTrade(openTrade, latestCandle, signal);
    upsertPaperTrade(trade);
    counters.closedTrades.push(trade);
  }
}

function openSimulatedTrade(
  symbol: string,
  strategy: string,
  latestCandle: MarketCandle,
  signal: StrategySignal,
  capital: number,
): PaperTradeEntry {
  const allocatedCapital = capital * (tradingConfig.positionSizePercent / 100);
  const timestamp = new Date().toISOString();

  return {
    id: `paper-${symbol}-${strategy}-${timestamp}`.replace(/[^A-Za-z0-9_-]/g, "-"),
    symbol,
    strategy,
    direction: "long",
    status: "OPEN",
    entryDate: latestCandle.date,
    entryPrice: round(latestCandle.close),
    quantity: Number((allocatedCapital / latestCandle.close).toFixed(8)),
    simulatedCapital: capital,
    reasonOpened: signal.reason,
    realMoneyAllowed: false,
  };
}

function closeSimulatedTrade(
  trade: PaperTradeEntry,
  latestCandle: MarketCandle,
  signal: StrategySignal,
): PaperTradeEntry {
  const exitValue = trade.quantity * latestCandle.close;
  const entryValue = trade.quantity * trade.entryPrice;
  const pnl = exitValue - entryValue;
  const pnlPercent = entryValue === 0 ? 0 : (pnl / entryValue) * 100;

  return {
    ...trade,
    status: "CLOSED",
    exitDate: latestCandle.date,
    exitPrice: round(latestCandle.close),
    pnl: round(pnl),
    pnlPercent: round(pnlPercent),
    result: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
    reasonClosed: signal.reason,
    realMoneyAllowed: false,
  };
}

function getLatestCandle(candles: MarketCandle[], symbol: string): MarketCandle {
  const latestCandle = candles[candles.length - 1];
  if (!latestCandle) throw new Error(`No market candles available for ${symbol}.`);
  return latestCandle;
}

function countSignal(signal: StrategySignal, counters: PaperScanCounters): void {
  if (signal.action === "BUY") counters.buySignals += 1;
  if (signal.action === "SELL") counters.sellSignals += 1;
  if (signal.action === "HOLD") counters.holdSignals += 1;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
