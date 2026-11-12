import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pluralize, formatCount } from "../src/lib/formatters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_DIR = path.resolve(__dirname, "../src/app");

function readAppFile(relPath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relPath), "utf8");
}

describe("Mobile Formatters Unit Tests", () => {
  describe("pluralize", () => {
    it("handles 0 counts with default plural", () => {
      assert.equal(pluralize(0, "test"), "0 tests");
      assert.equal(pluralize(0, "course"), "0 courses");
    })

    it("handles 0 counts with custom plural", () => {
      assert.equal(pluralize(0, "quiz", "quizzes"), "0 quizzes");
    });

    it("handles 1 count without plural suffix", () => {
      assert.equal(pluralize(1, "test"), "1 test");
      assert.equal(pluralize(1, "course"), "1 course");
      assert.equal(pluralize(1, "quiz", "quizzes"), "1 quiz");
    });

    it("handles 2 counts with default and custom plural", () => {
      assert.equal(pluralize(2, "test"), "2 tests");
      assert.equal(pluralize(2, "course"), "2 courses");
      assert.equal(pluralize(2, "quiz", "quizzes"), "2 quizzes");
    });

    it("renders singular and plural chapter counts (tutorial detail bug)", () => {
      assert.equal(pluralize(1, "Chapter"), "1 Chapter");
      assert.equal(pluralize(2, "Chapter"), "2 Chapters");
      assert.equal(pluralize(0, "Chapter"), "0 Chapters");
    });
  });

  describe("tutorial detail source uses the shared pluralize helper", () => {
    it("no longer hard-codes '{chapters.length} Chapters' and calls pluralize instead", () => {
      const source = readAppFile("tutorials/[slug]/index.tsx");

      assert.doesNotMatch(source, /chapters\.length\}\s*Chapters/);
      assert.match(source, /\{pluralize\(chapters\.length, "Chapter"\)\}/);
      assert.match(source, /import \{ pluralize \} from '\.\.\/\.\.\/\.\.\/lib\/formatters'/);
    });

    it("has no remaining hard-coded plural counts in app sources", () => {
      const offenders: string[] = [];
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (/\.tsx?$/.test(entry.name)) {
            const source = fs.readFileSync(full, "utf8");
            const hardCoded =
              /\{[^}]*\.(length|Count|count|totalQuestions|totalMarks|durationMinutes)[^}]*\}\s+(Chapters|Lessons|Courses|Questions|Marks|Tests|Days|Papers|Quizzes|Videos|Notes|Attempts|Results|Points|Items|Topics|Modules|mins)\b/;
            if (hardCoded.test(source)) {
              offenders.push(path.relative(APP_DIR, full));
            }
          }
        }
      };
      walk(APP_DIR);

      assert.deepEqual(offenders, [], `hard-coded plural counts remain in: ${offenders.join(", ")}`);
    });
  });

  describe("formatCount", () => {
    it("handles 0 counts as number and string", () => {
      assert.equal(formatCount(0, "test"), "0 tests");
      assert.equal(formatCount("0", "test"), "0 tests");
      assert.equal(formatCount("0", "quiz", "quizzes"), "0 quizzes");
    });

    it("handles 1 count as number and string without plural suffix", () => {
      assert.equal(formatCount(1, "test"), "1 test");
      assert.equal(formatCount("1", "test"), "1 test");
      assert.equal(formatCount(1, "Total Test"), "1 Total Test");
      assert.equal(formatCount("1", "Free Test"), "1 Free Test");
    });

    it("handles 2 counts as number and string with plural suffix", () => {
      assert.equal(formatCount(2, "test"), "2 tests");
      assert.equal(formatCount("2", "test"), "2 tests");
      assert.equal(formatCount("2", "quiz", "quizzes"), "2 quizzes");
    });
  });
});
