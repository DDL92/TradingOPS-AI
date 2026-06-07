import { writeJsonReport, writeMarkdownReport } from "../reports/reportBuilder";

export function printSection(title: string): void {
  console.log(`\n${title}`);
}

export function printKeyValue(label: string, value: string | number | boolean): void {
  console.log(`${label}: ${value}`);
}

export function printWarnings(warnings: string[]): void {
  if (warnings.length === 0) return;
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

export function printSimulationOnlyNotice(): void {
  console.log("Mode: simulation only. Real trading is disabled.");
}

export function writeCliReports(options: { jsonPath: string; markdownPath: string; data: unknown; markdown: string }): void {
  writeJsonReport(options.jsonPath, options.data);
  writeMarkdownReport(options.markdownPath, options.markdown);
}

export function logJsonResult(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function logReportPaths(jsonPath: string, markdownPath: string): void {
  console.log(`Reports written to ${jsonPath} and ${markdownPath}`);
}

export function writeAndLogJsonReports(options: {
  jsonPath: string;
  markdownPath: string;
  data: unknown;
  markdown: string;
}): void {
  writeCliReports(options);
  logJsonResult(options.data);
  logReportPaths(options.jsonPath, options.markdownPath);
}

export function writeAndLogTableReports<T>(options: {
  jsonPath: string;
  markdownPath: string;
  data: unknown;
  markdown: string;
  rows: T[];
}): void {
  writeCliReports(options);
  console.table(options.rows);
  logReportPaths(options.jsonPath, options.markdownPath);
}
