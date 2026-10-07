#!/usr/bin/env bash
set -e

HEAD=$(git rev-parse HEAD)
echo "=== PART 7: REGRESSION AUDIT: HomeHeaderUserCTA / LANDING CTA ==="
echo "Commit: ${HEAD}"
echo "Date: $(date -u)"
echo ""

echo "--- 7.1 Inspect HomeHeaderUserCTA Evolution across Commits ---"
echo ">>> Commit 8748475:"
git show 8748475:components/home/HomeHeaderUserCTA.tsx 2>/dev/null || echo "File did not exist in 8748475"

echo ""
echo ">>> Commit 9f7e99b:"
git show 9f7e99b:components/home/HomeHeaderUserCTA.tsx 2>/dev/null || echo "File did not exist in 9f7e99b"

echo ""
echo ">>> Current HEAD (${HEAD}):"
cat components/home/HomeHeaderUserCTA.tsx

echo ""
echo "--- 7.2 Inspect Landing Page Header & Navigation Links ---"
grep -n -C 5 "HomeHeaderUserCTA" components/layout/TopNavBar.tsx components/home/Header.tsx app/page.tsx 2>/dev/null || true

echo ""
echo "--- 7.3 Capture Screenshots of Landing Page at Desktop & Mobile ---"
npx ts-node --compiler-options '{"module":"commonjs"}' << 'TS_EOF'
import { chromium } from "playwright"
import path from "path"

async function capture() {
  const browser = await chromium.launch()
  
  // Desktop
  const pageDesk = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await pageDesk.goto("http://127.0.0.1:3045/", { waitUntil: "networkidle" })
  await pageDesk.screenshot({ path: path.join(process.cwd(), "artifacts/pass10_6/landing-desktop.png"), fullPage: false })
  console.log("Captured: artifacts/pass10_6/landing-desktop.png (1280x800)")

  // Mobile
  const pageMob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  await pageMob.goto("http://127.0.0.1:3045/", { waitUntil: "networkidle" })
  await pageMob.screenshot({ path: path.join(process.cwd(), "artifacts/pass10_6/landing-mobile.png"), fullPage: false })
  console.log("Captured: artifacts/pass10_6/landing-mobile.png (390x844)")

  await browser.close()
}
capture().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
TS_EOF
