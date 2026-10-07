#!/usr/bin/env bash
set -e

echo "=== EXECUTING COMPLETE PASS 10.7 SUITE ==="
echo "Git HEAD: $(git rev-parse HEAD)"
echo "Timestamp: $(date -u)"

mkdir -p logs/pass10_7

bash scripts/pass10_7/test_part1.sh > logs/pass10_7/part1.log 2>&1
bash scripts/pass10_7/test_part2.sh > logs/pass10_7/part2.log 2>&1
bash scripts/pass10_7/test_part3.sh > logs/pass10_7/part3.log 2>&1
bash scripts/pass10_7/test_part4.sh > logs/pass10_7/part4.log 2>&1
bash scripts/pass10_7/test_part5.sh > logs/pass10_7/part5.log 2>&1
bash scripts/pass10_7/test_part6.sh > logs/pass10_7/part6.log 2>&1
bash scripts/pass10_7/test_part7.sh > logs/pass10_7/part7.log 2>&1
bash scripts/pass10_7/test_part8.sh > logs/pass10_7/part8.log 2>&1
bash scripts/pass10_7/test_part10.sh > logs/pass10_7/part10.log 2>&1
bash scripts/pass10_7/run_ship.sh > logs/pass10_7/ship.log 2>&1

echo "ALL PARTS COMPLETED SUCCESSFULLY."
