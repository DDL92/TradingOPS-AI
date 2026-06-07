import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { yahooSymbolMap } from "../data/yahooSymbolMap";

export type DatasetReadinessStatus = "NOT_READY" | "PARTIALLY_READY" | "READY_FOR_BACKTESTING";

export type DatasetReadinessResult = {
  status: DatasetReadinessStatus;
  mode: "simulation only";
  requiredSymbols: string[];
  availableSymbols: string[];
  missingSymbols: string[];
  validationReportsFound: string[];
  validationReportsMissing: string[];
  strategyComparisonReportsFound: string[];
  strategyComparisonReportsMissing: string[];
  readyForSeriousBacktesting: boolean;
  blockingIssues: string[];
  warnings: string[];
  nextRecommendedCommand: string;
};

export function buildDatasetReadinessReport(): DatasetReadinessResult {
  const requiredSymbols = yahooSymbolMap.map((entry) => entry.internalSymbol);
  const availableSymbols = requiredSymbols.filter((symbol) => existsSync(historicalPath(symbol)));
  const missingSymbols = requiredSymbols.filter((symbol) => !availableSymbols.includes(symbol));
  const validationReportsFound = availableSymbols.filter((symbol) => existsSync(validationReportPath(symbol)));
  const validationReportsMissing = requiredSymbols.filter(
    (symbol) => !validationReportsFound.includes(symbol),
  );
  const strategyComparisonReportsFound = availableSymbols.filter((symbol) => existsSync(strategyComparisonPath(symbol)));
  const strategyComparisonReportsMissing = requiredSymbols.filter(
    (symbol) => !strategyComparisonReportsFound.includes(symbol),
  );
  const blockingIssues = buildBlockingIssues(missingSymbols, validationReportsMissing, strategyComparisonReportsMissing);
  const warnings = buildWarnings(requiredSymbols, availableSymbols);
  const status = getStatus(requiredSymbols.length, availableSymbols.length, blockingIssues.length);

  return {
    status,
    mode: "simulation only",
    requiredSymbols,
    availableSymbols,
    missingSymbols,
    validationReportsFound: validationReportsFound.map(validationReportPath),
    validationReportsMissing: validationReportsMissing.map(validationReportPath),
    strategyComparisonReportsFound: strategyComparisonReportsFound.map(strategyComparisonPath),
    strategyComparisonReportsMissing: strategyComparisonReportsMissing.map(strategyComparisonPath),
    readyForSeriousBacktesting: status === "READY_FOR_BACKTESTING",
    blockingIssues,
    warnings,
    nextRecommendedCommand: nextCommand(status),
  };
}

export function buildDatasetReadinessMarkdown(result: DatasetReadinessResult): string {
  return `# Dataset Readiness

Mode: simulation only. Real trading is disabled.

## Status
- Readiness: ${result.status}
- Ready for serious backtesting: ${result.readyForSeriousBacktesting ? "Yes" : "No"}
- Next recommended command: \`${result.nextRecommendedCommand}\`

## Symbols
- Required: ${result.requiredSymbols.join(", ")}
- Available: ${result.availableSymbols.join(", ") || "None"}
- Missing: ${result.missingSymbols.join(", ") || "None"}

## Validation Reports
${formatList(result.validationReportsFound)}

## Missing Validation Reports
${formatList(result.validationReportsMissing)}

## Strategy Comparison Reports
${formatList(result.strategyComparisonReportsFound)}

## Missing Strategy Comparison Reports
${formatList(result.strategyComparisonReportsMissing)}

## Blocking Issues
${formatList(result.blockingIssues)}

## Warnings
${formatList(result.warnings)}

Historical performance does not guarantee future results.
`;
}

function buildBlockingIssues(
  missingSymbols: string[],
  validationReportsMissing: string[],
  strategyComparisonReportsMissing: string[],
): string[] {
  const issues: string[] = [];

  if (missingSymbols.length > 0) {
    issues.push(`Missing historical CSV files for: ${missingSymbols.join(", ")}`);
  }
  if (validationReportsMissing.length > 0) {
    issues.push(`Missing validation reports for: ${validationReportsMissing.join(", ")}`);
  }
  if (strategyComparisonReportsMissing.length > 0) {
    issues.push(`Missing strategy comparison reports for: ${strategyComparisonReportsMissing.join(", ")}`);
  }

  return issues;
}

function buildWarnings(requiredSymbols: string[], availableSymbols: string[]): string[] {
  const warnings = ["Historical performance does not guarantee future results."];

  for (const symbol of availableSymbols) {
    const reportPath = validationReportPath(symbol);
    if (!existsSync(reportPath)) continue;
    const parsed = readJson(reportPath);
    if (parsed && parsed.approvedForBacktesting === false) {
      warnings.push(`${symbol} validation report is not approved for backtesting.`);
    }
    if (parsed && typeof parsed.rows === "number" && parsed.rows < 120) {
      warnings.push(`${symbol} has fewer than 120 candles.`);
    }
  }

  if (availableSymbols.length > 0 && availableSymbols.length < requiredSymbols.length) {
    warnings.push("Dataset is only partially populated; multi-symbol conclusions are limited.");
  }

  return warnings;
}

function getStatus(requiredCount: number, availableCount: number, blockingIssueCount: number): DatasetReadinessStatus {
  if (availableCount === 0) return "NOT_READY";
  if (availableCount < requiredCount || blockingIssueCount > 0) return "PARTIALLY_READY";
  return "READY_FOR_BACKTESTING";
}

function nextCommand(status: DatasetReadinessStatus): string {
  if (status === "NOT_READY") return "npm run data:folders";
  if (status === "PARTIALLY_READY") return "npm run data:validate:all";
  return "npm run analysis:realdata:initial";
}

function historicalPath(symbol: string): string {
  return join("data", "historical", `${symbol}.csv`);
}

function validationReportPath(symbol: string): string {
  return join("output", "reports", `${symbol}-data-validation.json`);
}

function strategyComparisonPath(symbol: string): string {
  return join("output", "leaderboards", `${symbol}-realdata-strategy-comparison.json`);
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatList(values: string[]): string {
  return values.length === 0 ? "- None" : values.map((value) => `- ${value}`).join("\n");
}
