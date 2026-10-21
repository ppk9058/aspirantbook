import { api } from "./api";

export interface LocalAnswerRecord {
  attemptId: string;
  questionId: string;
  selectedOption: string | null;
  isMarked: boolean;
  timeSpentSecs: number;
  sequenceNumber: number;
  synced: boolean;
  updatedAt: number;
}

export interface CbtStorageDriver {
  saveRecord: (record: LocalAnswerRecord) => Promise<void> | void;
  getRecordsForAttempt: (attemptId: string) => Promise<LocalAnswerRecord[]> | LocalAnswerRecord[];
  getAllUnsyncedAttempts: () => Promise<string[]> | string[];
  markSynced: (attemptId: string, questionId: string, sequenceNumber: number) => Promise<void> | void;
  clearAttempt: (attemptId: string) => Promise<void> | void;
  resetAll: () => Promise<void> | void;
}

// 1. In-memory durable driver (for Node.js test runners and non-native runtimes)
export class MemoryCbtDriver implements CbtStorageDriver {
  private store = new Map<string, LocalAnswerRecord>();

  saveRecord(record: LocalAnswerRecord): void {
    const key = `${record.attemptId}:${record.questionId}`;
    this.store.set(key, { ...record });
  }

  getRecordsForAttempt(attemptId: string): LocalAnswerRecord[] {
    const list: LocalAnswerRecord[] = [];
    for (const record of this.store.values()) {
      if (record.attemptId === attemptId) {
        list.push({ ...record });
      }
    }
    return list.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  getAllUnsyncedAttempts(): string[] {
    const attemptIds = new Set<string>();
    for (const record of this.store.values()) {
      if (!record.synced) {
        attemptIds.add(record.attemptId);
      }
    }
    return Array.from(attemptIds);
  }

  markSynced(attemptId: string, questionId: string, sequenceNumber: number): void {
    const key = `${attemptId}:${questionId}`;
    const rec = this.store.get(key);
    if (rec && rec.sequenceNumber <= sequenceNumber) {
      rec.synced = true;
    }
  }

  clearAttempt(attemptId: string): void {
    for (const [key, val] of this.store.entries()) {
      if (val.attemptId === attemptId) {
        this.store.delete(key);
      }
    }
  }

  resetAll(): void {
    this.store.clear();
  }
}

// 2. SQLite driver for Expo Go / React Native production runtime
export class SQLiteCbtDriver implements CbtStorageDriver {
  private db: any = null;
  private initialized = false;
  private memoryFallback = new MemoryCbtDriver();

  private async getDb() {
    if (this.initialized) return this.db;
    try {
      const isNative = typeof navigator !== "undefined" && navigator.product === "ReactNative";
      if (!isNative) {
        this.initialized = true;
        return null;
      }
      const SQLite = await import("expo-sqlite");
      this.db = SQLite.openDatabaseSync("aspirantbook_cbt.db");
      this.db.execSync(
        `CREATE TABLE IF NOT EXISTS cbt_answer_queue (
          attemptId TEXT,
          questionId TEXT,
          selectedOption TEXT,
          isMarked INTEGER,
          timeSpentSecs INTEGER,
          sequenceNumber INTEGER,
          synced INTEGER,
          updatedAt INTEGER,
          PRIMARY KEY (attemptId, questionId)
        );`
      );
      this.initialized = true;
      return this.db;
    } catch {
      this.initialized = true;
      this.db = null;
      return null;
    }
  }

  async saveRecord(record: LocalAnswerRecord): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryFallback.saveRecord(record);
      return;
    }
    try {
      db.runSync(
        `INSERT OR REPLACE INTO cbt_answer_queue
         (attemptId, questionId, selectedOption, isMarked, timeSpentSecs, sequenceNumber, synced, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.attemptId,
          record.questionId,
          record.selectedOption,
          record.isMarked ? 1 : 0,
          record.timeSpentSecs,
          record.sequenceNumber,
          record.synced ? 1 : 0,
          record.updatedAt,
        ]
      );
    } catch {
      this.memoryFallback.saveRecord(record);
    }
  }

  async getRecordsForAttempt(attemptId: string): Promise<LocalAnswerRecord[]> {
    const db = await this.getDb();
    if (!db) return this.memoryFallback.getRecordsForAttempt(attemptId);
    try {
      const rows = db.getAllSync(
        `SELECT * FROM cbt_answer_queue WHERE attemptId = ? ORDER BY sequenceNumber ASC`,
        [attemptId]
      );
      return rows.map((r: any) => ({
        attemptId: r.attemptId,
        questionId: r.questionId,
        selectedOption: r.selectedOption,
        isMarked: Boolean(r.isMarked),
        timeSpentSecs: Number(r.timeSpentSecs),
        sequenceNumber: Number(r.sequenceNumber),
        synced: Boolean(r.synced),
        updatedAt: Number(r.updatedAt),
      }));
    } catch {
      return this.memoryFallback.getRecordsForAttempt(attemptId);
    }
  }

  async getAllUnsyncedAttempts(): Promise<string[]> {
    const db = await this.getDb();
    if (!db) return this.memoryFallback.getAllUnsyncedAttempts();
    try {
      const rows = db.getAllSync(
        `SELECT DISTINCT attemptId FROM cbt_answer_queue WHERE synced = 0`
      );
      return rows.map((r: any) => r.attemptId);
    } catch {
      return this.memoryFallback.getAllUnsyncedAttempts();
    }
  }

  async markSynced(attemptId: string, questionId: string, sequenceNumber: number): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryFallback.markSynced(attemptId, questionId, sequenceNumber);
      return;
    }
    try {
      db.runSync(
        `UPDATE cbt_answer_queue SET synced = 1 WHERE attemptId = ? AND questionId = ? AND sequenceNumber <= ?`,
        [attemptId, questionId, sequenceNumber]
      );
    } catch {
      this.memoryFallback.markSynced(attemptId, questionId, sequenceNumber);
    }
  }

  async clearAttempt(attemptId: string): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryFallback.clearAttempt(attemptId);
      return;
    }
    try {
      db.runSync(`DELETE FROM cbt_answer_queue WHERE attemptId = ?`, [attemptId]);
    } catch {
      this.memoryFallback.clearAttempt(attemptId);
    }
  }

  async resetAll(): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      this.memoryFallback.resetAll();
      return;
    }
    try {
      db.runSync(`DELETE FROM cbt_answer_queue`);
    } catch {
      this.memoryFallback.resetAll();
    }
  }
}

// 3. Queue Manager Class (can be instantiated or used via singleton)
export class CbtSyncQueueManager {
  private driver: CbtStorageDriver;
  private currentSequence: number = 0;
  private isSyncing: boolean = false;
  private retryCount: number = 0;
  private syncApiFn: (attemptId: string, payload: any) => Promise<{ ok: boolean; error?: any }>;

  constructor(driver?: CbtStorageDriver, syncApiFn?: any) {
    this.driver = driver || new SQLiteCbtDriver();
    this.syncApiFn = syncApiFn || ((id, p) => api.syncAnswers(id, p));
  }

  public setDriver(driver: CbtStorageDriver) {
    this.driver = driver;
  }

  public async init(): Promise<void> {
    // Determine the highest sequence number from existing records to maintain monotonic order
    const attempts = await this.driver.getAllUnsyncedAttempts();
    for (const attId of attempts) {
      const records = await this.driver.getRecordsForAttempt(attId);
      for (const rec of records) {
        if (rec.sequenceNumber > this.currentSequence) {
          this.currentSequence = rec.sequenceNumber;
        }
      }
    }
  }

  public enqueue(attemptId: string, questionId: string, selectedOption: string | null) {
    void this.saveAnswer(attemptId, questionId, selectedOption);
  }

  /**
   * Immediately persists answer locally (O(1)) and triggers cloud synchronization.
   */
  public async saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOption: string | null,
    isMarked: boolean = false,
    timeSpentSecs: number = 0
  ): Promise<LocalAnswerRecord> {
    this.currentSequence += 1;
    const record: LocalAnswerRecord = {
      attemptId,
      questionId,
      selectedOption,
      isMarked,
      timeSpentSecs,
      sequenceNumber: this.currentSequence,
      synced: false,
      updatedAt: Date.now(),
    };

    await this.driver.saveRecord(record);

    // Trigger background sync asynchronously without blocking UI thread
    void this.flush(attemptId).catch(() => {});

    return record;
  }

  /**
   * Retrieves all saved answers for an attempt from local storage.
   */
  public async getAnswersForAttempt(attemptId: string): Promise<LocalAnswerRecord[]> {
    return this.driver.getRecordsForAttempt(attemptId);
  }

  /**
   * Recovers unsent answers on app startup across all in-progress attempts.
   */
  public async recoverUnsentAnswers(): Promise<number> {
    const unsyncedAttempts = await this.driver.getAllUnsyncedAttempts();
    let totalRecovered = 0;
    for (const attemptId of unsyncedAttempts) {
      const res = await this.flush(attemptId);
      totalRecovered += res.syncedCount;
    }
    return totalRecovered;
  }

  /**
   * Flushes unsynced answers to the server in a single batch.
   * Queue cleared ONLY after server ACK.
   */
  public async flush(attemptId?: string): Promise<{ syncedCount: number; pendingCount: number }> {
    if (!attemptId) {
      return { syncedCount: 0, pendingCount: 0 };
    }
    if (this.isSyncing) {
      const pending = await this.getPendingCount(attemptId);
      return { syncedCount: 0, pendingCount: pending };
    }

    const allRecords = await this.driver.getRecordsForAttempt(attemptId);
    const unsynced = allRecords.filter((r) => !r.synced);

    if (unsynced.length === 0) {
      return { syncedCount: 0, pendingCount: 0 };
    }

    this.isSyncing = true;
    try {
      const payload = unsynced.map((u) => ({
        questionId: u.questionId,
        selectedOption: u.selectedOption,
        isMarked: u.isMarked,
        timeSpentSecs: u.timeSpentSecs,
        sequenceNumber: u.sequenceNumber,
      }));

      const highestSeq = Math.max(...unsynced.map((u) => u.sequenceNumber));

      const res = await this.syncApiFn(attemptId, {
        answers: payload,
        lastSequenceNumber: highestSeq,
      });

      if (res.ok) {
        // SERVER ACK RECEIVED: Mark these records as synced in durable storage
        for (const u of unsynced) {
          await this.driver.markSynced(attemptId, u.questionId, u.sequenceNumber);
        }
        this.retryCount = 0; // Reset backoff counter on success
        const remainingPending = await this.getPendingCount(attemptId);
        return { syncedCount: unsynced.length, pendingCount: remainingPending };
      } else {
        // Server rejected or returned non-ok: increment backoff
        this.retryCount += 1;
      }
    } catch {
      // Network failure / Offline: changes remain in local queue for retry
      this.retryCount += 1;
    } finally {
      this.isSyncing = false;
    }

    const pending = await this.getPendingCount(attemptId);
    return { syncedCount: 0, pendingCount: pending };
  }

  public async getPendingCount(attemptId: string): Promise<number> {
    const records = await this.driver.getRecordsForAttempt(attemptId);
    return records.filter((r) => !r.synced).length;
  }

  public async clearAttempt(attemptId: string): Promise<void> {
    await this.driver.clearAttempt(attemptId);
  }

  public getRetryBackoffMs(): number {
    return Math.min(1000 * Math.pow(2, this.retryCount), 30000);
  }
}

// Global Singleton instance for application lifecycle
export const CbtSyncQueue = new CbtSyncQueueManager();
export const cbtSyncQueue = CbtSyncQueue;
