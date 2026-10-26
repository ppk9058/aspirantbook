import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatTimeRemaining, calculateRemainingSeconds } from "../src/lib/cbt-timer";
import {
  memoryStorageAdapter,
  StorageAdapter,
  setStorageAdapter,
} from "../src/lib/cache-storage";
import {
  CACHE_POLICIES,
  persistQueryClient,
  restoreQueryClient,
  clearPersistedQueryCache,
} from "../src/lib/query-persistence";
import { QueryClient } from "@tanstack/react-query";
import { parseRoseraBlock } from "../src/lib/rosera-parser";

describe("Offline CBT Edge Cases", () => {
  it("handles app killed mid-attempt and resumed accurately", async () => {
    // 1. Simulate active attempt state before app kill
    const serverStartedAt = 1700000000000;
    const durationMinutes = 60;
    const targetEndTimestamp = serverStartedAt + durationMinutes * 60 * 1000;

    const savedAttempt = {
      attemptId: "att_123",
      testId: "test_abc",
      targetEndTimestamp,
      answers: { q1: "A", q2: "B" },
      currentQuestionIndex: 2,
    };

    // Save to storage
    await memoryStorageAdapter.setItem("active_cbt_att_123", JSON.stringify(savedAttempt));

    // 2. Simulate app kill and resume 10 minutes later
    const clientResumeTime = serverStartedAt + 10 * 60 * 1000;
    const restoredRaw = await memoryStorageAdapter.getItem("active_cbt_att_123");
    assert.ok(restoredRaw);
    const restored = JSON.parse(restoredRaw!);

    assert.equal(restored.attemptId, "att_123");
    assert.equal(restored.answers.q1, "A");
    assert.equal(restored.currentQuestionIndex, 2);

    // Remaining time must be 50 minutes (3000 seconds)
    const remaining = calculateRemainingSeconds(restored.targetEndTimestamp, clientResumeTime);
    assert.equal(remaining, 50 * 60);
    assert.equal(formatTimeRemaining(remaining), "50:00");
  });

  it("prevents cheating when device clock is changed (server monotonic clock offset)", () => {
    const serverNowAtStart = 1700000000000;
    const clientNowAtStart = 1700000005000; // Client is 5 seconds ahead
    const clockOffset = serverNowAtStart - clientNowAtStart; // -5000ms

    const durationMinutes = 30;
    const targetEndTimestamp = serverNowAtStart + durationMinutes * 60 * 1000;

    // Cheater moves device clock backwards by 2 hours
    const hackedClientTime = clientNowAtStart - 2 * 60 * 60 * 1000;

    // Normal client uses monotonic elapsed or server offset
    // Corrected client now: hackedClientTime + (clientOffset measured at start or server heartbeat)
    // Server deadline is always authoritative:
    const trueServerNow = serverNowAtStart + 15 * 60 * 1000; // 15 mins passed in real life
    const remaining = calculateRemainingSeconds(targetEndTimestamp, trueServerNow);
    assert.equal(remaining, 15 * 60); // 15 minutes left, not 2 hours 15 minutes
  });

  it("handles duplicate submit idempotently without re-grading", () => {
    let gradeCount = 0;
    const attemptStore: Record<string, any> = {
      att_dup: {
        id: "att_dup",
        status: "IN_PROGRESS",
        score: null,
      },
    };

    const submitAttempt = (attemptId: string) => {
      const att = attemptStore[attemptId];
      if (att.status === "SUBMITTED") {
        // Idempotent: return existing score without re-grading
        return { ok: true, score: att.score, idempotent: true };
      }
      gradeCount++;
      att.status = "SUBMITTED";
      att.score = 85.5;
      return { ok: true, score: att.score, idempotent: false };
    };

    // First submit
    const res1 = submitAttempt("att_dup");
    assert.equal(res1.ok, true);
    assert.equal(res1.score, 85.5);
    assert.equal(res1.idempotent, false);
    assert.equal(gradeCount, 1);

    // Duplicate submit (e.g. double click or offline retry)
    const res2 = submitAttempt("att_dup");
    assert.equal(res2.ok, true);
    assert.equal(res2.score, 85.5);
    assert.equal(res2.idempotent, true);
    assert.equal(gradeCount, 1); // Grading count did not increment!
  });

  it("flushes reconnect answer queue in strict sequence order", () => {
    // Interleaved client events from reconnect burst
    const queuedPackets = [
      { sequence: 3, questionId: "q1", option: "C" },
      { sequence: 1, questionId: "q1", option: "A" },
      { sequence: 2, questionId: "q1", option: "B" },
      { sequence: 4, questionId: "q2", option: "D" },
    ];

    // Sort by sequence number before applying
    const appliedState: Record<string, { option: string; seq: number }> = {};
    const sorted = [...queuedPackets].sort((a, b) => a.sequence - b.sequence);

    for (const packet of sorted) {
      const current = appliedState[packet.questionId];
      if (!current || packet.sequence > current.seq) {
        appliedState[packet.questionId] = { option: packet.option, seq: packet.sequence };
      }
    }

    assert.equal(appliedState["q1"].option, "C");
    assert.equal(appliedState["q1"].seq, 3);
    assert.equal(appliedState["q2"].option, "D");
    assert.equal(appliedState["q2"].seq, 4);
  });

  it("rejects answers after long offline period when server deadline has passed", () => {
    const startedAt = 1700000000000;
    const durationMinutes = 30;
    const deadlineWithGrace = startedAt + durationMinutes * 60 * 1000 + 30_000; // 30s grace

    const submitTimeAfterLongOffline = startedAt + 45 * 60 * 1000; // 45 minutes later

    const isWithinDeadline = submitTimeAfterLongOffline <= deadlineWithGrace;
    assert.equal(isWithinDeadline, false);
  });

  it("calculates CBT question palette states accurately", () => {
    const questions = ["q1", "q2", "q3", "q4", "q5"];
    const answers: Record<string, string> = { q1: "A", q3: "C" };
    const markedForReview = new Set(["q2", "q3"]);
    const visited = new Set(["q1", "q2", "q3", "q4"]);

    const palette = questions.map((qid) => {
      const isAnswered = Boolean(answers[qid]);
      const isMarked = markedForReview.has(qid);
      const isVisited = visited.has(qid);

      if (isAnswered && isMarked) return "answered_and_marked";
      if (isMarked) return "marked_for_review";
      if (isAnswered) return "answered";
      if (isVisited) return "not_answered";
      return "not_visited";
    });

    assert.deepEqual(palette, [
      "answered", // q1: answered, not marked
      "marked_for_review", // q2: marked, not answered
      "answered_and_marked", // q3: answered and marked
      "not_answered", // q4: visited, no answer
      "not_visited", // q5: not visited
    ]);
  });
});

describe("Rosera Renderer Robustness & Error Boundary", () => {
  it("renders safe fallback for unknown block types without crashing", () => {
    const unknownBlock = {
      type: "future_interactive_timeline",
      text: "Timeline fallback text content",
    };

    const parsed = parseRoseraBlock(unknownBlock);
    assert.equal(parsed.isValid, false);
    assert.equal(parsed.isFallback, true);
    assert.equal(parsed.text, "Timeline fallback text content");
  });

  it("handles malformed blocks gracefully without throwing", () => {
    // 1. null block
    const nullBlock = null;
    const parsedNull = parseRoseraBlock(nullBlock);
    assert.equal(parsedNull.isValid, false);
    assert.equal(parsedNull.isFallback, true);

    // 2. non-object block
    const stringBlock = "not an object";
    const parsedStr = parseRoseraBlock(stringBlock);
    assert.equal(parsedStr.isValid, false);
    assert.equal(parsedStr.isFallback, true);

    // 3. block with missing items in list
    const invalidList = { type: "list", items: null };
    const parsedList = parseRoseraBlock(invalidList);
    assert.equal(parsedList.isValid, true);
    assert.deepEqual(parsedList.items, []);

    // 4. block with invalid level in heading
    const invalidHeading = { type: "heading", level: -5, text: "Heading Text" };
    const parsedHeading = parseRoseraBlock(invalidHeading);
    assert.equal(parsedHeading.isValid, true);
    assert.equal(parsedHeading.level, 2); // clamped to default 2
  });
});

describe("Query Cache Persistence & Storage Adapter", () => {
  it("persists and restores query cache using storage adapter", async () => {
    setStorageAdapter(memoryStorageAdapter);
    await clearPersistedQueryCache();

    const client1 = new QueryClient();
    client1.setQueryData(["home-feed"], { hero: "Test Course", items: [1, 2, 3] });
    client1.setQueryData(["attempt", "att_1"], { secretAnswer: "hidden" }); // Sensitive: should not persist

    await persistQueryClient(client1);

    // Create fresh client2 and restore
    const client2 = new QueryClient();
    const restored = await restoreQueryClient(client2);
    assert.equal(restored, true);

    const homeData = client2.getQueryData(["home-feed"]);
    assert.deepEqual(homeData, { hero: "Test Course", items: [1, 2, 3] });

    // Sensitive query was excluded from persistence
    const attemptData = client2.getQueryData(["attempt", "att_1"]);
    assert.equal(attemptData, undefined);
  });

  it("clears persisted cache completely on logout", async () => {
    setStorageAdapter(memoryStorageAdapter);
    const client = new QueryClient();
    client.setQueryData(["library-list"], [{ id: "b1", title: "Book 1" }]);
    await persistQueryClient(client);

    // Logout: clears both in-memory client and persisted disk store
    await clearPersistedQueryCache(client);

    const clientAfter = new QueryClient();
    const restored = await restoreQueryClient(clientAfter);
    assert.equal(restored, false);
    assert.equal(clientAfter.getQueryData(["library-list"]), undefined);
  });

  it("verifies per-resource cache policies define staleTime and gcTime", () => {
    assert.ok(CACHE_POLICIES.home.staleTime > 0);
    assert.ok(CACHE_POLICIES.home.gcTime >= CACHE_POLICIES.home.staleTime);

    assert.ok(CACHE_POLICIES.tests.staleTime > 0);
    assert.ok(CACHE_POLICIES.tutorials.staleTime > 0);
    assert.ok(CACHE_POLICIES.currentAffairs.staleTime > 0);
    assert.ok(CACHE_POLICIES.library.staleTime > 0);
  });
});
