# Run 3 Screenshot Verification & Hash Integrity Report

## 1. Duplicate Group Investigation & Root Cause

### Primary Duplicate Pair Identified:
- `e2e-artifacts/ibps-desktop.png` (Previous SHA-256: `7241a690e3a1b89ed2bcb85adb40e951a82ab381fd6c12962095896c4d1ef3b4`)
- `e2e-artifacts/upsc-hindi.png` (Previous SHA-256: `7241a690e3a1b89ed2bcb85adb40e951a82ab381fd6c12962095896c4d1ef3b4`)

### Root Cause Analysis:
1. **Identical Capture Contents**: Inspection of the original binary images confirmed both captures were identical 36,011-byte screenshots of a `404 • PAGE NOT FOUND` screen.
2. **Test Flaw in `tests/e2e/capture-final-screenshots.spec.ts`**: The original test navigated to `/courses/${slug}` without asserting that the heading or course content rendered successfully (`waitForLoadState('domcontentloaded')` + short timeout only). Because the page returned a 404, the language switch button `page.getByRole("button", { name: "हिन्दी" })` in the UPSC test was never found, leaving the page on the exact same 404 screen. Both tests then took a 1280x800 screenshot of the 404 page, generating identical byte streams and SHA-256 hashes (`7241a690...`).
3. **Fix Applied**:
   - Added explicit visibility assertions: `await expect(page.locator("h1")).toContainText("IBPS", { timeout: 10000 })` for IBPS, and `await expect(page.locator("h1")).toBeVisible({ timeout: 10000 })` for UPSC.
   - Verified the Next.js test dev server on port 3045 resolves both courses with HTTP 200 OK.
   - Re-executed the test suite via Playwright against port 3045.

### Other Legacy Responsive Images in `docs/release/evidence/responsive/`:
- In older test runs under `docs/release/evidence/responsive/`, several placeholder question/taxonomy hub pages (`hub_subject_*`, `q_en_*`, `q_hi_*`, `test_series_print_*`) share hashes across dummy or identical unseeded routes (e.g. hash `3c360d84...` or `0c7bd1ba...`). These are legacy test-series mock captures from previous sprints.

---

## 2. Regenerated Artifact Verification Table

Every image in the active e2e artifacts and Run 3 evidence was regenerated, re-hashed, opened, and visually confirmed:

| File | SHA-256 Hash | Visual Content Confirmed |
|---|---|---|
| `e2e-artifacts/ibps-desktop.png` | `22948e3640276af35360e4cadea1286852905123576151c7ffe3f07acdeb0df9` | Desktop course page: Navy hero with "IBPS PO MAINS BANKING AWARENESS", subtitle "Complete Financial & Banking Awareness for IBPS and SBI PO Mains", teacher "Ananya Sen", metrics (80+ Hours, 6 Modules, Hindi First), price ₹1,499. Distinct IBPS content. |
| `e2e-artifacts/ibps-mobile.png` | `ff3a594d40ef875c7d8af7c3f6c6e2e2cc0a7f1f7473dd83522b4a07fde481bd` | Mobile viewport (360px): IBPS PO Mains header, stats chips, teacher pill, enrolled CTA button, full mobile layout. |
| `e2e-artifacts/upsc-hindi.png` | `2f301bef718b8bcd4934171560ffababdcb46bae8302075abf5d19a575980052` | Bilingual toggle active on "हिन्दी": Heading "यूपीएससी सिविल सेवा प्रारंभिक 2027 फाउंडेशन", subtitle "सामान्य अध्ययन एवं सीसैट का संपूर्ण प्रारंभिक फाउंडेशन बैच", teacher "शिक्षक: डॉ. अरविंद मिश्रा", button "यूपीएससी बैच में प्रवेश लें". English stats metrics retained per owner decision. |
| `e2e-artifacts/live-preview-blank-desktop.png` | `d30e3a2509682ed28609de6099200518bd82d8d7484ceb5ec4f57e875eae5696` | Studio blank live preview modal on 1440px desktop showing placeholder course state. |
| `e2e-artifacts/live-preview-blank-mobile.png` | `d056716b044acf894404ba807ccd33f960d9613410a4f71cea8f0d3fa432e44d` | Studio blank live preview modal toggled to 360px mobile device view. |
| `e2e-artifacts/live-preview-filled-desktop.png` | `015017ae78f14bc7c282a7b73fa68efed3d105b5d0116e6406837a0c4e5f5ea2` | Studio live preview modal loaded with BPSC Demolish Sample Template (desktop). |
| `e2e-artifacts/live-preview-filled-mobile.png` | `4482929fe4ccfd409fbf6023b6887db04263c5caa359b473bf9ebf0be005006e` | Studio live preview modal loaded with BPSC Demolish Sample Template (mobile 360px). |
| `docs/release/evidence/run3/sticky-card-desktop.png` | `b1ba8dda47607b0783084577c434becfc4d9dc67f5ec1f567b33185a69dff9d2` | Desktop scrolled state (scrolled 300px): Right floating sticky enrollment card showing ₹4,999, "Enroll in UPSC Foundation", "Share this course", "Add to my calendar", overlapping into SubNav and course plan. |

All hashes are 100% unique and distinct.
