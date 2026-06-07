import { existsSync } from "node:fs";
import type { MarketCandle } from "../types/market.types";
import type { MarketDataProvider } from "./marketDataProvider.interface";

export class CsvMarketDataProvider implements MarketDataProvider {
  constructor(private readonly filePath: string) {}

  getCandles(_symbol: string): MarketCandle[] {
    if (!existsSync(this.filePath)) {
      throw new Error(`CSV market data file does not exist: ${this.filePath}`);
    }

    throw new Error(
      `CsvMarketDataProvider is prepared for Sprint 3 but CSV parsing is not enabled yet. File path received: ${this.filePath}`,
    );
  }
}
