# Investigation Report: Root Cause of `data/books.json` Modification

**Date:** Thu Oct 22 06:40:00 IST 2026  
**Investigator:** Remediation Run 3 Agent  
**Target File:** `data/books.json` (Read-Only Investigation; no changes made to target file)

---

## 1. Summary of Evidence & Checksums

- **T0 Start git diff SHA256:** `4d2a7d4c97994582f5e039b26a3035f74801e0037ef1d5519e566929cf88bd18` (Recorded at Thu Oct 22 05:24:13 IST 2026)
- **Current git diff SHA256:** `29a98398e4830ed218c8b11a659dfec9b852775899bf592fcbb1657e4000f71a` (Recorded at Thu Oct 22 06:37:57 IST 2026)
- **Working Tree Status:** `data/books.json` has remained modified without ever being staged or committed.

---

## 2. Raw `git diff data/books.json`

```diff
diff --git a/data/books.json b/data/books.json
index ba7f8bb..1ab6292 100644
--- a/data/books.json
+++ b/data/books.json
@@ -6998,7 +6998,7 @@
     "deliveryNote": "Digital PDF only. Instant online access, no physical copy, no shipping.",
     "status": "published",
     "fileSizeMb": 28.1,
-    "salesCount": 336,
+    "salesCount": 345,
     "createdAt": "2026-09-01T00:00:00.000Z",
     "updatedAt": "2026-10-13T13:57:53.172Z"
   },
@@ -7198,7 +7198,7 @@
     "deliveryNote": "Digital PDF only. Instant online access, no physical copy, no shipping.",
     "status": "published",
     "fileSizeMb": 29.7,
-    "salesCount": 648,
+    "salesCount": 661,
     "createdAt": "2026-09-01T00:00:00.000Z",
     "updatedAt": "2026-10-13T13:57:53.172Z"
   },
```

---

## 3. Code Path & Writing Mechanism

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

## 4. Triggering Test Invocations

The mutation is triggered directly by the backend test suites verifying student library access, authwall DRM gating, and order lifecycle:

1. **`tests/api-v1-authwall-security.test.ts` (lines 89-110):**
   - Creates an order with `bookId: "bpsc-72nd-prelims-current-affairs"`.
   - Calls `await markBookOrderCompleted({ orderId: sampleOrd.id, razorpayPaymentId: "pay_sample_123" });`.
   - **Result:** Increments `salesCount` of `bpsc-72nd-prelims-current-affairs` (line 6998 of `data/books.json`) by 1 per suite run.

2. **`tests/api-v1-security-parity.test.ts` (lines 643-669):**
   - Creates an order with `bookId: "indian-polity-notes-2026"`.
   - Calls `await markBookOrderCompleted({ orderId: ordId, razorpayPaymentId: "pay_sec_123" });`.
   - **Result:** Increments `salesCount` of `indian-polity-notes-2026` (line 7198 of `data/books.json`) by 1 per suite run.

3. **`tests/contract-v1.test.ts` (lines 634-660):**
   - Creates an order with `bookId: "indian-polity-notes-2026"`.
   - Calls `await markBookOrderCompleted({ orderId: ordId, razorpayPaymentId: "pay_test_contract_123" });`.
   - **Result:** Increments `salesCount` of `indian-polity-notes-2026` (line 7198 of `data/books.json`) by 1 per suite run.

Every single run of the 120-test backend suite (`tests/api-v1-*.test.ts tests/contract-v1.test.ts`) increments `bpsc-72nd-prelims-current-affairs` by +1 and `indian-polity-notes-2026` by +2. Over repeated test runs during dev and parity verification, the sales counts mutated from 336 to 345 (+9) and 648 to 661 (+13), modifying `data/books.json` in the working tree.

---

## 5. Architectural Root Cause & Recommended Fix

### Root Cause:
`lib/books/bookService.ts` persists application state directly to static JSON files in the source tree (`data/books.json`, `data/book-orders.json`, `data/book-wishlist.json`) using `atomicWriteJson`. In a modern Next.js/serverless architecture, static repository files should never serve as runtime write destinations. Tests running against this code write to the repository working directory instead of an isolated database.

### Recommended Fix (Text Only - Rule R3 Preserved):
1. **Mock / Isolate in Tests:**
   In backend test suites, stub or mock `atomicWriteJson` or configure a temporary sandbox directory (e.g. `tmpdir()/books.json`) when `APP_ENV=test` or `NODE_ENV=test`, preventing any writes to the repository `data/` directory.
2. **Long-Term Architecture:**
   Migrate bookstore persistence from local filesystem JSON files to relational PostgreSQL / Prisma tables (`Book`, `BookOrder`), consistent with the rest of the application (Courses, Exams, Subscriptions).
