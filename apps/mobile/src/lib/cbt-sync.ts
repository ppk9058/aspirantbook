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

// Memory-backed store for unit tests or fallback
const localDb = new Map<string, LocalAnswerRecord>();
let currentSequence = 0;
let isSyncing = false;

export const CbtSyncQueue = {
  async init() {
    return Promise.resolve();
  },

  enqueue(attemptId: string, questionId: string, selectedOption: string | null) {
    this.saveAnswer(attemptId, questionId, selectedOption).catch(() => {});
  },

  /**
   * Immediately persists answer locally (O(1)) and enqueues for cloud synchronization.
   */
  async saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOption: string | null,
    isMarked: boolean = false,
    timeSpentSecs: number = 0
  ): Promise<LocalAnswerRecord> {
    currentSequence += 1;
    const record: LocalAnswerRecord = {
      attemptId,
      questionId,
      selectedOption,
      isMarked,
      timeSpentSecs,
      sequenceNumber: currentSequence,
      synced: false,
      updatedAt: Date.now(),
    };

    const key = `${attemptId}:${questionId}`;
    localDb.set(key, record);

    // Trigger background sync asynchronously without blocking UI thread
    this.flush(attemptId).catch(() => {});

    return record;
  },

  /**
   * Retrieves all saved answers for an attempt from local storage.
   */
  async getAnswersForAttempt(attemptId: string): Promise<LocalAnswerRecord[]> {
    const list: LocalAnswerRecord[] = [];
    for (const record of localDb.values()) {
      if (record.attemptId === attemptId) {
        list.push(record);
      }
    }
    return list.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  },

  /**
   * Flushes unsynced answers to the server in a single batch.
   */
  async flush(attemptId?: string): Promise<{ syncedCount: number; pendingCount: number }> {
    if (!attemptId) {
      return { syncedCount: 0, pendingCount: 0 };
    }
    if (isSyncing) return { syncedCount: 0, pendingCount: this.getPendingCount(attemptId) };

    const unsynced: LocalAnswerRecord[] = [];
    for (const record of localDb.values()) {
      if (record.attemptId === attemptId && !record.synced) {
        unsynced.push(record);
      }
    }

    if (unsynced.length === 0) {
      return { syncedCount: 0, pendingCount: 0 };
    }

    isSyncing = true;
    try {
      const payload = unsynced.map((u) => ({
        questionId: u.questionId,
        selectedOption: u.selectedOption,
        isMarked: u.isMarked,
        timeSpentSecs: u.timeSpentSecs,
        sequenceNumber: u.sequenceNumber,
      }));

      const highestSeq = Math.max(...unsynced.map((u) => u.sequenceNumber));

      const res = await api.syncAnswers(attemptId, {
        answers: payload,
        lastSequenceNumber: highestSeq,
      });

      if (res.ok) {
        // Mark these records as synced
        for (const u of unsynced) {
          const rec = localDb.get(`${attemptId}:${u.questionId}`);
          if (rec && rec.sequenceNumber <= u.sequenceNumber) {
            rec.synced = true;
          }
        }
        return { syncedCount: unsynced.length, pendingCount: this.getPendingCount(attemptId) };
      }
    } catch {
      // Offline: changes remain in local queue until next flush
    } finally {
      isSyncing = false;
    }

    return { syncedCount: 0, pendingCount: this.getPendingCount(attemptId) };
  },

  getPendingCount(attemptId: string): number {
    let count = 0;
    for (const record of localDb.values()) {
      if (record.attemptId === attemptId && !record.synced) {
        count++;
      }
    }
    return count;
  },

  clearAttempt(attemptId: string) {
    for (const [key, val] of localDb.entries()) {
      if (val.attemptId === attemptId) {
        localDb.delete(key);
      }
    }
  },
};

export const cbtSyncQueue = CbtSyncQueue;
