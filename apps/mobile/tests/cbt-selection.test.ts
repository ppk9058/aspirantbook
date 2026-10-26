import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectQuestionAtIndex } from "../src/lib/cbt-selection";

interface Question {
  id: string;
  sectionId: string;
}

describe("Bug #4: runner must never answer a question from another section", () => {
  const allQuestions: Question[] = [
    { id: "q-sec-1", sectionId: "sec-1" },
    { id: "q-sec-2", sectionId: "sec-2" },
  ];
  const section2Questions = allQuestions.filter((q) => q.sectionId === "sec-2");

  it("returns undefined for an out-of-range index instead of falling back to the unfiltered list", () => {
    // The old `visibleQuestions[currentIndex] || questions[0]` returned
    // `q-sec-1` here — a question from a different section.
    assert.equal(selectQuestionAtIndex(section2Questions, 1), undefined);
    assert.equal(selectQuestionAtIndex(section2Questions, 99), undefined);
    assert.equal(selectQuestionAtIndex([], 0), undefined);
  });

  it("returns the active section's question for a valid index", () => {
    assert.equal(selectQuestionAtIndex(section2Questions, 0)?.id, "q-sec-2");
  });

  it("handles missing or invalid indexes defensively", () => {
    assert.equal(selectQuestionAtIndex(null, 0), undefined);
    assert.equal(selectQuestionAtIndex(undefined, 0), undefined);
    assert.equal(selectQuestionAtIndex(allQuestions, -1), undefined);
    assert.equal(selectQuestionAtIndex(allQuestions, 1.5), undefined);
  });
});
