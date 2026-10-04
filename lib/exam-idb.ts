// ─────────────────────────────────────────────────────────────────
// IndexedDB utility for offline exam state persistence
// ─────────────────────────────────────────────────────────────────

const DB_NAME = "aspirantbookExam"
const STORE = "attempts"
const DB_VERSION = 1

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "attemptKey" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveExamState(attemptKey: string, state: object): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put({ attemptKey, ...state, savedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadExamState(attemptKey: string): Promise<Record<string, unknown> | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(attemptKey)
    req.onsuccess = () => resolve((req.result as Record<string, unknown>) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearExamState(attemptKey: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(attemptKey)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
