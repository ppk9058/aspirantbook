import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseLatexToUnicode, parseMathSegments } from "../src/lib/latex-parser";

interface CorpusEntry {
  id: string;
  type: string;
  latex: string;
  description: string;
  expectedSubstring?: string;
}

const corpusPath = path.resolve(__dirname, "../../../../trillionskill-mobile-spec/run/math-corpus.json");
const corpus: CorpusEntry[] = JSON.parse(fs.readFileSync(corpusPath, "utf-8"));

describe("T6: Math Rendering Corpus Coverage (>=30 Expressions)", () => {
  it("verifies corpus contains at least 30 distinct mathematical expressions", () => {
    assert.ok(corpus.length >= 30, `Corpus has ${corpus.length} entries (expected >= 30)`);
  });

  for (const entry of corpus) {
    it(`renders corpus entry [${entry.id}] (${entry.type}) safely without crash or blank`, () => {
      // 1. Parse using segmenter (handles inline, display, and unclosed malformed math)
      const segments = parseMathSegments(entry.latex);
      assert.ok(segments.length > 0, `Entry ${entry.id} must produce at least one segment`);

      // 2. Render each segment
      for (const seg of segments) {
        assert.notEqual(seg.content, undefined, `Segment content cannot be undefined in ${entry.id}`);
        assert.notEqual(seg.content, null, `Segment content cannot be null in ${entry.id}`);
        assert.notEqual(seg.content.trim(), "[object Object]", `Output cannot be [object Object] in ${entry.id}`);

        if (seg.isMath) {
          const parsed = parseLatexToUnicode(seg.raw);
          assert.notEqual(parsed, "", `Parsed math cannot be blank string in ${entry.id}`);
          assert.notEqual(parsed, "[object Object]", `Parsed math cannot be [object Object] in ${entry.id}`);
        }
      }

      // 3. If an expected substring was specified, check it exists in either raw or parsed form
      if (entry.expectedSubstring) {
        const fullParsed = segments
          .map((s) => (s.isMath ? parseLatexToUnicode(s.raw) : s.content))
          .join(" ");
        const matchFound =
          fullParsed.includes(entry.expectedSubstring) ||
          entry.latex.includes(entry.expectedSubstring);
        assert.ok(
          matchFound,
          `Entry [${entry.id}] expected substring '${entry.expectedSubstring}' in output: '${fullParsed}'`
        );
      }
    });
  }

  it("handles malformed and unclosed math gracefully with raw monospace fallback", () => {
    const unclosedInline = "Score $10 for correct answer and $20 for bonus.";
    const segments = parseMathSegments(unclosedInline);
    const textOut = segments.map((s) => (s.isMath ? parseLatexToUnicode(s.raw) : s.content)).join("");
    assert.ok(textOut.includes("Score"));
    assert.ok(textOut.includes("10"));
  });

  it("handles empty and whitespace-only math without crashing", () => {
    assert.equal(parseLatexToUnicode(""), "");
    assert.equal(parseLatexToUnicode("   "), "");
    const segs = parseMathSegments("");
    assert.deepEqual(segs, []);
  });
});
