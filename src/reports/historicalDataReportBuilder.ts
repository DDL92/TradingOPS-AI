import type { HistoricalDataValidationResult } from "../data/historicalDataValidator";

export function buildHistoricalDataValidationMarkdown(result: HistoricalDataValidationResult): string {
  const warnings = result.warnings.length === 0 ? "- None" : result.warnings.map((warning) => `- ${warning}`).join("\n");
  const errors = result.errors.length === 0 ? "- None" : result.errors.map((error) => `- ${error}`).join("\n");
  const duplicates =
    result.duplicateDates.length === 0 ? "- None" : result.duplicateDates.map((date) => `- ${date}`).join("\n");

  return `# Historical Data Validation: ${result.symbol}

Mode: simulation only. Real trading is disabled.

## Summary
- Source: ${result.source}
- Rows: ${result.rows}
- Date range: ${result.dateRange.start ?? "N/A"} to ${result.dateRange.end ?? "N/A"}
- Missing values: ${result.missingValues}
- Duplicate dates: ${result.duplicateDates.length}
- Invalid OHLC rows: ${result.invalidOhlcRows}
- Volume issues: ${result.volumeIssues}
- Sorted ascending: ${result.sortedAscending ? "Yes" : "No"}
- Data quality score: ${result.dataQualityScore}
- Approved for backtesting: ${result.approvedForBacktesting ? "Yes" : "No"}

## Duplicate Dates
${duplicates}

## Warnings
${warnings}

## Errors
${errors}

Historical performance does not guarantee future results.
`;
}
