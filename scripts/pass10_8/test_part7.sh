#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 7: SERVER ACTIONS INVENTORY & AUTH/OWNERSHIP AUDIT ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo ""

SA_FILES=$(grep -rnwl "use server" app lib | sort)
SA_COUNT=$(echo "${SA_FILES}" | wc -l | tr -d ' ')
echo "Total files with 'use server': ${SA_COUNT}"
echo ""

for f in ${SA_FILES}; do
  echo ">>> File: ${f}"
  # Extract exported async functions
  ACTIONS=$(grep -oE "export async function [A-Za-z0-9_]+" "$f" | awk '{print $4}' || true)
  echo "    Exported Actions: ${ACTIONS:-None}"
  
  # Check auth mechanisms in this file
  AUTH_CHECK=$(grep -nE "(auth\(\)|session|requireAdmin|requireTeacher|UserRole|userId)" "$f" | head -n 5 || echo "    No explicit auth lines found")
  echo "    Auth Lines:"
  echo "${AUTH_CHECK}"
  echo ""
done

echo "=== PART 7 AUDIT COMPLETE ==="
