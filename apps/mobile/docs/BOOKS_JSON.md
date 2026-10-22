# Investigation Report: Root Cause of `data/books.json` Modification

**Date:** Thu Oct 22 08:32:00 IST 2026  
**Investigator:** Remediation Run 4 Agent  
**Target File:** `data/books.json` (Read-Only Investigation; no changes made to target file)

---

## 1. Summary of Evidence & Measured Checksums

- **U7 Contract-v1 Before SHA256 (measured):** `831ace5a6b69915604b9080681933b40a3e358ac395aa16aaf2a27c0e4a82d39`
- **U7 Contract-v1 After SHA256 (measured):** `9e1158037c970777e4b81305817055fee34bc6adc224b3f69d6b078cf4679f71`
- **U7 Security-Parity Before SHA256 (measured):** `9e1158037c970777e4b81305817055fee34bc6adc224b3f69d6b078cf4679f71`
- **U7 Security-Parity After SHA256 (measured):** `f13366c1545b4ee78dc65408e40d039973fa3899416d53bc2bd33c24297fce5a`
- **Working Tree Status:** `data/books.json` has remained modified without ever being staged or committed.

---

## 2. Code Path & Writing Mechanism

### Primary Mutating Functions:
- **File:** `lib/books/bookService.ts`
  - **Line 510-523 (`incrementBookSales`):**
    ```typescript
    export async function incrementBookSales(bookId: string, quantity = 1): Promise<void> {
      try {
        const books = await getAllBooks()
        const bookIndex = books.findIndex((b) => b.id === bookId || b.slug === bookId)
        if (bookIndex >= 0) {
          books[bookIndex].salesCount = (books[bookIndex].salesCount || 0) + Math.max(1, quantity)
          await atomicWriteJson(BOOKS_FILE, books)
          cachedBooks = books
          lastBooksCacheTime = Date.now()
        }
      } catch (err) {
        console.error(`Failed to increment sales count for book ${bookId}:`, err)
      }
    }
    ```
  - **Line 542-585 (`markBookOrderCompleted`):**
    ```typescript
    export async function markBookOrderCompleted({ orderId, razorpayPaymentId, ... }) {
      ...
      // Increment salesCount once for each book in the order
      for (const item of currentOrder.items || []) {
        const bId = item.bookId || item.book?.id
        if (bId) {
          await incrementBookSales(bId, item.quantity || 1)
        }
      }
    }
    ```

---

## 3. Triggering Test Invocations & Measured Impact

The mutation is triggered directly by the backend test suites verifying student library access, authwall DRM gating, and order lifecycle:

1. **`tests/contract-v1.test.ts`:**
   - Creates an order with `bookId: "indian-polity-notes-2026"`.
   - Calls `markBookOrderCompleted`.
   - **Empirical Measured Effect:** Alters the salesCount field, changing the git diff sha from `831ace5a6b69915604b9080681933b40a3e358ac395aa16aaf2a27c0e4a82d39` to `9e1158037c970777e4b81305817055fee34bc6adc224b3f69d6b078cf4679f71`.

2. **`tests/api-v1-security-parity.test.ts`:**
   - Creates an order with `bookId: "indian-polity-notes-2026"`.
   - Calls `markBookOrderCompleted`.
   - **Empirical Measured Effect:** Alters the salesCount field, changing the git diff sha from `9e1158037c970777e4b81305817055fee34bc6adc224b3f69d6b078cf4679f71` to `f13366c1545b4ee78dc65408e40d039973fa3899416d53bc2bd33c24297fce5a`.

3. **`tests/api-v1-authwall-security.test.ts`:**
   - Creates an order with `bookId: "bpsc-72nd-prelims-current-affairs"`.
   - Calls `markBookOrderCompleted`.
   - **Empirical Measured Effect:** Increments sales count in `data/books.json` upon execution.

---

## 4. Architectural Root Cause & Recommended Fix

### Root Cause:
`lib/books/bookService.ts` persists application state directly to static JSON files in the source tree (`data/books.json`, `data/book-orders.json`, `data/book-wishlist.json`) using `atomicWriteJson`. In a modern Next.js/serverless architecture, static repository files should never serve as runtime write destinations. Tests running against this code write to the repository working directory instead of an isolated database.

### Recommended Fix:
1. **Mock / Isolate in Tests:**
   In backend test suites, stub or mock `atomicWriteJson` or configure a temporary sandbox directory when `APP_ENV=test` or `NODE_ENV=test`, preventing any writes to the repository `data/` directory.
2. **Long-Term Architecture:**
   Migrate bookstore persistence from local filesystem JSON files to relational PostgreSQL / Prisma tables (`Book`, `BookOrder`), consistent with the rest of the application (Courses, Exams, Subscriptions).
