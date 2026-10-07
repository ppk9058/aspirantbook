#!/usr/bin/env bash
set -e

echo "=== PASS 10.8: RUN ALL TEST SUITES ==="
mkdir -p logs/pass10_8

for i in {1..13}; do
    echo "Running test_part$i.sh -> logs/pass10_8/part$i.log..."
    bash "scripts/pass10_8/test_part$i.sh" > "logs/pass10_8/part$i.log" 2>&1
done

echo "All 13 parts executed successfully."
