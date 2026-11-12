import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

import { pluralize, formatCount } from "@/lib/utils"
import {
  CART_STORAGE_KEY_PREFIX,
  ORDERS_STORAGE_KEY_PREFIX,
  SAVED_STORAGE_KEY_PREFIX,
  WISHLIST_STORAGE_KEY_PREFIX,
  getCartStorageKey,
  getOrdersStorageKey,
  getSavedStorageKey,
  getWishlistStorageKey,
  parseStoredList,
  readStoredList,
  serializeStoredList,
  writeStoredList,
} from "@/lib/books/storageKeys"

type FakeStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function createFakeStorage(): FakeStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

// The focus rules exactly as they exist on app/main (2f08473ac). Used as a
// fallback if the test runner has no git history (e.g. a source tarball).
const MAIN_FOCUS_BLOCK = `/* Focus styles */
*:focus-visible {
  outline: 2px solid #1448d8;
  outline-offset: 2px;
}`

function readMainGlobalsCss(): string {
  try {
    return execFileSync("git", ["show", "app/main:app/globals.css"], {
      cwd: process.cwd(),
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return MAIN_FOCUS_BLOCK
  }
}

// Every rule/line that mentions focus, in file order, normalised for comparison.
function focusRules(css: string): string[] {
  const rules: string[] = []
  const lines = css.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (/focus-visible|focus:not/i.test(line)) {
      rules.push(line.trim())
      // Include the declarations belonging to that selector block.
      for (let i = index + 1; i < lines.length; i++) {
        const next = lines[i].trim()
        if (next === "}") break
        if (next.length > 0) rules.push(next)
      }
    }
  })
  return rules
}

describe("UI/UX Polish Pass Unit Tests", () => {
  describe("Pluralization and Count Formatting (Web)", () => {
    it("handles 0 counts correctly", () => {
      assert.equal(pluralize(0, "test"), "0 tests")
      assert.equal(pluralize(0, "user", "users"), "0 users")
      assert.equal(formatCount(0, "test"), "0 tests")
      assert.equal(formatCount("0", "user"), "0 users")
    })

    it("handles 1 count without plural suffix", () => {
      assert.equal(pluralize(1, "test"), "1 test")
      assert.equal(pluralize(1, "user"), "1 user")
      assert.equal(formatCount(1, "test"), "1 test")
      assert.equal(formatCount("1", "user"), "1 user")
      assert.equal(formatCount(1, "Total Test"), "1 Total Test")
      assert.equal(formatCount(1, "Free Test"), "1 Free Test")
    })

    it("handles 2 counts with plural suffix", () => {
      assert.equal(pluralize(2, "test"), "2 tests")
      assert.equal(pluralize(2, "user"), "2 users")
      assert.equal(formatCount(2, "test"), "2 tests")
      assert.equal(formatCount("2", "user"), "2 users")
    })
  })

  describe("Book storage keys and list (de)serialisation (real lib/books/storageKeys.ts)", () => {
    it("returns null storage keys for guest / unauthenticated users", () => {
      assert.equal(getCartStorageKey(undefined), null)
      assert.equal(getCartStorageKey(null), null)
      assert.equal(getCartStorageKey(""), null)
      assert.equal(getSavedStorageKey(undefined), null)
      assert.equal(getSavedStorageKey(null), null)
      assert.equal(getSavedStorageKey(""), null)
      assert.equal(getOrdersStorageKey(undefined), null)
      assert.equal(getOrdersStorageKey(null), null)
      assert.equal(getOrdersStorageKey(""), null)
      assert.equal(getWishlistStorageKey(undefined), null)
      assert.equal(getWishlistStorageKey(null), null)
      assert.equal(getWishlistStorageKey(""), null)
    })

    it("returns distinct scoped storage keys for distinct users", () => {
      const userA = "usr_alice_123"
      const userB = "usr_bob_456"

      assert.equal(getCartStorageKey(userA), `${CART_STORAGE_KEY_PREFIX}_${userA}`)
      assert.equal(getCartStorageKey(userB), `${CART_STORAGE_KEY_PREFIX}_${userB}`)
      assert.notEqual(getCartStorageKey(userA), getCartStorageKey(userB))

      assert.equal(getSavedStorageKey(userA), `${SAVED_STORAGE_KEY_PREFIX}_${userA}`)
      assert.notEqual(getSavedStorageKey(userA), getSavedStorageKey(userB))

      assert.equal(getOrdersStorageKey(userA), `${ORDERS_STORAGE_KEY_PREFIX}_${userA}`)
      assert.notEqual(getOrdersStorageKey(userA), getOrdersStorageKey(userB))

      assert.equal(getWishlistStorageKey(userA), `${WISHLIST_STORAGE_KEY_PREFIX}_${userA}`)
      assert.notEqual(getWishlistStorageKey(userA), getWishlistStorageKey(userB))
    })

    it("a guest has no key and always reads an empty list", () => {
      const storage = createFakeStorage()
      // Even if some data exists in storage, a guest key is null → empty list.
      storage.setItem(`${CART_STORAGE_KEY_PREFIX}_usr_alice`, serializeStoredList(["secret"]))

      assert.deepEqual(readStoredList(storage, getCartStorageKey(null)), [], "guest cart must be empty")
      assert.deepEqual(readStoredList<string>(storage, getCartStorageKey(undefined)), [])
      assert.deepEqual(readStoredList<string>(storage, getWishlistStorageKey("")), [])
      // Writing with a null key is a no-op, never an unscoped write.
      writeStoredList(storage, getCartStorageKey(null), ["leak"])
      assert.equal(storage.data.size, 1)
    })

    it("data written under User A's key is not returned for User B or a guest", () => {
      const storage = createFakeStorage()
      const userA = "usr_alice"
      const userB = "usr_bob"

      writeStoredList(storage, getCartStorageKey(userA), [{ bookId: "book_1", quantity: 2 }])
      writeStoredList(storage, getWishlistStorageKey(userA), ["book_1", "book_2"])
      writeStoredList(storage, getOrdersStorageKey(userA), [{ id: "ord-1" }])

      assert.deepEqual(readStoredList(storage, getCartStorageKey(userA)), [
        { bookId: "book_1", quantity: 2 },
      ])
      assert.deepEqual(readStoredList(storage, getWishlistStorageKey(userA)), ["book_1", "book_2"])
      assert.deepEqual(readStoredList(storage, getOrdersStorageKey(userA)), [{ id: "ord-1" }])

      // User B sees nothing from User A.
      assert.deepEqual(readStoredList(storage, getCartStorageKey(userB)), [])
      assert.deepEqual(readStoredList(storage, getWishlistStorageKey(userB)), [])
      assert.deepEqual(readStoredList(storage, getOrdersStorageKey(userB)), [])

      // Guest sees nothing from User A.
      assert.deepEqual(readStoredList(storage, getCartStorageKey(null)), [])
      assert.deepEqual(readStoredList(storage, getWishlistStorageKey(undefined)), [])
    })

    it("corrupted JSON returns an empty list instead of throwing", () => {
      const storage = createFakeStorage()
      storage.setItem(`${CART_STORAGE_KEY_PREFIX}_usr_alice`, "{not valid json")
      storage.setItem(`${WISHLIST_STORAGE_KEY_PREFIX}_usr_alice`, "[1,2,")
      storage.setItem(`${ORDERS_STORAGE_KEY_PREFIX}_usr_alice`, '{"not":"a list"}')

      assert.doesNotThrow(() => parseStoredList("{not valid json"))
      assert.deepEqual(parseStoredList("{not valid json"), [])
      assert.deepEqual(parseStoredList(""), [])
      assert.deepEqual(parseStoredList(null), [])
      assert.deepEqual(readStoredList(storage, getCartStorageKey("usr_alice")), [])
      assert.deepEqual(readStoredList(storage, getWishlistStorageKey("usr_alice")), [])
      // A JSON object is not a list and must not be treated as one.
      assert.deepEqual(readStoredList(storage, getOrdersStorageKey("usr_alice")), [])
    })

    it("serialises lists and round-trips through the same key", () => {
      const items = [{ bookId: "book_9", quantity: 3 }]
      assert.equal(serializeStoredList(items), JSON.stringify(items))
      assert.deepEqual(parseStoredList(serializeStoredList(items)), items)
    })
  })

  describe("BookStoreHeader Static Audit (Badges auth-gated)", () => {
    it("ensures wishlist, orders, and cart badges are strictly conditioned on isLoggedIn", () => {
      const headerPath = path.resolve(process.cwd(), "components/books/BookStoreHeader.tsx")
      const content = fs.readFileSync(headerPath, "utf-8")

      // Check that badges are protected by isLoggedIn
      assert.match(content, /isLoggedIn && wishlistIds\.length > 0/)
      assert.match(content, /isLoggedIn && orders\.length > 0/)
      assert.match(content, /isLoggedIn && totalCount > 0/)
    })
  })

  describe("Books Orders Page Static Audit", () => {
    it("has no FALLBACK_ORDERS, no mock order TS-ORD-928471, no PW CBSE, and button is 'Browse Books'", () => {
      const ordersPath = path.resolve(process.cwd(), "app/(dashboard)/books/orders/page.tsx")
      const content = fs.readFileSync(ordersPath, "utf-8")

      assert.doesNotMatch(content, /FALLBACK_ORDERS/)
      assert.doesNotMatch(content, /TS-ORD-928471/)
      assert.doesNotMatch(content, /PW CBSE/)
      assert.match(content, /Browse Books/)
      assert.doesNotMatch(content, /Browse Store/)
    })
  })

  describe("MyTestsHubClient Static Audit", () => {
    it("has no hard-coded 'Bookmarks (14)', no WEAK_TOPICS, and shows honest empty states", () => {
      const myTestsPath = path.resolve(process.cwd(), "components/test-series/MyTestsHubClient.tsx")
      const content = fs.readFileSync(myTestsPath, "utf-8")

      assert.doesNotMatch(content, /Bookmarks \(14\)/)
      assert.doesNotMatch(content, /WEAK_TOPICS/)
      assert.doesNotMatch(content, /14 Bookmarked Questions/)
      // Check honest empty states
      assert.match(content, /No weak areas identified yet/)
      assert.match(content, /No bookmarked questions yet/)
    })
  })

  describe("Focus rules in globals.css match app/main exactly", () => {
    it("keeps the global *:focus-visible rule and adds no scoped variant", () => {
      const cssPath = path.resolve(process.cwd(), "app/globals.css")
      const content = fs.readFileSync(cssPath, "utf-8")

      // The global rule from main must still be there, unchanged.
      assert.match(content, /\/\* Focus styles \*\/\n\*:focus-visible \{\n {2}outline: 2px solid #1448d8;\n {2}outline-offset: 2px;\n\}/)
      // No scoped-to-main focus rules and no outline-removal rule anywhere.
      assert.doesNotMatch(content, /main\s*\*?:focus/)
      assert.doesNotMatch(content, /focus:not\(:focus-visible\)/)
    })

    it("has focus-related rules identical to app/main", () => {
      const cssPath = path.resolve(process.cwd(), "app/globals.css")
      const current = fs.readFileSync(cssPath, "utf-8")
      const main = readMainGlobalsCss()

      assert.deepEqual(
        focusRules(current),
        focusRules(main),
        "focus-related rules in app/globals.css differ from app/main"
      )
      // Sanity check: the comparison actually found the rule on both sides.
      assert.ok(focusRules(current).length >= 3)
    })
  })
})
