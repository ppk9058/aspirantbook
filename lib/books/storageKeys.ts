/**
 * Pure (framework-free) helpers for the book cart / saved / orders / wishlist
 * browser storage.
 *
 * These live outside the React contexts (`cartContext.tsx`,
 * `wishlistContext.tsx`) so the storage-key and (de)serialisation rules can be
 * unit-tested in plain node without React or next-auth, and so both contexts
 * share exactly one implementation.
 */

export const CART_STORAGE_KEY_PREFIX = "trillion_book_cart_items"
export const SAVED_STORAGE_KEY_PREFIX = "trillion_book_saved_items"
export const ORDERS_STORAGE_KEY_PREFIX = "trillion_book_orders_history"
export const WISHLIST_STORAGE_KEY_PREFIX = "trillion_books_wishlist_ids"

function userScopedKey(prefix: string, userId: string): string
function userScopedKey(prefix: string, userId?: string | null): string | null
function userScopedKey(prefix: string, userId?: string | null): string | null {
  // Guests (no id) never get a storage key, so they can never read user data.
  if (!userId) return null
  return `${prefix}_${userId}`
}

export function getCartStorageKey(userId: string): string
export function getCartStorageKey(userId?: string | null): string | null
export function getCartStorageKey(userId?: string | null): string | null {
  return userScopedKey(CART_STORAGE_KEY_PREFIX, userId)
}

export function getSavedStorageKey(userId: string): string
export function getSavedStorageKey(userId?: string | null): string | null
export function getSavedStorageKey(userId?: string | null): string | null {
  return userScopedKey(SAVED_STORAGE_KEY_PREFIX, userId)
}

export function getOrdersStorageKey(userId: string): string
export function getOrdersStorageKey(userId?: string | null): string | null
export function getOrdersStorageKey(userId?: string | null): string | null {
  return userScopedKey(ORDERS_STORAGE_KEY_PREFIX, userId)
}

export function getWishlistStorageKey(userId: string): string
export function getWishlistStorageKey(userId?: string | null): string | null
export function getWishlistStorageKey(userId?: string | null): string | null {
  return userScopedKey(WISHLIST_STORAGE_KEY_PREFIX, userId)
}

/**
 * Parse a stored list. Missing, empty, corrupted or non-array payloads all
 * resolve to an empty list instead of throwing (a corrupted localStorage entry
 * must never break hydration).
 */
export function parseStoredList<T>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function serializeStoredList<T>(items: readonly T[]): string {
  return JSON.stringify(Array.isArray(items) ? items : [])
}

type ReadableStorage = { getItem(key: string): string | null }
type WritableStorage = { setItem(key: string, value: string): void }

/** Read a user-scoped list. A null key (guest) always yields an empty list. */
export function readStoredList<T>(storage: ReadableStorage, key: string | null): T[] {
  if (!key) return []
  try {
    return parseStoredList<T>(storage.getItem(key))
  } catch (error) {
    console.error("Failed to read stored list:", error)
    return []
  }
}

/** Write a user-scoped list. A null key (guest) is a no-op. */
export function writeStoredList<T>(
  storage: WritableStorage,
  key: string | null,
  items: readonly T[]
): void {
  if (!key) return
  try {
    storage.setItem(key, serializeStoredList(items))
  } catch (error) {
    console.error("Failed to write stored list:", error)
  }
}
