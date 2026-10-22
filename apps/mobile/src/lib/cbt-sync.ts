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
  isDurable?: boolean;
  saveRecord: (record: LocalAnswerRecord) => Promise<void> | void;
  getRecordsForAttempt: (attemptId: string) => Promise<LocalAnswerRecord[]> | LocalAnswerRecord[];
  getAllUnsyncedAttempts: () => Promise<string[]> | string[];
  markSynced: (attemptId: string, questionId: string, sequenceNumber: number) => Promise<void> | void;
  pruneOldAttempts?: (maxAgeMs?: number) => Promise<void> | void;
  clearAttempt: (attemptId: string) => Promise<void> | void;
  resetAll: () => Promise<void> | void;
}

// ---------------------------------------------------------
// Low-level SQLite Driver Interface
// ---------------------------------------------------------
export interface SqliteDriver {
  isDurable: boolean;
  exec(sql: string): void;
  run(sql: string, params?: any[]): void;
  getAll<T = any>(sql: string, params?: any[]): T[];
  close?(): void;
}

/**
 * Real SQLite Driver for Node.js test runners using built-in node:sqlite (DatabaseSync)
 */
export class NodeSqliteDriver implements SqliteDriver {
  public isDurable = true;
  private db: any;

  constructor(filePath?: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DatabaseSync } = require("node:sqlite");
      this.db = new DatabaseSync(filePath || ":memory:");
    } catch {
      this.isDurable = false;
      this.db = null;
    }
  }

  exec(sql: string): void {
    if (!this.db) throw new Error("node:sqlite database not available");
    this.db.exec(sql);
  }

  run(sql: string, params?: any[]): void {
    if (!this.db) throw new Error("node:sqlite database not available");
    const stmt = this.db.prepare(sql);
    stmt.run(...(params || []));
  }

  getAll<T = any>(sql: string, params?: any[]): T[] {
    if (!this.db) throw new Error("node:sqlite database not available");
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Real SQLite Driver for Expo React Native production runtime using expo-sqlite
 */
export class ExpoSqliteDriver implements SqliteDriver {
  public isDurable = false;
  private db: any = null;

  constructor(dbName = "aspirantbook_cbt.db", customSqliteModule?: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SQLite = customSqliteModule || require("expo-sqlite");
      this.db = SQLite.openDatabaseSync(dbName);
      this.isDurable = true;
    } catch {
      this.db = null;
      this.isDurable = false;
    }
  }

  exec(sql: string): void {
    if (!this.db) throw new Error("expo-sqlite database not available");
    this.db.execSync(sql);
  }

  run(sql: string, params?: any[]): void {
    if (!this.db) throw new Error("expo-sqlite database not available");
    this.db.runSync(sql, params || []);
  }

  getAll<T = any>(sql: string, params?: any[]): T[] {
    if (!this.db) throw new Error("expo-sqlite database not available");
    return this.db.getAllSync(sql, params || []) as T[];
  }

  close(): void {
    if (this.db?.closeSync) {
      this.db.closeSync();
      this.db = null;
    }
  }
}

/**
 * Non-durable fallback driver (explicitly exposes isDurable=false so UI knows persistence is ephemeral)
 */
export class NonDurableFallbackDriver implements SqliteDriver {
  public isDurable = false;
  private store = new Map<string, any[]>();

  exec(_sql: string): void {}

  run(sql: string, params: any[] = []): void {
    if (sql.startsWith("INSERT OR REPLACE")) {
      const [attemptId, questionId] = params;
      this.store.set(`${attemptId}:${questionId}`, params);
    } else if (sql.startsWith("UPDATE")) {
      const [attemptId, questionId, sequenceNumber] = params;
      const key = `${attemptId}:${questionId}`;
      const rec = this.store.get(key);
      if (rec && rec[5] <= sequenceNumber) {
        rec[6] = 1; // synced = 1
      }
    } else if (sql.startsWith("DELETE FROM cbt_answer_queue WHERE attemptId")) {
      const [attemptId] = params;
      for (const [key, val] of this.store.entries()) {
        if (val[0] === attemptId) {
          this.store.delete(key);
        }
      }
    } else if (sql.startsWith("DELETE FROM cbt_answer_queue")) {
      this.store.clear();
    }
  }

  getAll<T = any>(sql: string, params: any[] = []): T[] {
    if (sql.includes("WHERE attemptId = ?")) {
      const [attemptId] = params;
      const result: any[] = [];
      for (const val of this.store.values()) {
        if (val[0] === attemptId) {
          result.push({
            attemptId: val[0],
            questionId: val[1],
            selectedOption: val[2],
            isMarked: val[3],
            timeSpentSecs: val[4],
            sequenceNumber: val[5],
            synced: val[6],
            updatedAt: val[7],
          });
        }
      }
      return result.sort((a, b) => a.sequenceNumber - b.sequenceNumber) as T[];
    }
    if (sql.includes("DISTINCT attemptId FROM cbt_answer_queue WHERE synced = 0")) {
      const set = new Set<string>();
      for (const val of this.store.values()) {
        if (val[6] === 0) set.add(val[0]);
      }
      return Array.from(set).map((id) => ({ attemptId: id })) as T[];
    }
    if (sql.includes("WHERE attemptId = ? AND synced = 1")) {
      const [attemptId] = params;
      const result: any[] = [];
      for (const val of this.store.values()) {
        if (val[0] === attemptId && val[6] === 1) {
          result.push({ attemptId: val[0], questionId: val[1] });
        }
      }
      return result as T[];
    }
    return [] as T[];
  }
}

// ---------------------------------------------------------
// Storage implementation backed directly by a SqliteDriver
// ---------------------------------------------------------
export class SqliteCbtStorage implements CbtStorageDriver {
  private driver: SqliteDriver;

  constructor(driver: SqliteDriver) {
    this.driver = driver;
    this.initSchema();
  }

  public get isDurable(): boolean {
    return this.driver.isDurable;
  }

  private initSchema(): void {
    try {
      this.driver.exec(
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
    } catch {
      // Driver might be in error state
    }
  }

  saveRecord(record: LocalAnswerRecord): void {
    this.driver.run(
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
  }

  getRecordsForAttempt(attemptId: string): LocalAnswerRecord[] {
    const rows = this.driver.getAll(
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
  }

  getAllUnsyncedAttempts(): string[] {
    const rows = this.driver.getAll(
      `SELECT DISTINCT attemptId FROM cbt_answer_queue WHERE synced = 0`
    );
    return rows.map((r: any) => r.attemptId);
  }

  markSynced(attemptId: string, questionId: string, sequenceNumber: number): void {
    this.driver.run(
      `UPDATE cbt_answer_queue SET synced = 1 WHERE attemptId = ? AND questionId = ? AND sequenceNumber <= ?`,
      [attemptId, questionId, sequenceNumber]
    );
  }

  pruneOldAttempts(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    this.driver.run(
      `DELETE FROM cbt_answer_queue WHERE synced = 1 AND updatedAt < ?`,
      [cutoff]
    );
  }

  clearAttempt(attemptId: string): void {
    this.driver.run(`DELETE FROM cbt_answer_queue WHERE attemptId = ?`, [attemptId]);
  }

  resetAll(): void {
    this.driver.run(`DELETE FROM cbt_answer_queue`);
  }
}

// In-memory driver for backwards compatibility with existing test suites
export class MemoryCbtDriver implements CbtStorageDriver {
  public isDurable = false;
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

  pruneOldAttempts(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, val] of this.store.entries()) {
      if (val.synced && val.updatedAt < cutoff) {
        this.store.delete(key);
      }
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

// Backwards compatibility alias
export class SQLiteCbtDriver extends SqliteCbtStorage {
  constructor() {
    const isNative = typeof navigator !== "undefined" && (navigator as any).product === "ReactNative";
    if (isNative) {
      super(new ExpoSqliteDriver());
    } else {
      try {
        super(new NodeSqliteDriver());
      } catch {
        super(new NonDurableFallbackDriver());
      }
    }
  }
}

// ---------------------------------------------------------
// Queue Manager Class
// ---------------------------------------------------------
export type CbtSyncStateListener = (state: {
  isSyncing: boolean;
  pendingCount: number;
  lastError: string | null;
}) => void;

export class CbtSyncQueueManager {
  private driver: CbtStorageDriver;
  private currentSequence: number = 0;
  private isSyncing: boolean = false;
  private retryCount: number = 0;
  private syncApiFn: (attemptId: string, payload: any) => Promise<{ ok: boolean; error?: any }>;
  public lastSyncError: string | null = null;
  private listeners: Set<CbtSyncStateListener> = new Set();
  private pendingCountCache: number = 0;

  constructor(driver?: CbtStorageDriver, syncApiFn?: any) {
    if (driver) {
      this.driver = driver;
    } else {
      const isNative = typeof navigator !== "undefined" && (navigator as any).product === "ReactNative";
      if (isNative) {
        this.driver = new SqliteCbtStorage(new ExpoSqliteDriver());
      } else {
        try {
          this.driver = new SqliteCbtStorage(new NodeSqliteDriver());
        } catch {
          this.driver = new SqliteCbtStorage(new NonDurableFallbackDriver());
        }
      }
    }
    this.syncApiFn = syncApiFn || ((id, p) => api.syncAnswers(id, p));
  }

  public get isDurable(): boolean {
    return this.driver.isDurable ?? false;
  }

  public setDriver(driver: CbtStorageDriver) {
    this.driver = driver;
  }

  public getLastSyncError(): string | null {
    return this.lastSyncError;
  }

  public subscribe(listener: CbtSyncStateListener): () => void {
    this.listeners.add(listener);
    try {
      listener({
        isSyncing: this.isSyncing,
        pendingCount: this.pendingCountCache,
        lastError: this.lastSyncError,
      });
    } catch {}
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener({
          isSyncing: this.isSyncing,
          pendingCount: this.pendingCountCache,
          lastError: this.lastSyncError,
        });
      } catch {}
    }
  }

  public async init(): Promise<void> {
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

  public async enqueueAnswer(
    attemptId: string,
    questionId: string,
    selectedOption: string | null,
    isMarked: boolean = false,
    timeSpentSecs: number = 0
  ) {
    return this.saveAnswer(attemptId, questionId, selectedOption, isMarked, timeSpentSecs);
  }

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
    this.pendingCountCache += 1;
    this.notifyListeners();

    // Trigger background sync asynchronously without blocking UI thread
    void this.flush(attemptId).catch((err: any) => {
      this.lastSyncError = err?.message || "Sync failure";
      this.notifyListeners();
    });

    return record;
  }

  public async getAnswersForAttempt(attemptId: string): Promise<LocalAnswerRecord[]> {
    return this.driver.getRecordsForAttempt(attemptId);
  }

  public async recoverUnsentAnswers(): Promise<number> {
    const unsyncedAttempts = await this.driver.getAllUnsyncedAttempts();
    let totalRecovered = 0;
    for (const attemptId of unsyncedAttempts) {
      const res = await this.flush(attemptId);
      totalRecovered += res.syncedCount;
    }
    const remainingPending = await this.getTotalPendingCount();
    this.pendingCountCache = remainingPending;
    this.notifyListeners();
    return totalRecovered;
  }

  public async getTotalPendingCount(): Promise<number> {
    const attempts = await this.driver.getAllUnsyncedAttempts();
    let total = 0;
    for (const attId of attempts) {
      total += await this.getPendingCount(attId);
    }
    return total;
  }

  public async pruneOldAttempts(maxAgeMs?: number): Promise<void> {
    if (this.driver.pruneOldAttempts) {
      await this.driver.pruneOldAttempts(maxAgeMs);
    }
  }

  public async flush(attemptId?: string): Promise<{ syncedCount: number; pendingCount: number }> {
    if (!attemptId) {
      return { syncedCount: 0, pendingCount: 0 };
    }
    if (this.isSyncing) {
      const pending = await this.getPendingCount(attemptId);
      this.pendingCountCache = pending;
      this.notifyListeners();
      return { syncedCount: 0, pendingCount: pending };
    }

    const allRecords = await this.driver.getRecordsForAttempt(attemptId);
    const unsynced = allRecords.filter((r) => !r.synced);

    if (unsynced.length === 0) {
      this.pendingCountCache = 0;
      this.lastSyncError = null;
      this.notifyListeners();
      return { syncedCount: 0, pendingCount: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();
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
        this.retryCount = 0;
        this.lastSyncError = null;
        const remainingPending = await this.getPendingCount(attemptId);
        this.pendingCountCache = remainingPending;
        this.notifyListeners();
        return { syncedCount: unsynced.length, pendingCount: remainingPending };
      } else {
        this.retryCount += 1;
        this.lastSyncError = res.error?.message || "Server rejected answer sync";
        this.notifyListeners();
      }
    } catch (err: any) {
      this.retryCount += 1;
      this.lastSyncError = err?.message || "Network offline during sync";
      this.notifyListeners();
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    const pending = await this.getPendingCount(attemptId);
    this.pendingCountCache = pending;
    this.notifyListeners();
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
