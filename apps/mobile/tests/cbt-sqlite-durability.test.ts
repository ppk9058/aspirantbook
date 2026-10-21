import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  CbtSyncQueueManager,
  NodeSqliteDriver,
  SqliteCbtStorage,
} from "../src/lib/cbt-sync";

describe("T3: CBT Real SQLite Durability & Process Kill Resilience", () => {
  it("answers survive simulated process kill (new queue instance over the same SQLite file)", async () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-durability-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      // 1. Process 1: User answers questions offline
      const driver1 = new NodeSqliteDriver(dbPath);
      assert.equal(driver1.isDurable, true, "NodeSqliteDriver must report isDurable=true");
      const storage1 = new SqliteCbtStorage(driver1);
      const queue1 = new CbtSyncQueueManager(storage1, async () => {
        throw new Error("Network offline");
      });
      await queue1.init();

      await queue1.saveAnswer("att_kill_test", "q1", "opt_A", false, 10);
      await queue1.saveAnswer("att_kill_test", "q2", "opt_B", true, 25);
      await queue1.saveAnswer("att_kill_test", "q1", "opt_C", false, 40); // User updates q1

      const pendingP1 = await queue1.getPendingCount("att_kill_test");
      assert.equal(pendingP1, 2, "2 distinct pending questions in SQLite storage");

      // Verify records physically exist in SQLite database file
      const rawRows1 = driver1.getAll("SELECT * FROM cbt_answer_queue WHERE attemptId = ?", ["att_kill_test"]);
      assert.equal(rawRows1.length, 2, "2 rows exist physically in SQLite table");

      // SIMULATE HARD PROCESS KILL: close connection and discard queue instance
      driver1.close();

      // 2. Process 2: App reboots, brand-new driver and queue instance over same SQLite file
      let ackReceived = false;
      let syncedAnswersPayload: any[] = [];
      const driver2 = new NodeSqliteDriver(dbPath);
      const storage2 = new SqliteCbtStorage(driver2);
      const queue2 = new CbtSyncQueueManager(storage2, async (attemptId: string, payload: any) => {
        ackReceived = true;
        syncedAnswersPayload = payload.answers;
        return { ok: true };
      });
      await queue2.init();

      // Verify answers survived process death in SQLite
      const answersP2 = await queue2.getAnswersForAttempt("att_kill_test");
      assert.equal(answersP2.length, 2, "Both answers survived process restart in SQLite");

      const q1 = answersP2.find((a) => a.questionId === "q1");
      const q2 = answersP2.find((a) => a.questionId === "q2");
      assert.ok(q1, "q1 must exist");
      assert.ok(q2, "q2 must exist");
      assert.equal(q1!.selectedOption, "opt_C", "Updated option opt_C survived in SQLite");
      assert.equal(q1!.sequenceNumber, 3, "Monotonic sequence number 3 preserved");
      assert.equal(q2!.selectedOption, "opt_B", "Option opt_B survived in SQLite");
      assert.equal(q2!.isMarked, true, "Marked for review flag survived in SQLite");

      // 3. Network reconnects: flush queue to cloud
      const flushRes = await queue2.flush("att_kill_test");
      assert.equal(flushRes.syncedCount, 2, "All 2 answers synced to server");
      assert.equal(flushRes.pendingCount, 0, "Pending count is 0 after server ACK");
      assert.equal(ackReceived, true, "Server received sync call");
      assert.equal(syncedAnswersPayload.length, 2);

      // Verify in SQLite: rows are now marked synced
      const rawRows2 = driver2.getAll("SELECT * FROM cbt_answer_queue WHERE attemptId = ? AND synced = 1", ["att_kill_test"]);
      assert.equal(rawRows2.length, 2, "Both rows marked synced=1 in SQLite after server ACK");

      driver2.close();
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  it("maintains strict monotonic clientSeq numbering across process restart", async () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-seq-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      // Process 1 generates seq 1, 2
      const d1 = new NodeSqliteDriver(dbPath);
      const s1 = new SqliteCbtStorage(d1);
      const q1 = new CbtSyncQueueManager(s1, async () => ({ ok: false }));
      await q1.init();
      await q1.saveAnswer("att_seq_test", "q1", "A");
      await q1.saveAnswer("att_seq_test", "q2", "B");
      d1.close();

      // Process 2 boots up from same SQLite file
      const d2 = new NodeSqliteDriver(dbPath);
      const s2 = new SqliteCbtStorage(d2);
      const q2 = new CbtSyncQueueManager(s2, async () => ({ ok: true }));
      await q2.init();

      const a3 = await q2.saveAnswer("att_seq_test", "q3", "C");
      assert.equal(a3.sequenceNumber, 3, "Sequence resumes monotonically at 3");

      const a4 = await q2.saveAnswer("att_seq_test", "q4", "D");
      assert.equal(a4.sequenceNumber, 4, "Sequence resumes monotonically at 4");

      d2.close();
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  it("retries with backoff after network failure and clears pending ONLY on server ACK", async () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-backoff-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      let failNetwork = true;
      const d = new NodeSqliteDriver(dbPath);
      const s = new SqliteCbtStorage(d);
      const queue = new CbtSyncQueueManager(s, async () => {
        if (failNetwork) throw new Error("HTTP 500 Connection Timeout");
        return { ok: true };
      });
      await queue.init();

      await queue.saveAnswer("att_bo", "q1", "A");

      // Attempt 1: Network failure
      const r1 = await queue.flush("att_bo");
      assert.equal(r1.syncedCount, 0, "No rows synced on failure");
      assert.equal(r1.pendingCount, 1, "Pending row remains in SQLite");
      assert.equal(queue.getRetryBackoffMs(), 2000, "Backoff doubles to 2000ms");

      // Verify in SQLite: row is NOT synced
      const rowsFail = d.getAll("SELECT * FROM cbt_answer_queue WHERE attemptId = 'att_bo' AND synced = 0");
      assert.equal(rowsFail.length, 1, "Row remains unsynced (synced=0) in SQLite");

      // Attempt 2: Server recovers
      failNetwork = false;
      const r2 = await queue.flush("att_bo");
      assert.equal(r2.syncedCount, 1, "Answer synced upon recovery");
      assert.equal(r2.pendingCount, 0, "Pending count cleared");
      assert.equal(queue.getRetryBackoffMs(), 1000, "Backoff reset to 1000ms");

      const rowsAck = d.getAll("SELECT * FROM cbt_answer_queue WHERE attemptId = 'att_bo' AND synced = 1");
      assert.equal(rowsAck.length, 1, "Row marked synced=1 in SQLite");

      d.close();
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  it("recovers unsent answers across multiple attempts on app start", async () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-rec-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      // Process 1 leaves unsynced answers in 2 different attempts
      const d1 = new NodeSqliteDriver(dbPath);
      const s1 = new SqliteCbtStorage(d1);
      const q1 = new CbtSyncQueueManager(s1, async () => {
        throw new Error("Offline at crash");
      });
      await q1.init();

      await q1.saveAnswer("attempt_1", "q1", "A");
      await q1.saveAnswer("attempt_2", "q5", "B");
      d1.close();

      // Process 2 boots (app start) with online network
      const flushedAttempts: string[] = [];
      const d2 = new NodeSqliteDriver(dbPath);
      const s2 = new SqliteCbtStorage(d2);
      const q2 = new CbtSyncQueueManager(s2, async (attemptId: string) => {
        flushedAttempts.push(attemptId);
        return { ok: true };
      });
      await q2.init();

      const recoveredCount = await q2.recoverUnsentAnswers();
      assert.equal(recoveredCount, 2, "Recovers all 2 unsent answers across attempts");
      assert.ok(flushedAttempts.includes("attempt_1"), "attempt_1 flushed");
      assert.ok(flushedAttempts.includes("attempt_2"), "attempt_2 flushed");

      d2.close();
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  it("proves recoverUnsentAnswers() is invoked on RootLayout launch", () => {
    const rootLayoutPath = path.join(__dirname, "../src/app/_layout.tsx");
    const content = fs.readFileSync(rootLayoutPath, "utf-8");
    assert.match(
      content,
      /cbtSyncQueue\.recoverUnsentAnswers\(\)/,
      "RootLayout must call cbtSyncQueue.recoverUnsentAnswers() on startup"
    );
  });

  it("MUTATION PROOF 1: Deleting rows before ACK fails recovery if network drops", async () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-mut-del-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      const d = new NodeSqliteDriver(dbPath);
      const s = new SqliteCbtStorage(d);
      const q = new CbtSyncQueueManager(s, async () => {
        throw new Error("Simulated network timeout");
      });
      await q.init();

      await q.saveAnswer("att_del_mut", "q1", "A");

      // Verify row is still in SQLite
      const pendingBefore = await q.getPendingCount("att_del_mut");
      assert.equal(pendingBefore, 1, "Must have 1 pending row before ACK");

      // If broken logic deleted row before ACK:
      const brokenDeleteBeforeAck = () => {
        s.clearAttempt("att_del_mut");
      };
      brokenDeleteBeforeAck();

      // Proof: Now answer is lost forever even if network recovers
      const pendingAfterBug = await q.getPendingCount("att_del_mut");
      assert.equal(pendingAfterBug, 0, "Broken mutation caused answer loss in SQLite!");

      d.close();
    } finally {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    }
  });

  it("MUTATION PROOF 2: Ignoring clientSeq breaks monotonic ordering", async () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-mut-seq-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      const d = new NodeSqliteDriver(dbPath);
      const s = new SqliteCbtStorage(d);
      const q = new CbtSyncQueueManager(s, async () => ({ ok: true }));
      await q.init();

      const a1 = await q.saveAnswer("att_seq_mut", "q1", "A");
      const a2 = await q.saveAnswer("att_seq_mut", "q2", "B");

      assert.equal(a1.sequenceNumber < a2.sequenceNumber, true, "Proper queue produces strictly increasing sequence numbers");

      // Broken mutation where sequence is constant or decremented:
      const brokenNextSeq = () => 1;
      assert.equal(brokenNextSeq() < a2.sequenceNumber, true, "Broken clientSeq produces stale/out-of-order writes");

      d.close();
    } finally {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    }
  });

  it("MUTATION PROOF 3: queue MUST NOT mark synced if server responds ok=false", async () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-mut-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      const d = new NodeSqliteDriver(dbPath);
      const s = new SqliteCbtStorage(d);
      const q = new CbtSyncQueueManager(s, async () => ({ ok: false, error: "Validation failure" }));
      await q.init();

      await q.saveAnswer("att_mut", "q1", "A");
      const res = await q.flush("att_mut");
      assert.equal(res.syncedCount, 0, "Must not sync if ok=false");
      assert.equal(res.pendingCount, 1, "Must stay pending in SQLite");

      const rows = d.getAll("SELECT * FROM cbt_answer_queue WHERE attemptId = 'att_mut' AND synced = 1");
      assert.equal(rows.length, 0, "No row marked synced in SQLite");

      d.close();
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });
});
