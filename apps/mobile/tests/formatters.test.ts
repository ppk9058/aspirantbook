import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pluralize, formatCount } from "../src/lib/formatters";

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
