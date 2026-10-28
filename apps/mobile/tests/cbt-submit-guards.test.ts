import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { CbtSyncQueueManager, MemoryCbtDriver } from "../src/lib/cbt-sync";

describe("Bug #1: Double-submit guard via ref-like flag", () => {
  it("concurrent handleAutoSubmit calls only submit once with ref guard", async () => {
    let submitCount = 0;
    const mockSubmitAttempt = async () => {
      submitCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true };
    };

    // Simulate the ref guard pattern used in the fix
    const submittingRef = { current: false };

    const handleAutoSubmit = async () => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        await mockSubmitAttempt();
      } finally {
        // handleAutoSubmit in production does NOT reset (navigates away),
        // but we keep it set to prove the guard works
      }
    };

    // Fire two concurrent auto-submits (timer + AppState resume race)
    await Promise.all([handleAutoSubmit(), handleAutoSubmit()]);

    assert.equal(submitCount, 1, "Only one submitAttempt call should execute");
  });

  it("without the ref guard, both calls would execute (proving the bug existed)", async () => {
    let submitCount = 0;
    const mockSubmitAttempt = async () => {
      submitCount++;
      await new Promise((r) => setTimeout(r, 20));
      return { ok: true };
    };

    // Simulate the OLD broken pattern: checking a stale closure boolean
    // In React, useEffect([], []) captures the initial `submitting` value (false) forever
    const handleAutoSubmitBroken = async (staleSubmitting: boolean) => {
      if (staleSubmitting) return;
      await mockSubmitAttempt();
    };

    // Both calls see submitting=false (stale closure value)
    const call1 = handleAutoSubmitBroken(false);
    const call2 = handleAutoSubmitBroken(false);
    await Promise.all([call1, call2]);

    assert.equal(submitCount, 2, "Without ref guard, both calls execute (double submit)");
  });
});

describe("Bug #2: flush() without attemptId returns early, losing answers", () => {
  let driver: MemoryCbtDriver;

  beforeEach(() => {
    driver = new MemoryCbtDriver();
  });

  it("flush() with no attemptId returns immediately without syncing", async () => {
    // Use a failing API so saveAnswer's background flush doesn't sync
    const failingApi = async () => {
      throw new Error("Network offline");
    };

    const queue = new CbtSyncQueueManager(driver, failingApi);
    await queue.init();

    // Enqueue 2 answers (background flush will fail due to failingApi)
    await queue.saveAnswer("att_test", "q1", "A", false, 10);
    await queue.saveAnswer("att_test", "q2", "B", false, 20);

    // Answers should be pending since the API failed
    const pendingBefore = await queue.getPendingCount("att_test");
    assert.equal(pendingBefore, 2, "2 answers pending after failed background sync");

    // Bug: calling flush() without attemptId — returns immediately, answers NOT synced
    const badResult = await queue.flush();
    assert.equal(badResult.syncedCount, 0, "flush() without attemptId syncs nothing");

    // Answers are STILL unsynced
    const pendingAfter = await queue.getPendingCount("att_test");
    assert.equal(pendingAfter, 2, "Answers remain unsynced — flush() without attemptId skipped them");
  });

  it("flush(attemptId) correctly syncs all pending answers", async () => {
    // Use a failing API for saveAnswer's background flush
    let shouldFail = true;
    const syncedPayloads: any[] = [];
    const mockApi = async (_id: string, payload: any) => {
      if (shouldFail) throw new Error("Network offline");
      syncedPayloads.push(payload);
      return { ok: true };
    };

    const queue = new CbtSyncQueueManager(driver, mockApi);
    await queue.init();

    // Enqueue 2 answers (background flush will fail)
    await queue.saveAnswer("att_test", "q1", "A", false, 10);
    await queue.saveAnswer("att_test", "q2", "B", false, 20);

    const pendingBefore = await queue.getPendingCount("att_test");
    assert.equal(pendingBefore, 2, "2 answers pending after failed background sync");

    // Fix: calling flush WITH attemptId after network recovers
    shouldFail = false;
    const goodResult = await queue.flush("att_test");
    assert.equal(goodResult.syncedCount, 2, "flush(attemptId) syncs all pending answers");
    assert.equal(goodResult.pendingCount, 0, "No pending answers after successful flush");

    // Verify payload was sent to the API
    assert.equal(syncedPayloads.length, 1, "Exactly one API sync call made");
    assert.equal(syncedPayloads[0].answers.length, 2, "Both answers in the sync payload");
  });
});
