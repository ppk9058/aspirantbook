#!/usr/bin/env bash
set -euo pipefail

REPORT_FILE="REPORT.md"

echo "PASS 10.5 REPORT — GUEST/SESSION/REDIRECT CLOSE-OUT — TrillionSkill-ver2" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "# PASS 10.5: CLOSE THE PASS 10.4 GAPS + NEW BUG (/profile)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$REPORT_FILE"
echo "Commit: $(git rev-parse HEAD)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

for part in part_a part_b part_c part_d part_e part_f part_g part_h part_i; do
  log_file="logs/pass10_5/${part}.log"
  echo "" >> "$REPORT_FILE"
  echo "--------------------------------------------------------------------------------" >> "$REPORT_FILE"
  echo "LOG: ${log_file}" >> "$REPORT_FILE"
  echo "--------------------------------------------------------------------------------" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  if [ -f "$log_file" ]; then
    cat "$log_file" >> "$REPORT_FILE"
  else
    echo "NOT DONE: Log file ${log_file} does not exist." >> "$REPORT_FILE"
  fi
  echo "" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "================================================================================" >> "$REPORT_FILE"
echo "SHIP MANDATORY VERIFICATION OUTPUTS" >> "$REPORT_FILE"
echo "================================================================================" >> "$REPORT_FILE"
if [ -f "logs/pass10_5/ship.log" ]; then
  cat "logs/pass10_5/ship.log" >> "$REPORT_FILE"
else
  echo "SHIP CHECKS PENDING" >> "$REPORT_FILE"
fi

echo "[make_report.sh] REPORT.md successfully generated."
