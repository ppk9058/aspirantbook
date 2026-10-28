# INVENTORY.md — Prototype Feature & Data Structure Mapping

Reference Specification: `docs/content-engine/Exam_Content_Engine-4.html`

---

## 1. Core Functions & Algorithm Mapping

| Prototype Function / Symbol | Description & Logic in Prototype | Target File / Service in TrillionSkill | Disposition |
| :--- | :--- | :--- | :--- |
| `nz(t)` | Unicode normalization (NFD, strip nukta U+093C, ZWJ/ZWNJ, Vedic marks, chandrabindu/nasal+halant -> anusvara, NFC) | `lib/modules/content-engine/classifier.ts` | **Ported** (Pure logic) |
| `T` | Keyword table mapping `[Subject, Topic, [keywords]]` (25 base rows) | `lib/modules/content-engine/taxonomy.ts` | **Ported** (Typed constants) |
| `HK` | Hindi keyword packs for Indus, Vedic, Mauryas, Mughals, etc. | `lib/modules/content-engine/taxonomy.ts` | **Ported** (Typed constants) |
| `SUBHI` / `TOPHI` | Static dictionary of Hindi translations for standard subjects & topics | `lib/modules/content-engine/taxonomy.ts` | **Ported** (Typed constants) |
| `classify(t, sub)` | Length-weighted keyword scoring (len >= 7 counts 2), tie-break to earlier row | `lib/modules/content-engine/classifier.ts` | **Ported** (Pure logic) |
| `inferRuns(o)` | Unmatched MCQ inherits (sub, top) from nearest matched MCQs in doc order if neighbours agree or 1 side within 5 | `lib/modules/content-engine/classifier.ts` | **Ported** (Pure logic) |
| `reCategoriseAll()` | Re-runs classifier + inferRuns on all items without manual override | `lib/modules/content-engine/classifier.ts` | **Ported** (Pure logic) |
| `isFlat(t)` / `flat(t)` | Detects and unstacks run-together PDF text with inline `(a)`/`(b)` options | `lib/modules/content-engine/parser.ts` | **Ported** (Pure logic) |
| `ansIdx(a, o)` | Maps answer string ("C", "(c)", text) to 0-based option index | `lib/modules/content-engine/parser.ts` | **Ported** (Pure logic) |
| `matchParse(q)` | Parses List-I / List-II matching questions with Codes table | `lib/modules/content-engine/parser.ts` | **Ported** (Pure logic) |
| `stmtParse(q)` | Parses multi-statement questions ("1. ... 2. ... Which of the above...") | `lib/modules/content-engine/parser.ts` | **Ported** (Pure logic) |
| `shortQ(q)` | Generates clean short question titles for breadcrumbs and lists | `lib/modules/content-engine/parser.ts` | **Ported** (Pure logic) |
| `hiNorm(t)` | Normalizes Hindi question prefixes ("प्रश्न 1.", "उत्तर:", "व्याख्या:", "क/ख/ग/घ") | `lib/modules/content-engine/parser.ts` | **Ported** (Pure logic) |
| `parse(txt)` | Multi-layout question parser with headings, options, answer keys, explanations | `lib/modules/content-engine/parser.ts` | **Ported** (Pure logic) |
| `examOf(src)` / `EX` regex | Exam name extraction and year regex (1980–2039) | `lib/modules/content-engine/exam-detector.ts` | **Ported** (Extended exam list + DB aliases) |
| `refInfo(i)` / `rexp(i)` | Cross-reference resolver up to depth 3 ("see explanation of question n") | `lib/modules/content-engine/cross-ref.ts` | **Ported** (Pure logic) |
| `sents(t)` / `hl(s, ans)` | Sentence splitter (Devanagari-aware) & key term highlighter | `lib/modules/content-engine/solution-formatter.ts` | **Ported** (Pure logic) |
| `rich(ex)` / `fmtSol(i)` | Rich solution renderer with tables, bullets, option analysis, and related points | `lib/modules/content-engine/solution-formatter.ts` | **Ported** (Pure logic) |
| `pair(i, f, m)` | 3-way language switch logic (English, Hindi, Split/Both) | `lib/modules/content-engine/pairing.ts` | **Ported** (Pure logic & React component) |
| `prep()` / Quality Gates | Quality checks: missing answer, thin explanation, duplicate, uncategorized | `lib/modules/content-engine/quality-gates.ts` | **Ported** (Pure logic) |
| `himp(txt)` | Hindi import parser supporting JSON and `EN:/HQ:/HA:/HE:/HT:/OK:` blocks | `lib/modules/content-engine/assist-io.ts` | **Ported** (Pure logic) |
| `zip(F)` / `crc(b)` | In-memory zero-dependency ZIP archive creator | `lib/modules/content-engine/zip.ts` | **Ported** (Pure logic) |
| `gen()` / `genHi()` | Static site and XML sitemap generator | `lib/modules/content-engine/export-site.ts` | **Ported** (Pure logic) |

---

## 2. Deleted AI Call Sites (Zero-Cost Compliance)

| Function in Prototype | AI Call Site (`claude.use`) | Action Taken | Replacement / Disposition |
| :--- | :--- | :--- | :--- |
| `autoCat()` | `await sm.json("Classify these Indian competitive-exam questions...")` | **DELETED** | Replaced by deterministic keyword classifier (`classify`), manual subject/topic picker at paste, and manual-assist JSON category export/import (`assist-io.ts`). |
| `autoSol(id)` | `await sm.json("You write exam solutions for Indian competitive exams...")` | **DELETED** | Replaced by manual input/source explanation parser and human solution editing. |
| `trRun()` | `await smp.json("Translate these exam MCQs into...")` | **DELETED** | Replaced by manual Hindi text block & JSON importer (`himp`) and manual export loop for external human/free translation. |
| `verify()` | Model A (`sm.json` default) & Model B (`sm.json` complex) blind verification | **DELETED** | Replaced by human editorial verification checkbox (`isVerified` flag) in Quality Gates. |

---

## 3. UI Tabs & Screen Mapping

| Prototype Screen / Tab | Description | Target Route & Component in TrillionSkill |
| :--- | :--- | :--- |
| **Home / Library** | Stats cards, browse by subject, browse by exam, year charts, topic charts | `app/admin/content-engine/page.tsx` + `components/admin/content-engine/LibraryView.tsx` |
| **Add Content** | Add batch form with subject/topic selector, exam/year defaults + full text editor | `app/admin/content-engine/add/page.tsx` + `components/admin/content-engine/AddBatchView.tsx` |
| **Assign** | Question list with checkboxes, range select ("1-10, 15"), batch/uncategorized filter | `app/admin/content-engine/assign/page.tsx` + `components/admin/content-engine/AssignView.tsx` |
| **Hindi (Import · Review)** | Import JSON/blocks, review checklist with person verification tick | `app/admin/content-engine/hindi/page.tsx` + `components/admin/content-engine/HindiStudioView.tsx` |
| **Categories & Re-categorise** | All-in-one-topic warning card, manual overrides list, re-categorise-all trigger | `app/admin/content-engine/categories/page.tsx` + `components/admin/content-engine/CategoriesView.tsx` |
| **Exam Aliases** | Admin UI to view, add, and remove exam alias detection tags | `app/admin/content-engine/aliases/page.tsx` + `components/admin/content-engine/AliasesView.tsx` |
| **Quality Gates** | Gate failure breakdown (thin explanation, missing answer, duplicate, etc.), wave publisher | `app/admin/content-engine/gates/page.tsx` + `components/admin/content-engine/GatesView.tsx` |
| **Export Site (Cloudflare)** | Static ZIP generator, duplicate-content mirror/primary selector, CSV quality report | `app/admin/content-engine/export/page.tsx` + `components/admin/content-engine/ExportView.tsx` |
| **Practice Preview** | Admin practice quiz preview, instant feedback, score, copyable Telegram post, print PDF | `app/admin/content-engine/practice/page.tsx` + `components/admin/content-engine/PracticeView.tsx` |
| **Public Question Pages** | Public SEO question pages, breadcrumbs, Quiz JSON-LD, instant check, solution | `app/question-answer/[...slug]/page.tsx` + `app/hi/question-answer/[...slug]/page.tsx` |

---

## 4. LocalStorage Keys to Database Persistence Mapping

| Prototype Key | Stored Data in Prototype | Target Prisma Model & Fields |
| :--- | :--- | :--- |
| `ece_txt` | Raw pasted text backup | `ContentEngineBatch.pastedText` |
| `ece_hi` | Hindi translations indexed by question hash `hk(i)` | `ContentEngineTranslation` (`lang: "hi"`, `q`, `options`, `explanation`, `isReviewed`) |
| `ece_cat` | Subject/topic manual overrides & custom Hindi names | `ContentEngineCategoryOverride` (`sub`, `top`, `subHi`, `topHi`, `exam`, `year`, `isManual`) |
| `ece_recat` | Boolean flag for re-categorisation state | Managed dynamically on server |
| `ece_last` | Array of question hashes in the last pasted batch | `ContentEngineBatch.id` relation to `ContentEngineQuestion.batchId` |
| `ece_gen` | AI-generated solutions | **Removed** (AI call site eliminated) |
| `ece_en` | English translations for Hindi-first questions | `ContentEngineTranslation` (`lang: "en"`, `q`, `options`, `explanation`, `isReviewed`) |
| `ece_seo` | Site settings: site URL, reviewer name, wave size, strict mode | `ContentEngineSetting` table (`key: "seo"`, `value: Json`) |
