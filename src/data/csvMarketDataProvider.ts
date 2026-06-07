import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseHistoricalCsvFile, validateCandles } from "./historicalDataValidator";
import type { MarketCandle } from "../types/market.types";
import type { MarketDataProvider } from "./marketDataProvider.interface";

export class CsvMarketDataProvider implements MarketDataProvider {
  constructor(private readonly basePath = "data/historical") {}

  getCandles(symbol: string): MarketCandle[] {
    const filePath = this.resolveFilePath(symbol);

    if (!existsSync(filePath)) {
      throw new Error(
        `CSV market data file does not exist: ${filePath}. Import data with: npm run data:import -- --symbol ${symbol.toUpperCase()} --file ./path/to/${symbol.toUpperCase()}.csv`,
      );
    }

    const candles = parseHistoricalCsvFile(filePath, symbol);
    const validation = validateCandles(candles, symbol, filePath);

    if (validation.errors.length > 0) {
      throw new Error(`CSV market data validation failed for ${symbol.toUpperCase()}: ${validation.errors.join(" ")}`);
    }

    return candles;
  }

  getFilePath(symbol: string): string {
    return this.resolveFilePath(symbol);
  }

  private resolveFilePath(symbol: string): string {
    if (this.basePath.toLowerCase().endsWith(".csv")) {
      return this.basePath;
    }

    return join(this.basePath, `${symbol.toUpperCase()}.csv`);
  }
}
