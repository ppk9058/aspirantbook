/**
 * CBT Mobile Sync Engine (Task A13)
 *
 * Implements:
 * 1. Immediate local persistence: Every answer tap is persisted to local storage
 *    instantly to guarantee zero data loss on crash/kill.
 * 2. Client-side debounce (1800ms trailing debounce): Coalesces rapid sequential
 *    taps (e.g. 10 taps in 5 seconds) into a single batch sync network payload.
 * 3. 429 Rate Limit backoff: Parses Retry-After header / body, pauses all outbound
 *    sync requests until the deadline expires, and keeps answers safely queued.
 */

export interface SyncAnswerPayload {
  questionId: string;
  selectedOption: string | null;
  isMarked?: boolean;
  timeSpentSecs?: number;
  timestamp: number;
}

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

// In-memory fallback adapter for tests / environments without AsyncStorage
class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

export type SyncTransport = (
  attemptId: string,
  answers: SyncAnswerPayload[],
  sequence: number
) => Promise<{ status: number; headers?: Record<string, string>; body?: any }>;

export class CbtSyncManager {
  private attemptId: string;
  private pendingQueue: Map<string, SyncAnswerPayload> = new Map();
  private debounceTimer: any = null;
  private debounceMs: number = 1800; // 1500-2000 ms range
  private sequence: number = 0;
  private pausedUntil: number = 0;
  private isSyncing: boolean = false;
  private storage: StorageAdapter;
  private storageKey: string;
  private transport: SyncTransport;
  public syncCallCount: number = 0;

  constructor(
    attemptId: string,
    options?: {
      debounceMs?: number;
      storage?: StorageAdapter;
      transport?: SyncTransport;
    }
  ) {
    this.attemptId = attemptId;
    this.debounceMs = options?.debounceMs ?? 1800;
    this.storage = options?.storage ?? new MemoryStorageAdapter();
    this.storageKey = `cbt_queue_${attemptId}`;
    this.transport =
      options?.transport ??
      (async () => ({ status: 200, headers: {}, body: { synced: true } }));
  }

  /**
   * Called immediately whenever a student selects or marks an option.
   * 1. Queues answer in memory.
   * 2. Immediately persists queue to local storage.
   * 3. Schedules a trailing debounced flush.
   */
  public async saveAnswer(
    questionId: string,
    selectedOption: string | null,
    isMarked: boolean = false,
    timeSpentSecs: number = 0
  ): Promise<void> {
    const payload: SyncAnswerPayload = {
      questionId,
      selectedOption,
      isMarked,
      timeSpentSecs,
      timestamp: Date.now(),
    };

    // 1. Update in-memory queue
    this.pendingQueue.set(questionId, payload);

    // 2. Immediate local storage persistence
    await this.persistQueue();

    // 3. Schedule trailing debounced sync
    this.scheduleDebouncedSync();
  }

  private scheduleDebouncedSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flushSync().catch((err) => {
        console.warn("[CbtSyncManager] Debounced sync error:", err);
      });
    }, this.debounceMs);
  }

  /**
   * Flushes all currently queued answers to the server.
   */
  public async flushSync(): Promise<{ synced: boolean; count: number; paused?: boolean }> {
    if (this.isSyncing) {
      return { synced: false, count: 0 };
    }

    const now = Date.now();
    if (now < this.pausedUntil) {
      // Still paused due to 429 Retry-After backoff
      return { synced: false, count: 0, paused: true };
    }

    if (this.pendingQueue.size === 0) {
      return { synced: true, count: 0 };
    }

    this.isSyncing = true;
    this.sequence++;
    const answersToSend = Array.from(this.pendingQueue.values());
    this.syncCallCount++;

    try {
      const response = await this.transport(this.attemptId, answersToSend, this.sequence);

      if (response.status === 429) {
        // Parse Retry-After
        let retrySeconds = 5; // default fallback
        if (response.headers && response.headers["retry-after"]) {
          const parsed = Number(response.headers["retry-after"]);
          if (!isNaN(parsed) && parsed > 0) retrySeconds = parsed;
        } else if (response.body?.retryAfter) {
          retrySeconds = Number(response.body.retryAfter) || 5;
        }

        this.pausedUntil = Date.now() + retrySeconds * 1000;
        console.warn(
          `[CbtSyncManager] Received 429 rate limit. Pausing sync for ${retrySeconds}s until ${new Date(this.pausedUntil).toISOString()}`
        );

        // Schedule unpause flush
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.debounceTimer = null;
          this.flushSync().catch(() => {});
        }, retrySeconds * 1000);

        return { synced: false, count: answersToSend.length, paused: true };
      }

      if (response.status >= 200 && response.status < 300) {
        // Remove successfully synced items from queue
        for (const ans of answersToSend) {
          const current = this.pendingQueue.get(ans.questionId);
          // Only delete if the item was not modified while network was in-flight
          if (current && current.timestamp <= ans.timestamp) {
            this.pendingQueue.delete(ans.questionId);
          }
        }
        await this.persistQueue();
        return { synced: true, count: answersToSend.length };
      }

      // Non-200 non-429 error: Keep in queue for next retry
      return { synced: false, count: answersToSend.length };
    } finally {
      this.isSyncing = false;
    }
  }

  private async persistQueue(): Promise<void> {
    const raw = JSON.stringify(Array.from(this.pendingQueue.entries()));
    await this.storage.setItem(this.storageKey, raw);
  }

  public async loadPersistedQueue(): Promise<void> {
    const raw = await this.storage.getItem(this.storageKey);
    if (raw) {
      try {
        const entries = JSON.parse(raw);
        this.pendingQueue = new Map(entries);
      } catch {}
    }
  }

  public getPendingQueue(): SyncAnswerPayload[] {
    return Array.from(this.pendingQueue.values());
  }

  public isSyncPaused(): boolean {
    return Date.now() < this.pausedUntil;
  }

  public getRetryAfterDeadline(): number {
    return this.pausedUntil;
  }

  public resetForTesting(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.pendingQueue.clear();
    this.sequence = 0;
    this.pausedUntil = 0;
    this.isSyncing = false;
    this.syncCallCount = 0;
  }
}
