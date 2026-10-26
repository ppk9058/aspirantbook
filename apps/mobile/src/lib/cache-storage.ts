// Detect native environment safely without importing react-native at top-level
const isNativePlatform = typeof navigator !== "undefined" && navigator.product === "ReactNative";

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | (string | null);
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
  clearAll: () => Promise<void> | void;
}

const memoryStore = new Map<string, string>();

export const memoryStorageAdapter: StorageAdapter = {
  getItem: (key: string) => memoryStore.get(key) || null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clearAll: () => {
    memoryStore.clear();
  },
};

// SQLite-based Key-Value store for Expo Go / native runtime
export class SQLiteKVAdapter implements StorageAdapter {
  private db: any = null;
  private initialized = false;

  private async getDb() {
    if (this.initialized) return this.db;
    try {
      if (!isNativePlatform) {
        this.initialized = true;
        return null;
      }
      const SQLite = await import("expo-sqlite");
      this.db = SQLite.openDatabaseSync("aspirantbook_cache.db");
      this.db.execSync(
        "CREATE TABLE IF NOT EXISTS kv_cache (key TEXT PRIMARY KEY, value TEXT, updatedAt INTEGER);"
      );
      this.initialized = true;
      return this.db;
    } catch {
      this.initialized = true;
      this.db = null;
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const db = await this.getDb();
    if (!db) return memoryStorageAdapter.getItem(key);
    try {
      const row = db.getFirstSync("SELECT value FROM kv_cache WHERE key = ?", [key]) as { value?: string } | null;
      return row?.value ?? null;
    } catch {
      return memoryStorageAdapter.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return memoryStorageAdapter.setItem(key, value);
    try {
      db.runSync(
        "INSERT OR REPLACE INTO kv_cache (key, value, updatedAt) VALUES (?, ?, ?)",
        [key, value, Date.now()]
      );
    } catch {
      memoryStorageAdapter.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return memoryStorageAdapter.removeItem(key);
    try {
      db.runSync("DELETE FROM kv_cache WHERE key = ?", [key]);
    } catch {
      memoryStorageAdapter.removeItem(key);
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.getDb();
    memoryStorageAdapter.clearAll();
    if (!db) return;
    try {
      db.runSync("DELETE FROM kv_cache");
    } catch {}
  }
}

// Active adapter seam: defaults to SQLiteKVAdapter in runtime, swappable for MMKV in dev builds
let activeAdapter: StorageAdapter = new SQLiteKVAdapter();

export function setStorageAdapter(adapter: StorageAdapter) {
  activeAdapter = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  return activeAdapter;
}
