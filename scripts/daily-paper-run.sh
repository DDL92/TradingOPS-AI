#!/bin/bash

set -e

PROJECT_DIR="$HOME/Desktop/ai-trading-growth-lab"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/daily-paper-run-$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

echo "======================================" >> "$LOG_FILE"
echo "TradingOPS-AI Daily Paper Run" >> "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"
echo "Mode: simulation only. Real trading disabled." >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"

cd "$PROJECT_DIR"

echo "Running data pipeline..." >> "$LOG_FILE"
npm run data:pipeline >> "$LOG_FILE" 2>&1

echo "Running paper scan..." >> "$LOG_FILE"
npm run paper:scan -- --data csv --capital 100 >> "$LOG_FILE" 2>&1

echo "Running paper journal..." >> "$LOG_FILE"
npm run paper:journal >> "$LOG_FILE" 2>&1

echo "Running paper analysis..." >> "$LOG_FILE"
npm run paper:analyze >> "$LOG_FILE" 2>&1

echo "Completed: $(date)" >> "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"