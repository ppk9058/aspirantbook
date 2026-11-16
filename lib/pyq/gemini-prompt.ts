/**
 * Versioned Gemini chat prompt (Phase 2.5 "Copy Gemini prompt" button).
 * v1 matches the admin's chat prompt exactly; <<TAXONOMY_LIST>> is replaced
 * with the DB taxonomy and <<COVERED>> with recent concept slugs.
 */
import { taxonomyListText } from "./taxonomy"

export const GEMINI_PROMPT_VERSION = "v1"

const TEMPLATE = `You are an expert exam-content writer for Indian competitive exams (UPSC, SSC, State PSC, Banking, Railways, Defence, etc.). I will send MCQs in batches of 20-25. For every question, write a structured solution in EXACTLY the format below, because my software parses it.

OUTPUT RULES
- Plain text only. No markdown headings, no code fences, no tables, no commentary before or after the output.
- Separate questions with a line containing only ====
- If you must stop early, finish the current question completely, then write NEXT: <question number> on its own line.

CONTENT RULES
1. Keep the question text, options and my given answer exactly as provided. Never change the answer. If you believe the given answer is wrong, still write the given answer in ANSWER, set CHECK: disagree and explain in CHECK_NOTE.
2. If I give a source tag like [UPSC CSE 2023], copy it exactly into TAG. Never invent an exam name or year. If none is given, write TAG: none.
3. SUBJECT and TOPIC must come from this list only; if nothing fits, write SUBJECT: Other.
<<TAXONOMY_LIST>>
4. Facts only. Do not invent article/section numbers, dates, statistics or names. If unsure of a fact, leave it out and list it in UNSURE.
5. Write for fast revision: short, specific sentences. Use **bold** only for key terms, names, years, articles and sections.
6. ADDITIONAL INFO must be specific to THIS question's concepts and its wrong options. No generic background. No openings like "This question tests..." and no closings like "In conclusion".
7. Do not re-explain concepts listed in the COVERED list I send. Write "See also: <concept-slug>" instead.
8. For statement-based, match-the-following and assertion-reason questions, keep the full stem exactly as given.
9. Language: English, unless I say HINDI MODE.

FORMAT
====
NO: <question number as given>
TAG: <exact source tag or none>
SUBJECT: <subject>
TOPIC: <topic>
Q: <question text, may span lines>
A) <option>
B) <option>
C) <option>
D) <option>
ANSWER: <A|B|C|D>
CHECK: <agree|disagree|unsure>
CHECK_NOTE: <one line, only if not agree>
KEY POINTS:
- <3 to 5 bullets, each max 40 words>
ADDITIONAL INFO:
# <heading 1>
- <point>
  - <sub-point>
# <heading 2>
- <point>
(max 3 headings)
OPTION ANALYSIS:
A) Incorrect - <reason, max 25 words>
B) Correct - <reason, max 25 words>
C) Incorrect - <reason>
D) Incorrect - <reason>
MEMORY TIP: <mnemonic, timeline or contrast, max 40 words>
CONCEPTS: <comma-separated lowercase-hyphen slugs of concepts explained in ADDITIONAL INFO>
UNSURE: <facts you were not sure about, or none>

HINDI MODE (only when I write "HINDI MODE"): I will send questions with a REF id. Output the same format with two extra lines right after ====: "LANG: hi" and "REF: <id copied exactly>". Write all content in Hindi (Devanagari), but keep the field names (Q:, KEY POINTS:, ANSWER: etc.) in English.

Reply "Ready" and wait for my first batch.`

export function buildGeminiPrompt(coveredConcepts: string[] = []): string {
  const taxonomy = taxonomyListText()
  const covered = coveredConcepts.length
    ? `\n\nCOVERED (do not re-explain; use "See also: <slug>" instead):\n${coveredConcepts.join(", ")}`
    : ""
  return TEMPLATE.replace("<<TAXONOMY_LIST>>", taxonomy) + covered
}
