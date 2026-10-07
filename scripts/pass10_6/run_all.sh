#!/usr/bin/env bash
set -e

echo "=== EXECUTING COMPLETE PASS 10.6 SUITE ==="
echo "Git HEAD: $(git rev-parse HEAD)"
echo "Timestamp: $(date -u)"

bash scripts/pass10_6/test_part1.sh > logs/pass10_6/part1.log 2>&1
bash scripts/pass10_6/test_part2.sh > logs/pass10_6/part2.log 2>&1
bash scripts/pass10_6/test_part3.sh > logs/pass10_6/part3.log 2>&1
bash scripts/pass10_6/test_part4.sh > logs/pass10_6/part4.log 2>&1
bash scripts/pass10_6/test_part5.sh > logs/pass10_6/part5.log 2>&1
bash scripts/pass10_6/test_part6.sh > logs/pass10_6/part6.log 2>&1
bash scripts/pass10_6/test_part7.sh > logs/pass10_6/part7.log 2>&1
bash scripts/pass10_6/test_part8.sh > logs/pass10_6/part8.log 2>&1
bash scripts/pass10_6/test_part10.sh > logs/pass10_6/part10.log 2>&1
bash scripts/pass10_6/run_ship.sh > logs/pass10_6/ship.log 2>&1

echo "ALL PARTS COMPLETED SUCCESSFULLY."
