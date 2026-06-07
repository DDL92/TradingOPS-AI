export type YahooSymbolMapEntry = {
  internalSymbol: string;
  yahooSymbol: string;
  fileName: string;
  rawFileName: string;
  normalizedFileName: string;
};

export const yahooSymbols = [
  { internalSymbol: "BTC", yahooSymbol: "BTC-USD", fileName: "BTC.csv" },
  { internalSymbol: "ETH", yahooSymbol: "ETH-USD", fileName: "ETH.csv" },
  { internalSymbol: "SPY", yahooSymbol: "SPY", fileName: "SPY.csv" },
  { internalSymbol: "QQQ", yahooSymbol: "QQQ", fileName: "QQQ.csv" },
  { internalSymbol: "NVDA", yahooSymbol: "NVDA", fileName: "NVDA.csv" },
  { internalSymbol: "TSLA", yahooSymbol: "TSLA", fileName: "TSLA.csv" },
] as const;

export const yahooSymbolMap: YahooSymbolMapEntry[] = yahooSymbols.map((entry) => ({
  ...entry,
  rawFileName: entry.yahooSymbol === entry.internalSymbol ? entry.fileName : `${entry.yahooSymbol}.csv`,
  normalizedFileName: entry.fileName,
}));

export function getYahooSymbol(internalSymbol: string): (typeof yahooSymbols)[number] {
  const symbol = yahooSymbols.find((entry) => entry.internalSymbol === internalSymbol.toUpperCase());

  if (!symbol) {
    throw new Error(
      `Unsupported Yahoo symbol "${internalSymbol}". Supported symbols: ${yahooSymbols
        .map((entry) => entry.internalSymbol)
        .join(", ")}`,
    );
  }

  return symbol;
}
