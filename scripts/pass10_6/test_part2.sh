#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 2: /profile USER MISSING IN DB & DB ERROR HANDLING ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo ""

echo "--- 2.1 Database Verification for Missing User ID ---"
echo ">>> Querying trillionskill-test-db for user 'u_student_p10_5':"
docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -c "SELECT id, email, name, role FROM \"User\" WHERE id = 'u_student_p10_5';"

echo ""
echo "--- 2.2 Seeded User Profile Request (Valid User in DB) ---"
SEEDED_USER=$(docker exec -i trillionskill-test-db psql -U postgres -d trillionskill_test -t -A -c "SELECT id FROM \"User\" WHERE role IN ('FREE', 'PREMIUM') LIMIT 1;")
echo "Found seeded student user: ${SEEDED_USER}"

echo "Testing profile access with seeded user via Prisma query..."
DATABASE_URL="postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test" npx ts-node --compiler-options '{"module":"commonjs"}' -e '
const { prisma } = require("./lib/prisma");
async function main() {
  const user = await prisma.user.findFirst({
    where: { role: { in: ["FREE", "PREMIUM"] } },
    select: { id: true, email: true, role: true, name: true }
  });
  console.log("Seeded user lookup directly in DB:", user);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) });
'

echo ""
echo "--- 2.3 curl /profile Behavior for Anonymous and Missing User ---"
echo ">>> Anonymous request to /profile (No Cookie):"
curl -s -S -i "http://127.0.0.1:3045/profile" | head -n 12

echo ""
echo ">>> Follow redirect on anonymous request:"
curl -s -S -L -i -o /dev/null -w "FINAL_URL: %{url_effective} | HTTP_CODE: %{http_code} | HOPS: %{num_redirects}\n" "http://127.0.0.1:3045/profile"

echo ""
echo "--- 2.4 Verify Code Fix in app/(dashboard)/profile/page.tsx ---"
echo ">>> Showing lines around user lookup and missing DB user handling:"
sed -n '75,108p' app/\(dashboard\)/profile/page.tsx

echo ""
echo "--- 2.5 Grep for redirect(\"/\") and redirect(\"/login\") across app/ and components/ ---"
echo "Total occurrences:"
grep -rnE 'redirect\("(/|/login)"\)' app components | wc -l
echo "Detailed table:"
grep -rnE 'redirect\("(/|/login)"\)' app components
