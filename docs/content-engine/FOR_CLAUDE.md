# CONTENT ENGINE EXPLAINER FOR CLAUDE
**Generated from real code inspection** | Branch: `content-engine-integration` | Head commit: `4980407`

---

## 1. STATUS
- **Branch**: `content-engine-integration`
- **Last Commit**: `4980407 feat(content-engine): Phase 5 - Playwright E2E integration test suite, dynamic routing consolidation, and test evidence`
- **Phase Status**:
  - Phase 0: **DONE** — Inventory, mapping & architectural decisions (`docs/content-engine/INVENTORY.md`, `DECISIONS.md`, commit `c420f55`)
  - Phase 1: **DONE** — Pure logic port and unit tests (`lib/modules/content-engine/parser.ts`, `classifier.ts`, `exam-detector.ts`, commit `aa3ff61`)
  - Phase 2: **DONE** — Additive Prisma schema migration, DB persistence, admin APIs (`prisma/schema.prisma`, `lib/modules/content-engine/db-service.ts`, commit `96cb408`)
  - Phase 3: **DONE** — Admin UI pages, 3-way language switch, navigation registration, static ZIP export (`app/admin/content-engine/`, `components/admin/content-engine/`, commit `21e26ce`)
  - Phase 4: **DONE** — Public SEO question & hub routes, Hindi twin routes, XML sitemaps, robots.ts (`app/question-answer/`, `app/hi/question-answer/`, commit `9bf4ea2`)
  - Phase 5: **DONE** — Playwright E2E integration test suite, dynamic routing consolidation, test evidence (`tests/e2e/content-engine.spec.ts`, commit `4980407`)
- **How to Start App Locally**:
  - Test server (isolated port 3045, Docker test DB `127.0.0.1:54329`):
    `PORT=3045 NEXT_DIST_DIR=.next-test npx next dev --hostname 127.0.0.1 --port 3045`
  - Dev server:
    `npm run dev` (starts Next.js on `http://localhost:3000`)
- **Admin URLs**:
  - Library: `/admin/content-engine` (`app/admin/content-engine/page.tsx:1`)
  - Add: `/admin/content-engine/add` (`app/admin/content-engine/add/page.tsx:1`)
  - Assign: `/admin/content-engine/assign` (`app/admin/content-engine/assign/page.tsx:1`)
  - Hindi: `/admin/content-engine/hindi` (`app/admin/content-engine/hindi/page.tsx:1`)
  - Aliases: `/admin/content-engine/aliases` (`app/admin/content-engine/aliases/page.tsx:1`)
  - Gates: `/admin/content-engine/gates` (`app/admin/content-engine/gates/page.tsx:1`)
  - Export: `/admin/content-engine/export` (`app/admin/content-engine/export/page.tsx:1`)
  - Practice: `/admin/content-engine/practice` (`app/admin/content-engine/practice/page.tsx:1`)
  - Categories: `/admin/content-engine/categories` (`app/admin/content-engine/categories/page.tsx:1`)

---

## 2. PASTE FORMAT (server parser, `lib/modules/content-engine/parser.ts`)

- **Question Numbering**:
  - Regex `m = l.match(/^Q(?:uestion)?\.?\s*(\d+)\s*[.):\-]?\s*(.*)/i)` (`parser.ts:412`): matches `Q1.`, `Question 1:`, `Q1)`, `Q 1 -`.
  - Regex `m = l.match(/^(\d{1,3})\s*[.)]\s+(.+)/)` (`parser.ts:439`): matches `1. `, `1) `, `100. ` (up to 3 digits).
  - Fallback option digit: `OPT = /^\(?([A-Ea-e1-5])[.)]\s*(.+)/` (`parser.ts:433-435`): if `\d` matched and out of sequential option order, triggers `start(m[2], +lab)`.
  - If no number: `start(l, 0)` (`parser.ts:445`), setting `no = 0`, which maps to `sourceNo: null` in DB (`db-service.ts:189`).
- **Options**:
  - Label regex: `OPT = /^\(?([A-Ea-e1-5])[.)]\s*(.+)/` (`parser.ts:30`). Matches `(A)`, `(a)`, `A.`, `A)`, `1.`, `1)` up to `E`/`5`.
  - Sequential matching: `idx === cur.o.length && (cur.o.length < 4 || lab === "e")` (`parser.ts:429`).
  - Inline options: `ip = l.split(/\s+(?=\(?[A-Da-d1-4][.)]\s)/)` (`parser.ts:417-424`). If `ip.length >= 3` and every chunk satisfies `OPT.test(x)`, options are unpacked from a single line.
  - Multi-line option continuation: if in mode `"o"` without a blank line, `cur.o[cur.o.length - 1] += " " + l` (`parser.ts:460-464`).
- **Multi-line Question Statements**:
  - Continuation lines without preceding blank lines append to `cur.q`: `cur.q += " " + l` (`parser.ts:466-467`).
  - **CRITICAL PITFALL**: If any statement line begins with `a.` or `b.` (e.g. `a. He founded Vakataka dynasty.`), `OPT` matches `a.` with `idx = 0`. Since `cur.o.length === 0`, `idx === cur.o.length` is `true`, so the statement is misparsed as Option A (`parser.ts:426-432`). Use Roman numerals (`i.`, `ii.`) or Hindi characters instead.
  - A blank line within question text triggers `wb = true`, causing `start(l, 0)` (`parser.ts:466`), cutting the question in two!
- **Answers**:
  - Per-question line: `/^(?:correct\s+)?(?:ans(?:wer)?|key)\s*[:\-.)]\s*(.+)/i` (`parser.ts:400`). Captures `cur.ans`.
  - Answer Key block: `/^answers?\s*key/i` or lines with 3+ pairs matching `(\d+)\s*[-:.)]\s*\(?([A-Da-d])\)?(?=[\s,;]|$)/g` (`parser.ts:360-368`). Parses into `keys[number] = letter.toLowerCase()`.
  - **Does answer key at END attach to earlier questions? YES**. During `out.forEach` post-processing (`parser.ts:474-476`), if `!i.ans && i.no && keys[String(i.no)]`, it attaches `i.ans = keys[String(i.no)]` and calculates `i.a = ansIdx(i.ans, i.o)`.
- **Subject / Topic Scope**:
  - Rule: `const t = cur && cur.o.length && !wb ? cur : ctx` (`parser.ts:385`).
  - Scoped to **current question only** if placed immediately after options with no preceding blank line (`!wb`).
  - Scoped to **all subsequent questions** (`ctx`) if preceded by a blank line or placed at the start of paste.
- **Headings, Source, Bracket Tags**:
  - Heading `## BPSC 2024`: regex `/^(?:#{1,4}|={2,}|\*{2,})\s*(.+?)[\s=*#]*$/` (`parser.ts:371`). If `examOf(h)` or year matches, sets `ctx.src = h`.
  - `Source:` lines: `/^(source|asked in|previously asked in|previous year|exam|paper|year|shift)\s*[:\-]\s*(.+)/i` (`parser.ts:392`). Sets `t.src`.
  - Bracket tags: `detectBracketTag(i.q)` (`parser.ts:479-484`; `exam-detector.ts:132-154`). Detects `[BPSC 2024]` or `(RAS 2013)` at end of question text, strips it from `q`, and sets `i.src = tag`.
  - `i.exam = examOf(i.src)` (`parser.ts:487`), `i.year = yearOf(i.src)` (`parser.ts:486`), `sourceNo: item.no ? Number(item.no) : null` (`db-service.ts:189`).
- **Unparsed Text Handling**:
  - Silently dropped in `fin()` (`parser.ts:307`) if `q.length < 3` or (`cur.o.length < 2 && q.length <= 25`).
  - If `q.length > 25 && cur.o.length < 2`, created as `type: "Note"`.
- **Max Limits**:
  - `AddBatchSchema`: `pastedText` min 5, max 2MB (`2 * 1024 * 1024` chars) (`schemas.ts:8-11`).
  - DB Insertion: chunks of 500 (`CHUNK_SIZE = 500`) (`db-service.ts:200`).

---

## 3. PARSER OUTPUT PROOF

### Test 1: Parser Run on Raw Sample (No Answer Key)
**Command**: `npx tsx -e 'import { parse } from "./lib/modules/content-engine/parser"; console.log(JSON.stringify(parse(sample), null, 2));'`
**Result**: **PASS**
```json
[
  {
    "no": 1,
    "q": "Which of the following is an iron ore?",
    "o": [
      "Bauxite",
      "Cinnabar",
      "Pyrite",
      "Limonite"
    ],
    "ans": "",
    "a": -1,
    "exp": "",
    "src": "BPSC 2024",
    "exam": "BPSC",
    "year": "2024",
    "sub": "Geography",
    "top": "Minerals",
    "type": "MCQ",
    "id": 1
  },
  {
    "no": 2,
    "q": "Match the following. Founder: a. Subhash Chandra Bose, b. Inayatullah Mashriqui Organisation: I. Khaksars, II. Forward Bloc",
    "o": [
      "I-b, II-a",
      "I-a, II-b",
      "I-b, II-b",
      "More than one of the above"
    ],
    "ans": "",
    "a": -1,
    "exp": "",
    "src": "BPSC 2024",
    "exam": "BPSC",
    "year": "2024",
    "sub": "Modern India",
    "top": "National Movement",
    "type": "MCQ",
    "id": 2
  },
  {
    "no": 3,
    "q": "Consider the following:",
    "o": [
      "He founded Vakataka dynasty.",
      "He is mentioned in Puranas. Which is correct? (A) a only (B) b only",
      "a and b",
      "None of the above"
    ],
    "ans": "",
    "a": -1,
    "exp": "",
    "src": "BPSC 2024",
    "exam": "BPSC",
    "year": "2024",
    "sub": "Ancient India",
    "top": "Dynasties",
    "type": "MCQ",
    "id": 3
  }
]
```
*(Notice: Q3 demonstrates the `a.`/`b.` trap: statements `a.` and `b.` were absorbed as options A and B)*

### Test 2: Parser Run with Trailing Answer Key (`Answer Key: 1-B 2-B 3-A`)
**Command**: `npx tsx -e '... parse(sampleWithKey) ...'`
**Result**: **PASS** (Answers attached cleanly to previous questions in same paste)
- Q1 attached: `"ans": "b", "a": 1`
- Q2 attached: `"ans": "b", "a": 1`
- Q3 attached: `"ans": "a", "a": 0`

---

## 4. HINDI FORMAT (`lib/modules/content-engine/assist-io.ts`)

- **Tags Explained**:
  - `EN:` (Required for matching): Exact English question text (single-line, whitespace normalized). Used to match target question via `hashQuestionText(item.en)` (`assist-io.ts:81`; `db-service.ts:439`).
  - `HQ:` (Required): Hindi question stem in Devanagari. If empty, the entire block is dropped (`assist-io.ts:160`).
  - `HA:` (Required): Hindi options separated by ` | ` (`assist-io.ts:83, 161`). Count of options MUST match the English question (`db-service.ts:460`).
  - `HE:` (Optional): Hindi explanation. Multi-line supported using literal `\n` escaping (`assist-io.ts:84, 170`).
  - `HT:` (Optional): Hindi Topic name (`assist-io.ts:85, 171`).
  - `OK:` (Required): Verification flag. `OK: no` imports as unreviewed (`isReviewed: false`). `OK: yes` / `y` / `1` / `true` imports as reviewed (`isReviewed: true`) (`assist-io.ts:172`).
- **Exact Output of "Export questions missing Hindi" (2 Sample Questions)**:
```text
# INSTRUCTIONS FOR TRANSLATOR
# Translate each block into clear Hindi (Devanagari).
# Keep numbers, years, option codes, and option counts identical.
# Separate options in HA with " | ".
# Set OK: no (remains unreviewed until verified by an editor).

EN: Which of the following is an iron ore?
HQ: 
HA: Bauxite | Cinnabar | Pyrite | Limonite
HE: Limonite is an iron ore consisting of a mixture of hydrated iron(III) oxide-hydroxides.
HT: Minerals
OK: no
###
EN: Match the following. Founder: a. Subhash Chandra Bose, b. Inayatullah Mashriqui Organisation: I. Khaksars, II. Forward Bloc
HQ: 
HA: I-b, II-a | I-a, II-b | I-b, II-b | More than one of the above
HE: Subhash Chandra Bose founded the Forward Bloc in 1939. Inayatullah Mashriqui founded the Khaksar movement in 1931.
HT: National Movement
OK: no
```
- **Filled-in Import Example for Q1**:
```text
EN: Which of the following is an iron ore?
HQ: निम्नलिखित में से कौन सा लौह अयस्क है?
HA: बॉक्साइट | सिनाबार | पाइराइट | लिमोनाइट
HE: लिमोनाइट एक लौह अयस्क है जिसमें हाइड्रेटेड आयरन(III) ऑक्साइड-हाइड्रॉक्साइड का मिश्रण होता है।
HT: खनिज
OK: yes
```
- **Matching Mechanism**:
  - Matched **strictly by English text**: `textHash = hashQuestionText(item.en)` (`db-service.ts:439`), with fallback `q: { startsWith: item.en.slice(0, 40) }` (`db-service.ts:449`).
  - Question numbers (`no` or `sourceNo`) are completely ignored during Hindi import.
  - Can you paste English block then Hindi block in one paste? **NO**. The main parser creates new standalone questions from Hindi text (using `hiNorm`). Hindi translations MUST be imported via the Hindi import route (`/admin/content-engine/hindi` / `/api/admin/content-engine/hindi/import`).

---

## 5. ANSWERS
- **Bulk Add Answers by Batch + Source Number**: **NOT FOUND**.
  - There is NO API or UI to bulk-update answers by `(batchId, sourceNo)`.
  - Questions can only be updated individually via `PATCH /api/admin/content-engine/questions` (`app/api/admin/content-engine/questions/route.ts:45`) passing `{ id, answer, answerIndex }`.
  - Recommended workflow for unkeyed papers: Append an `Answer Key: 1-B 2-C ...` line to the original text and paste, OR update before import.
- **Do Answers Need to Exist Before Publish? YES**.
  - `setQuestionPublishStatus` evaluates `evaluateQualityGates(gateInputs)` (`db-service.ts:561`).
  - If `item.a < 0` (unanswered), `missing-answer` failure is triggered (`quality-gates.ts:78-80`), which marks `gate.passed = false` and **blocks publishing** (`db-service.ts:569`).
- **Quality Gates Breakdown** (`lib/modules/content-engine/quality-gates.ts:78-115`):
  1. `missing-answer`: `item.a < 0` (**BLOCKS PUBLISH**)
  2. `few-options`: `item.o.length < 4` (**BLOCKS PUBLISH**)
  3. `thin-explanation`: `effectiveExp.length < 80` (**BLOCKS PUBLISH**)
  4. `no-source`: `!item.src || !item.src.trim()` (**BLOCKS PUBLISH**)
  5. `uncategorized`: `!item.top || item.top === "General" || !item.sub || item.sub === "Uncategorized"` (**BLOCKS PUBLISH**)
  6. `duplicate`: Jaccard trigram similarity `sim >= 0.8` against earlier items (**BLOCKS PUBLISH**)
  7. `unverified`: `options.strict && !item.isVerified` (**BLOCKS PUBLISH** in strict mode)

---

## 6. TAXONOMY (`lib/modules/content-engine/taxonomy.ts`)

### Subjects & Topics (English + Hindi)
- **Ancient India** (प्राचीन भारत):
  - Indus Valley Civilization (सिंधु घाटी सभ्यता)
  - Vedic Age (वैदिक काल)
  - Mahajanapadas and Mauryas (महाजनपद एवं मौर्य)
  - Gupta and Post-Gupta Age (गुप्त एवं गुप्तोत्तर काल)
- **Medieval India** (मध्यकालीन भारत):
  - Delhi Sultanate (दिल्ली सल्तनत)
  - Mughal Empire (मुग़ल साम्राज्य)
  - Bhakti, Sufi and Regional Kingdoms (भक्ति, सूफ़ी एवं क्षेत्रीय राज्य)
- **Modern India** (आधुनिक भारत):
  - Revolt of 1857 (1857 का विद्रोह)
  - Socio-Religious Reforms (सामाजिक-धार्मिक सुधार)
  - Freedom Struggle (स्वतंत्रता संग्राम)
- **Polity** (राजव्यवस्था):
  - Constitution (संविधान)
  - Parliament and Executive (संसद एवं कार्यपालिका)
  - Judiciary (न्यायपालिका)
- **Geography** (भूगोल):
  - Indian Geography (भारत का भूगोल)
  - World Geography (विश्व भूगोल)
- **Economy** (अर्थव्यवस्था):
  - Banking and Finance (बैंकिंग एवं वित्त)
  - Economy Basics (अर्थव्यवस्था की मूल बातें)
- **Science** (विज्ञान):
  - Physics (भौतिक विज्ञान)
  - Chemistry (रसायन विज्ञान)
  - Biology (जीव विज्ञान)
- **Maths** (गणित):
  - Arithmetic (अंकगणित)
  - Algebra and Geometry (बीजगणित एवं ज्यामिति)
- **Reasoning** (तर्कशक्ति):
  - Verbal and Non-Verbal (शाब्दिक एवं अशाब्दिक)
- **English** (अंग्रेज़ी):
  - Grammar and Vocabulary (व्याकरण एवं शब्दावली)
- **Current Affairs** (समसामयिकी):
  - Recent Events (हाल की घटनाएँ)
- **Sociology** (समाजशास्त्र):
  - Society and Social Institutions (समाज एवं सामाजिक संस्थाएँ)
- **Education** (शिक्षा):
  - Teaching and Pedagogy (शिक्षण एवं शिक्षाशास्त्र)
- **Environment** (पर्यावरण):
  - Ecology and Biodiversity (पारिस्थितिकी एवं जैव विविधता)
- **Art & Culture** (कला एवं संस्कृति):
  - Indian Art and Culture (भारतीय कला एवं संस्कृति)
- **Computer** (कंप्यूटर):
  - Computer Awareness (कंप्यूटर जागरूकता)
- **Hindi** (हिन्दी):
  - Hindi Grammar and Literature (हिन्दी व्याकरण एवं साहित्य)

### Seeded Exam Aliases (`exam-detector.ts:6-63`)
58 seeded exam names: UPSC, UPPCS, UPRO/ARO, RAS/RTS, RAS, UKPSC, CGPSC, UPSSSC, REET, HTET, MPSC, GPSC, APPSC, TSPSC, BSSC, CSAT, BPSC, UPPSC, MPPSC, RPSC, HPSC, JPSC, OPSC, WBCS, TNPSC, KPSC, SSC, SSC CGL, SSC CHSL, SSC MTS, SSC GD, SSC CPO, SSC JE, RRB, RRB NTPC, RRB JE, RRB ALP, RRC Group D, NTPC, IBPS, IBPS PO, IBPS Clerk, IBPS RRB, SBI, SBI PO, SBI Clerk, RBI, RBI Grade B, RBI Assistant, NDA, CDS, CTET, UPTET, NEET, JEE, DSSSB.

### Edition & Paper-Set Storage
- Field names:
  - `ContentEngineQuestion.sourceTag` (`prisma/schema.prisma:1434`): **STORES RAW STRING** (e.g. `"70th BPSC 2024 Set-A"`).
  - `ContentEngineQuestion.exam`: Stores canonical normalized exam only (`"BPSC"`).
  - `ContentEngineQuestion.year`: Stores 4-digit year only (`"2024"`).
  - `ContentEngineBatch.pastedText`: Stores the raw unparsed input text.
- Dedicated columns for `edition` or `paperSet`: **LOST / NOT FOUND**. They exist only within the `sourceTag` string.

---

## 7. CATEGORY JSON (`lib/modules/content-engine/assist-io.ts`)

### "Export uncategorised as JSON" Prompt Shape (`assist-io.ts:50-65`)
```text
Classify these competitive-exam questions into Subject and Chapter/Topic.
Prefer existing Subject > Topic pairs where applicable: Geography > Indian Geography; Modern India > Freedom Struggle.
Return ONLY a JSON array in this exact shape: [{"id":"...","sub":"...","top":"...","subHi":"...","topHi":"..."}]

[
  {
    "id": "cm111111",
    "q": "Which of the following is an iron ore?",
    "o": [
      "Bauxite",
      "Cinnabar",
      "Pyrite",
      "Limonite"
    ]
  },
  {
    "id": "cm222222",
    "q": "Match the following founders and organisations.",
    "o": [
      "I-b, II-a",
      "I-a, II-b",
      "I-b, II-b",
      "More than one of the above"
    ]
  }
]
```

### "Import categories JSON" Shape (`assist-io.ts:96-115`)
```json
[
  {
    "id": "cm111111",
    "sub": "Geography",
    "top": "Minerals",
    "subHi": "भूगोल",
    "topHi": "खनिज"
  },
  {
    "id": "cm222222",
    "sub": "Modern India",
    "top": "Freedom Struggle",
    "subHi": "आधुनिक भारत",
    "topHi": "स्वतंत्रता संग्राम"
  }
]
```

---

## 8. ROUGH EDGES WITH OCR-ED PDF TEXT

1. **OCR Headers and Footers (`09/C/GO/CC/PT-2024(Q)/E 2`, `[P.T.O.`):**
   - The `HDR` regex (`parser.ts:27`) only matches specific `General Studies` patterns and only runs in `flat()`.
   - Stray header lines preceded by blank lines are treated as questions stems (`start(l, 0)`). If length > 25, they become `Note` items (`parser.ts:308`).
   - `[P.T.O.` is NOT stripped by `detectBracketTag` because `detectBracketTag` requires a 4-digit year (`19xx` or `20xx`). It will remain glued to question or option text.
2. **Sub-statement Numbering (`a.` / `b.` and `1.` / `2.`):**
   - Statement lines starting with `a.` or `b.` match `OPT` (`parser.ts:426`). Since `cur.o.length === 0`, `idx === 0` matches, misclassifying statements as options A and B!
   - Statement lines starting with `1.` or `2.` can trigger the question number regex (`parser.ts:439`), splitting a single question into multiple questions.
3. **Decimal Numbers & Math Operators:**
   - A line starting with `1.5` or `2.0` (e.g. `1.5 kg of substance`) triggers question numbering `^(\d{1,3})\s*[.)]\s+` (`parser.ts:439`), falsely starting Question 1.
   - Expressions starting with `(a)` or `(1)` in math formulas are captured as options.
4. **False Positive Keyword Hits in `classifier.ts`:**
   - The classifier uses simple substring inclusion (`normText.includes(kw)` in `classifier.ts:72`).
   - Generic terms like "cell", "force", "bank", "tax", "current" in reading passages trigger wrong subjects (e.g., Biology, Physics, Economy).
5. **Diagram / Figure Questions:**
   - Questions referencing figures ("Refer to the diagram...") will lose their figures (raw text only) and will fail quality gate `thin-explanation` or end up `Uncategorized`.

---

## VERIFICATION SUMMARY
- **Section 1 (Status)**: DONE (`git log`, `INVENTORY.md`, `DECISIONS.md`, routes)
- **Section 2 (Paste Format)**: DONE (`lib/modules/content-engine/parser.ts:27-494`)
- **Section 3 (Parser Proof)**: DONE (PASS on both pure parser runs)
- **Section 4 (Hindi Format)**: DONE (`lib/modules/content-engine/assist-io.ts:71-180`, `db-service.ts:426-470`)
- **Section 5 (Answers)**: DONE (Bulk answers by batch+sourceNo: NOT FOUND; Quality Gates evaluated)
- **Section 6 (Taxonomy)**: DONE (`lib/modules/content-engine/taxonomy.ts:25-175`, `exam-detector.ts:6-63`)
- **Section 7 (Category JSON)**: DONE (`lib/modules/content-engine/assist-io.ts:50-115`)
- **Section 8 (Rough Edges)**: DONE (Edge cases verified from source regexes)
