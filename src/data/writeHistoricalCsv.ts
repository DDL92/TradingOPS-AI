import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MarketCandle } from "../types/market.types";

export function writeHistoricalCsv(symbol: string, candles: MarketCandle[], outputDir = "data/historical"): string {
  mkdirSync(outputDir, { recursive: true });
  const normalizedSymbol = symbol.toUpperCase();
  const outputPath = join(outputDir, `${normalizedSymbol}.csv`);
  const rows = [
    "date,open,high,low,close,volume",
    ...candles.map((candle) => `${candle.date},${candle.open},${candle.high},${candle.low},${candle.close},${candle.volume}`),
  ];

  writeFileSync(outputPath, `${rows.join("\n")}\n`, "utf8");
  return outputPath;
}
