#!/usr/bin/env bash
# Mutation proof for the four critical pure implementations.
# Breaks one implementation at a time, shows the test failing, restores it.
set -u
cd "$(dirname "$0")/.."
. ./course-studio-run/test-env.sh

run_test() { # $1 = test file, $2 = label
  if npx tsx --test "$1" > /tmp/mut.log 2>&1; then
    echo "FAIL-TO-PROVE: $2 still passed after mutation"
    grep -E "^# (pass|fail)" /tmp/mut.log
    return 1
  else
    echo "PASS: $2 fails when implementation is broken"
    grep -E "^# (pass|fail)" /tmp/mut.log
    return 0
  fi
}

failures=0

# ── 1. ICS folding ─────────────────────────────────────────────────────────
cp lib/calendar/ics.ts /tmp/ics.bak
perl -pi -e 's/if \(Buffer\.byteLength\(line, "utf8"\) <= MAX_OCTETS\) return line/return line/' lib/calendar/ics.ts
echo "--- mutation 1: foldIcsLine no longer folds"
run_test tests/unit/course-studio-p3.test.ts "ics folding" || failures=$((failures+1))
cp /tmp/ics.bak lib/calendar/ics.ts

# ── 2. DTO sanitizer ──────────────────────────────────────────────────────
cp lib/courses/course-dto.ts /tmp/dto.bak
perl -pi -e 's/    safe\.videoUrl = null/    safe.videoUrl = rawLesson.videoUrl/' lib/courses/course-dto.ts
echo "--- mutation 2: guest DTO no longer strips videoUrl"
run_test tests/unit/course-studio-p3.test.ts "dto sanitizer" || failures=$((failures+1))
cp /tmp/dto.bak lib/courses/course-dto.ts

# ── 3. Rate limit ─────────────────────────────────────────────────────────
cp lib/rate-limit.ts /tmp/rl.bak
perl -0pi -e 's/const allowed = count <= limit;/const allowed = true;/' lib/rate-limit.ts
echo "--- mutation 3: checkRateLimit always allows"
run_test tests/unit/demo-chat-rate-limit.test.ts "rate limit" || failures=$((failures+1))
cp /tmp/rl.bak lib/rate-limit.ts

# ── 4. resolveCourseFormat explicit format ────────────────────────────────
cp lib/courses/format.ts /tmp/fmt.bak
perl -0pi -e 's/  const explicit = explicitFormat\(meta\)\n  if \(explicit\) return explicit/  const explicit = explicitFormat(meta)\n  if (false \&\& explicit) return explicit/' lib/courses/format.ts
echo "--- mutation 4: explicit metadata format ignored"
run_test tests/unit/course-format.test.ts "resolveCourseFormat" || failures=$((failures+1))
cp /tmp/fmt.bak lib/courses/format.ts

# verify restore
echo "--- restore check"
git diff --stat lib/calendar/ics.ts lib/courses/course-dto.ts lib/rate-limit.ts lib/courses/format.ts
echo "mutation failures: $failures"
exit $failures
