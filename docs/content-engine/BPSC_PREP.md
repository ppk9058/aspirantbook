# BPSC 70th 2024 Paper Preparation & Dry-Run Report (Phase G)

## 1. Dry-Run Tool Architecture (G1 & G2)
- **Tool:** `scripts/content-engine-dry-run.ts`
- **Usage:** `npx tsx scripts/content-engine-dry-run.ts <path-to-txt> [out-json-path]`
- **Capabilities:** Offline, read-only diagnostics execution running `parseWithDiagnostics()`, `classify()`, and `isOcrJunkLine()`. Extracts:
  - `totalParsed`: total questions parsed
  - `skippedCount`: count of unparsed or malformed lines
  - `first5Skipped`: first 5 skipped snippet lines
  - `junkLinesStripped`: count of OCR header/footer junk lines removed
  - `questionNumbersOptionsNot4`: questions with option count != 4
  - `emptyStems`: questions missing stems
  - `stemsLookMerged`: stems containing nested question numbering
  - `distinctSubjectTopicPairs`: unique Subject / Topic pairs
  - `subjectCount` & `topicCount`: unique taxonomy categories
  - `taggedWithExamAndYearCount`: questions with parsed exam name and year
- **Fixture Verification (G2):**
  - Fixture: `tests/fixtures/dry-run-sample.txt` (generic 5-question placeholder text; zero exam content fabricated).
  - Result: 5 parsed, 0 skipped, 0 junk lines, 0 options != 4, 1 subject, 2 topics.
  - Evidence: `docs/release/evidence/phaseG_dry_run_test.txt` and `docs/content-engine/samples/dry_run_sample.json`.

---

## 2. Authentic BPSC 70th Source File Audit (G3)
- **Status:** **Source file NOT FOUND**
- **Search Execution & Methodology:**
  1. Searched entire repository for `*BPSC*`, `*70th*`, and `*bpsc*`.
  2. Searched git history across all commits (`git log --all --name-only`).
  3. No authentic English text file (e.g. `BPSC_70th_2024_ContentEngine_English.txt` or equivalent 150-question paper) exists in the repository.
- **Global Zero-Hallucination Adherence (Rule 3):**
  - No synthetic, LLM-generated, or web-scraped questions are substituted. Content comes exclusively from authentic owner-provided files.

---

## 3. Phase G Sub-Item Status Table

| Item | Description | Status | Reason |
|:---:|---|:---:|---|
| **G1** | Reusable offline dry-run tool | **DONE** | Implemented at `scripts/content-engine-dry-run.ts`. |
| **G2** | Synthetic generic 5-question fixture test | **DONE** | Passed 5/5 at `tests/fixtures/dry-run-sample.txt`. |
| **G3** | Authentic BPSC 70th source check | **DONE (NOT FOUND)** | Source file not present in repository. |
| **G4** | 150-question full parser verification | **NOT TESTED** | Source file not provided by owner. |
| **G5** | Real classifier taxonomy mapping | **NOT TESTED** | Source file not provided by owner. |
| **G6** | DB dry-run transaction test (`BPSC-70-VERIFY`) | **NOT TESTED** | Source file not provided by owner. |
| **G7** | Hindi skeleton generation | **NOT TESTED** | Source file not provided by owner. |

---

## 4. Owner Tasks for BPSC 70th Ingestion
1. Place authentic raw text file `BPSC_70th_2024_ContentEngine_English.txt` in `docs/content-engine/samples/`.
2. Run offline diagnostics:
   ```bash
   npx tsx scripts/content-engine-dry-run.ts docs/content-engine/samples/BPSC_70th_2024_ContentEngine_English.txt docs/content-engine/samples/bpsc_70th_dry_run.json
   ```
3. Verify output: 150 parsed, 0 skipped, 4 options each, exam "BPSC", year 2024.
4. Supply Hindi translation skeleton (`EN:/HQ:/HA:/HE:/HT:/OK:`) and official answer key.
5. Ingest via Admin Content Engine Add Batch UI.
