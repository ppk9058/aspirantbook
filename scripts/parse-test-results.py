import re
import sys
from collections import defaultdict

def parse_log(log_path):
    spec_counts = defaultdict(lambda: {"pass": 0, "fail": 0, "tests": []})
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            m = re.search(r'^\s*([✓✘])\s+\d+\s+\[([^\]]+)\]\s+›\s+tests/e2e/([^:]+):(\d+):(\d+)\s+›\s+(.*)', line)
            if m:
                status_icon, project, spec, lno, col, test_desc = m.groups()
                status = "PASS" if status_icon == "✓" else "FAIL"
                spec_counts[spec]["tests"].append((project, test_desc.strip(), status))
                if status == "PASS":
                    spec_counts[spec]["pass"] += 1
                else:
                    spec_counts[spec]["fail"] += 1
    return spec_counts

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse-test-results.py <log_file>")
        sys.exit(1)
    
    counts = parse_log(sys.argv[1])
    total_pass = sum(c["pass"] for c in counts.values())
    total_fail = sum(c["fail"] for c in counts.values())
    print(f"Total Specs: {len(counts)} | Passed: {total_pass} | Failed: {total_fail}")
    for spec, data in sorted(counts.items()):
        print(f"### `{spec}` ({data['pass']} passed, {data['fail']} failed)")
        for proj, desc, st in data["tests"]:
            print(f"- [{proj}] {st}: {desc}")
        print()
