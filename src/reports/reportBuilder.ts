import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function ensureOutputDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function writeJsonReport(path: string, data: unknown): void {
  ensureOutputDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function writeMarkdownReport(path: string, content: string): void {
  ensureOutputDir(dirname(path));
  writeFileSync(path, content.trimStart(), "utf8");
}
