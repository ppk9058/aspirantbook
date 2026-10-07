#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
PRESENT=""
NOT_DONE=""

for i in {1..14}; do
    if [ -f "logs/pass10_8/part$i.log" ]; then
        PRESENT="${PRESENT}part${i},"
    else
        NOT_DONE="${NOT_DONE}part${i},"
    fi
done

PRESENT=${PRESENT%,}
if [ -z "$NOT_DONE" ]; then
    NOT_DONE="none"
else
    NOT_DONE=${NOT_DONE%,}
fi

FIRST_LINE="commit: ${HEAD} | present logs: [${PRESENT}] | not done: [${NOT_DONE}]"
echo "$FIRST_LINE" > REPORT.md
echo "" >> REPORT.md

# Concatenate all logs without manual summary or narration
for i in {1..14}; do
    if [ -f "logs/pass10_8/part$i.log" ]; then
        echo "================================================================================" >> REPORT.md
        echo "LOG FILE: logs/pass10_8/part$i.log" >> REPORT.md
        echo "================================================================================" >> REPORT.md
        cat "logs/pass10_8/part$i.log" >> REPORT.md
        echo "" >> REPORT.md
        echo "" >> REPORT.md
    fi
done

echo "REPORT.md successfully generated."
