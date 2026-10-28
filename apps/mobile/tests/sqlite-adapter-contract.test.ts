import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  ExpoSqliteDriver,
  NodeSqliteDriver,
  SqliteCbtStorage,
  LocalAnswerRecord,
} from "../src/lib/cbt-sync";

describe("T4: SQLite Adapter Contract & Durability Verification", () => {
  it("verifies ExpoSqliteDriver interface against mock SQLite module", () => {
    const executedSql: string[] = [];
    const runQueries: { sql: string; params: any[] }[] = [];
    let isClosed = false;

    const mockSQLite = {
      openDatabaseSync: (name: string) => {
        return {
          execSync: (sql: string) => {
            executedSql.push(sql);
          },
          runSync: (sql: string, params: any[]) => {
            runQueries.push({ sql, params });
          },
          getAllSync: (sql: string, params: any[]) => {
            if (sql.includes("COUNT")) return [{ count: 42 }];
            return [{ id: 1, name: "test_row" }];
          },
          closeSync: () => {
            isClosed = true;
          },
        };
      },
    };

    const driver = new ExpoSqliteDriver("test_expo.db", mockSQLite);
    assert.equal(driver.isDurable, true, "Driver must report isDurable=true when module opens successfully");

    driver.exec("CREATE TABLE dummy (id INT);");
    assert.equal(executedSql.length, 1);
    assert.equal(executedSql[0], "CREATE TABLE dummy (id INT);");

    driver.run("INSERT INTO dummy VALUES (?);", [123]);
    assert.equal(runQueries.length, 1);
    assert.deepEqual(runQueries[0], { sql: "INSERT INTO dummy VALUES (?);", params: [123] });

    const rows = driver.getAll("SELECT * FROM dummy;");
    assert.deepEqual(rows, [{ id: 1, name: "test_row" }]);

    driver.close();
    assert.equal(isClosed, true, "closeSync must be invoked on driver.close()");
  });

  it("verifies SqliteCbtStorage contract: save, monotonic ordering, markSynced, and prune", () => {
    const tmpDir = os.tmpdir();
    const dbPath = path.join(tmpDir, `cbt-contract-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      const driver = new NodeSqliteDriver(dbPath);
      const storage = new SqliteCbtStorage(driver);

      // 1. Insert records out of order
      const rec2: LocalAnswerRecord = {
        attemptId: "att_contract_1",
        questionId: "q2",
        selectedOption: "B",
        isMarked: false,
        timeSpentSecs: 20,
        sequenceNumber: 2,
        synced: false,
        updatedAt: Date.now() - 5000,
      };
      const rec1: LocalAnswerRecord = {
        attemptId: "att_contract_1",
        questionId: "q1",
        selectedOption: "A",
        isMarked: true,
        timeSpentSecs: 15,
        sequenceNumber: 1,
        synced: false,
        updatedAt: Date.now() - 6000,
      };

      storage.saveRecord(rec2);
      storage.saveRecord(rec1);

      // 2. getRecordsForAttempt: must return strictly sorted by sequenceNumber ASC
      const records = storage.getRecordsForAttempt("att_contract_1");
      assert.equal(records.length, 2);
      assert.equal(records[0].sequenceNumber, 1, "First record must have sequenceNumber 1");
      assert.equal(records[0].questionId, "q1");
      assert.equal(records[1].sequenceNumber, 2, "Second record must have sequenceNumber 2");
      assert.equal(records[1].questionId, "q2");

      // 3. getAllUnsyncedAttempts
      const unsyncedAttempts = storage.getAllUnsyncedAttempts();
      assert.ok(unsyncedAttempts.includes("att_contract_1"));

      // 4. markSynced: must mark row synced=1 without deleting row or affecting newer sequence
      storage.markSynced("att_contract_1", "q1", 1);
      const afterSync = storage.getRecordsForAttempt("att_contract_1");
      assert.equal(afterSync.length, 2, "Rows must NOT be deleted upon markSynced");
      assert.equal(afterSync[0].synced, true, "q1 must now be synced");
      assert.equal(afterSync[1].synced, false, "q2 must still be unsynced");

      // 5. pruneOldAttempts: must prune ONLY synced rows older than maxAgeMs
      const oldTime = Date.now() - 100000;
      driver.run("UPDATE cbt_answer_queue SET updatedAt = ? WHERE questionId = 'q1'", [oldTime]);

      storage.pruneOldAttempts(50000); // Cutoff 50 seconds ago

      const afterPrune = storage.getRecordsForAttempt("att_contract_1");
      assert.equal(afterPrune.length, 1, "Old synced row q1 pruned");
      assert.equal(afterPrune[0].questionId, "q2", "Unsynced row q2 preserved despite age");

      // 6. clearAttempt
      storage.clearAttempt("att_contract_1");
      assert.equal(storage.getRecordsForAttempt("att_contract_1").length, 0);

      driver.close();
    } finally {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    }
  });
});
