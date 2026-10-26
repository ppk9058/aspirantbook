import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateExamScore,
  pureResolveAccess,
  formatDuration,
  formatScore,
  LoginRequestSchema,
  RegisterRequestSchema,
  SubmitAnswersRequestSchema,
} from "../src/index";

describe("Shared Package: Exam Grading", () => {
  const questions = [
    { id: "q1", correctOption: "A", positiveMarks: 4, negativeMarks: 1 },
    { id: "q2", correctOption: "B", positiveMarks: 4, negativeMarks: 1 },
    { id: "q3", correctOption: "C", positiveMarks: 4, negativeMarks: 1 },
    { id: "q4", correctOption: "D", positiveMarks: 4, negativeMarks: 1 },
  ];

  it("calculates perfect score when all answers are correct", () => {
    const answers = [
      { questionId: "q1", selectedOption: "A" },
      { questionId: "q2", selectedOption: "B" },
      { questionId: "q3", selectedOption: "C" },
      { questionId: "q4", selectedOption: "D" },
    ];
    const res = calculateExamScore(questions, answers);
    assert.equal(res.totalScore, 16);
    assert.equal(res.correctCount, 4);
    assert.equal(res.wrongCount, 0);
    assert.equal(res.skippedCount, 0);
  });

  it("applies negative marking accurately for wrong answers", () => {
    const answers = [
      { questionId: "q1", selectedOption: "A" }, // +4
      { questionId: "q2", selectedOption: "C" }, // -1
      { questionId: "q3", selectedOption: null }, // skipped
      // q4 not attempted
    ];
    const res = calculateExamScore(questions, answers);
    assert.equal(res.totalScore, 3);
    assert.equal(res.correctCount, 1);
    assert.equal(res.wrongCount, 1);
    assert.equal(res.skippedCount, 2);
  });

  it("tracks marked for review without skewing score", () => {
    const answers = [
      { questionId: "q1", selectedOption: "A", isMarked: true },
      { questionId: "q2", selectedOption: "B", isMarked: true },
    ];
    const res = calculateExamScore(questions, answers);
    assert.equal(res.markedCount, 2);
    assert.equal(res.totalScore, 8);
    assert.equal(res.skippedCount, 2);
  });
});

describe("Shared Package: Authwall Access & Slicing", () => {
  const sampleBlocks = [
    { id: "b1", text: "Introduction" },
    { id: "b2", text: "Concept 1", correctOption: "LEAK", solution: "SECRET" },
    { id: "b3", text: "Concept 2" },
    { id: "b4", text: "Concept 3" },
    { id: "b5", text: "Concept 4" },
    { id: "b6", text: "Concept 5" },
    { id: "b7", text: "Concept 6" },
    { id: "b8", text: "Concept 7" },
    { id: "b9", text: "Concept 8" },
    { id: "b10", text: "Conclusion" },
  ];

  it("slices 20% preview for guest on gated container", () => {
    const res = pureResolveAccess({
      viewer: { userId: null },
      blocks: sampleBlocks,
      containerGate: { isGated: true, previewPercentage: 20 },
    });
    assert.equal(res.isLockedForGuest, true);
    assert.equal(res.totalItemsCount, 10);
    assert.equal(res.previewCount, 2);
    assert.equal(res.previewBlocks.length, 2);
    // Verifies answer sanitization
    assert.equal(res.previewBlocks[1].correctOption, undefined);
    assert.equal(res.previewBlocks[1].solution, undefined);
  });

  it("slices 50% preview correctly", () => {
    const res = pureResolveAccess({
      viewer: { userId: null },
      blocks: sampleBlocks,
      containerGate: { isGated: true, previewPercentage: 50 },
    });
    assert.equal(res.isLockedForGuest, true);
    assert.equal(res.previewCount, 5);
    assert.equal(res.previewBlocks.length, 5);
  });

  it("handles 0% / locked gate mode (zero blocks to guest)", () => {
    const res = pureResolveAccess({
      viewer: { userId: null },
      blocks: sampleBlocks,
      containerGate: { isGated: true },
      itemGate: { gateMode: "locked" },
    });
    assert.equal(res.isLockedForGuest, true);
    assert.equal(res.previewCount, 0);
    assert.equal(res.previewBlocks.length, 0);
  });

  it("slices 100% when gateMode is free or user is logged in", () => {
    const guestFree = pureResolveAccess({
      viewer: { userId: null },
      blocks: sampleBlocks,
      containerGate: { isGated: true },
      itemGate: { gateMode: "free" },
    });
    assert.equal(guestFree.isLockedForGuest, false);
    assert.equal(guestFree.previewCount, 10);

    const loggedIn = pureResolveAccess({
      viewer: { userId: "user-123" },
      blocks: sampleBlocks,
      containerGate: { isGated: true, previewPercentage: 20 },
    });
    assert.equal(loggedIn.isLockedForGuest, false);
    assert.equal(loggedIn.previewCount, 10);
  });

  it("guarantees at least one block when previewPercentage > 0 on small block counts", () => {
    const oneBlock = [{ id: "single", text: "Solo block" }];
    const res = pureResolveAccess({
      viewer: { userId: null },
      blocks: oneBlock,
      containerGate: { isGated: true, previewPercentage: 10 },
    });
    assert.equal(res.isLockedForGuest, true);
    assert.equal(res.previewCount, 1);
    assert.equal(res.previewBlocks.length, 1);
  });
});

describe("Shared Package: DTO Validation", () => {
  it("validates login request with email normalisation", () => {
    const parsed = LoginRequestSchema.safeParse({
      email: "  Test@Example.COM  ",
      password: "SecretPassword123!",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.email, "test@example.com");
      assert.equal(parsed.data.platform, "android");
    }
  });

  it("rejects register request if consent is false or missing", () => {
    const parsed = RegisterRequestSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "Password123!",
      consent: false,
    });
    assert.equal(parsed.success, false);
  });

  it("validates sequence-numbered answer syncing", () => {
    const parsed = SubmitAnswersRequestSchema.safeParse({
      answers: [
        { questionId: "q1", selectedOption: "A", sequenceNumber: 1, timeSpentSecs: 15 },
        { questionId: "q2", selectedOption: "B", sequenceNumber: 2, isMarked: true },
      ],
      lastSequenceNumber: 2,
    });
    assert.equal(parsed.success, true);
  });
});

describe("Shared Package: Formatters", () => {
  it("formats seconds into duration strings", () => {
    assert.equal(formatDuration(45), "00:45");
    assert.equal(formatDuration(125), "02:05");
    assert.equal(formatDuration(3665), "01:01:05");
  });

  it("formats scores cleanly", () => {
    assert.equal(formatScore(15), "15");
    assert.equal(formatScore(15.25), "15.25");
    assert.equal(formatScore(15.3333), "15.33");
  });
});
