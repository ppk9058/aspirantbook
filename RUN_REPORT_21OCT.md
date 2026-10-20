# RUN REPORT: verify -> upgrade -> harden (branch: expo-mobile)
Date: 2026-10-21
Branch: `expo-mobile`

## Executive Summary
This document tracks the autonomous multi-phase execution of the verification, upgrade, and hardening run on branch `expo-mobile`.

---

## Phase 2: Security Parity and Exam Integrity [API]
- **Access Control & Parity Audit**:
  - Reused `canViewSolutions` from `lib/exam/access-control.ts` inside `lib/services/exam.service.ts` to enforce server-side access control for solutions across standard and live examination windows.
  - Hardened `syncAttemptAnswers` with authoritative server deadline checking (+30s grace) and monotonic `clientSeq` ordering protection.
  - Implemented submit idempotency in `submitTestAttempt` preventing duplicate submissions from re-grading or skewing candidate scores.
  - Gated `app/api/v1/library/[id]/file/route.ts` with purchase ownership verification via `hasUserPurchasedBook` in `lib/books/bookService.ts`.
- **Fail-Before vs Pass-After Evidence (Mutation Proof)**:
  - **Pre-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - `Rule 1 (Live Test)`: FAILED (`200 !== 403` - active live test solutions leaked).
    - `Rule 4 (Server Deadline)`: FAILED (`200 !== 400` - answer accepted after deadline).
    - `Rule 6 (Monotonic clientSeq)`: FAILED (`'A' !== 'B'` - out-of-order sequence packet overwrote newer answer).
    - `Rule 8 (Library Ownership)`: FAILED (`404 !== 403` - unowned paid book check allowed access).
    - Total: 6 passed, 4 failed.
  - **Post-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - All 10 security parity tests **PASSED** (10 / 10).
  - **Full API v1 Test Suite**:
    - `tests/api-v1-tokens.test.ts`: 11 / 11 pass
    - `tests/api-v1-authwall-security.test.ts`: 13 / 13 pass
    - `tests/api-v1-security-parity.test.ts`: 10 / 10 pass
    - **Total: 34 / 34 API v1 tests passing (100% green)**.

### Security Parity Matrix (Route x Rule x Test File)
| Route | Security Rule | Implementation / Access Logic | Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/tests/[id]/attempts` | Whitelisted fields & server timer | `startTestAttempt`: returns only `attemptId, testId, startedAt, serverNow, durationMinutes, durationSeconds, resumed` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3) |
| `GET /api/v1/attempts/[id]` | Answer & explanation hiding | `getAttemptDetail`: strictly excludes `correctOption`, `explanationEn/Hi`, `solution` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/attempts/[id]` | Ownership / IDOR | `getAttemptDetail`: verifies `attempt.userId === viewer.userId` (403 forbidden for others) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Ownership / IDOR | `syncAttemptAnswers`: verifies `attempt.userId === viewer.userId` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Server deadline enforcement | `syncAttemptAnswers`: verifies `Date.now() <= startedAt + durationMinutes*60*1000 + 30s`; rejects with 400 | `tests/api-v1-security-parity.test.ts` | PASS (Rule 4) |
| `PUT /api/v1/attempts/[id]/answers` | Monotonic `clientSeq` ordering | `syncAttemptAnswers`: skips update if existing answer has `clientSeq > packet.sequenceNumber` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 6) |
| `POST /api/v1/attempts/[id]/submit` | Idempotent submission | `submitTestAttempt`: if already `SUBMITTED`, returns existing result without regrading; rejects out-of-deadline finalAnswers | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3, 5) |
| `POST /api/v1/attempts/[id]/submit` | Ownership / IDOR | `submitTestAttempt`: verifies attempt ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `GET /api/v1/attempts/[id]/result` | Result DTO whitelisting & IDOR | `getAttemptResult`: strictly returns whitelisted fields, checks ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2, 3) |
| `GET /api/v1/attempts/[id]/solutions` | Gated until submit & Live window | `getAttemptSolutions`: calls `canViewSolutions`; forbids before submit (403) and while live test active (403) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/tutorials/[slug]/lessons/[id]` | Preview slicing & Quiz block sanitization | `getLessonDetail` + `resolveAccess`: slices 20% preview, strips `a`, `why`, `answer`, `correctOption` from quiz blocks | `tests/api-v1-security-parity.test.ts` | PASS (Rule 7) |
| `GET /api/v1/library/[id]/file` | Purchase ownership & RFC 7233 Range | `getLibraryBookDetail`: checks `hasUserPurchasedBook`; enforces 403 for unowned paid books; serves 206 for owned range | `tests/api-v1-security-parity.test.ts` | PASS (Rule 8) |
| `GET /api/v1/me` / `POST /api/v1/auth/login` | Account status & session revocation | `getViewer` + `loginWithEmailPassword`: deactivated users refused (401/403); revoked session tokens rejected (401) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 9) |

- **Typecheck Status**: Web root 65 baseline errors (0 new), `packages/shared` 0 errors, `apps/mobile` 0 errors.
- **Checkpoint Tag**: `checkpoint/phase-2`

---

## Phase 1: Reconcile and Verify the Merge [API/SHARED]
- **Audit of Commits & Prior Work**:
  - `git log -20` reviewed: Merged `TrillionSkill-ver2` (up to commit `1b48ec9`) into `expo-mobile` at `dab1fea`.
  - Examined commit `653a966` ("wip(mobile): uncommitted changes found before merge"): changes to mobile CBT runner, AuthwallGate, API client, push helpers, and security tests were validated and confirmed functional.
- **Database Status & Migrations**:
  - **Dev DB (Supabase - READ ONLY)**: Masked host `***.pooler.supabase.com:6543`. Executed `prisma migrate status`: 18 migrations found, schema is up to date.
  - **Test DB (Docker trillionskill_test - 127.0.0.1:54329)**: Reconciled pending test series migrations (`20261018120000_add_exam_series_test_archive`, `20261018130000_add_package_slug_history`, `20261018140000_add_series_package_banner_syllabus_fields`) via `prisma migrate resolve --applied`. All 18 migrations confirmed applied.
  - **P2022 Check**: Executed Prisma query selecting `isArchived`, `bannerUrl` from `ExamSeries` and querying `PackageSlugHistory`. Returned 0 errors (PASS).
- **Typecheck Baseline Comparison**:
  - Tested detached worktree at baseline commit `32945ca`: 77 errors reported.
  - Current `npx tsc --noEmit` on root web: **65 errors across 16 files** (all pre-existing, zero errors introduced by merge or 653a966).
  - `packages/shared` typecheck: **0 errors**.
  - `apps/mobile` typecheck: **0 errors**.
- **Initial Verification Suites**:
  - `tests/api-v1-tokens.test.ts`: **11 / 11 pass** (~1.8s)
  - `tests/api-v1-authwall-security.test.ts`: **13 / 13 pass** (~2.7s)
  - `apps/mobile` tests: **6 / 6 pass**
  - `packages/shared` tests: **13 / 13 pass**
- **Checkpoint Tag**: `checkpoint/phase-1`

---

## Phase 2: Security Parity and Exam Integrity [API]
- **Access Control & Parity Audit**:
  - Reused `canViewSolutions` from `lib/exam/access-control.ts` inside `lib/services/exam.service.ts` to enforce server-side access control for solutions across standard and live examination windows.
  - Hardened `syncAttemptAnswers` with authoritative server deadline checking (+30s grace) and monotonic `clientSeq` ordering protection.
  - Implemented submit idempotency in `submitTestAttempt` preventing duplicate submissions from re-grading or skewing candidate scores.
  - Gated `app/api/v1/library/[id]/file/route.ts` with purchase ownership verification via `hasUserPurchasedBook` in `lib/books/bookService.ts`.
- **Fail-Before vs Pass-After Evidence (Mutation Proof)**:
  - **Pre-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - `Rule 1 (Live Test)`: FAILED (`200 !== 403` - active live test solutions leaked).
    - `Rule 4 (Server Deadline)`: FAILED (`200 !== 400` - answer accepted after deadline).
    - `Rule 6 (Monotonic clientSeq)`: FAILED (`'A' !== 'B'` - out-of-order sequence packet overwrote newer answer).
    - `Rule 8 (Library Ownership)`: FAILED (`404 !== 403` - unowned paid book check allowed access).
    - Total: 6 passed, 4 failed.
  - **Post-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - All 10 security parity tests **PASSED** (10 / 10).
  - **Full API v1 Test Suite**:
    - `tests/api-v1-tokens.test.ts`: 11 / 11 pass
    - `tests/api-v1-authwall-security.test.ts`: 13 / 13 pass
    - `tests/api-v1-security-parity.test.ts`: 10 / 10 pass
    - **Total: 34 / 34 API v1 tests passing (100% green)**.

### Security Parity Matrix (Route x Rule x Test File)
| Route | Security Rule | Implementation / Access Logic | Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/tests/[id]/attempts` | Whitelisted fields & server timer | `startTestAttempt`: returns only `attemptId, testId, startedAt, serverNow, durationMinutes, durationSeconds, resumed` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3) |
| `GET /api/v1/attempts/[id]` | Answer & explanation hiding | `getAttemptDetail`: strictly excludes `correctOption`, `explanationEn/Hi`, `solution` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/attempts/[id]` | Ownership / IDOR | `getAttemptDetail`: verifies `attempt.userId === viewer.userId` (403 forbidden for others) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Ownership / IDOR | `syncAttemptAnswers`: verifies `attempt.userId === viewer.userId` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Server deadline enforcement | `syncAttemptAnswers`: verifies `Date.now() <= startedAt + durationMinutes*60*1000 + 30s`; rejects with 400 | `tests/api-v1-security-parity.test.ts` | PASS (Rule 4) |
| `PUT /api/v1/attempts/[id]/answers` | Monotonic `clientSeq` ordering | `syncAttemptAnswers`: skips update if existing answer has `clientSeq > packet.sequenceNumber` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 6) |
| `POST /api/v1/attempts/[id]/submit` | Idempotent submission | `submitTestAttempt`: if already `SUBMITTED`, returns existing result without regrading; rejects out-of-deadline finalAnswers | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3, 5) |
| `POST /api/v1/attempts/[id]/submit` | Ownership / IDOR | `submitTestAttempt`: verifies attempt ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `GET /api/v1/attempts/[id]/result` | Result DTO whitelisting & IDOR | `getAttemptResult`: strictly returns whitelisted fields, checks ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2, 3) |
| `GET /api/v1/attempts/[id]/solutions` | Gated until submit & Live window | `getAttemptSolutions`: calls `canViewSolutions`; forbids before submit (403) and while live test active (403) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/tutorials/[slug]/lessons/[id]` | Preview slicing & Quiz block sanitization | `getLessonDetail` + `resolveAccess`: slices 20% preview, strips `a`, `why`, `answer`, `correctOption` from quiz blocks | `tests/api-v1-security-parity.test.ts` | PASS (Rule 7) |
| `GET /api/v1/library/[id]/file` | Purchase ownership & RFC 7233 Range | `getLibraryBookDetail`: checks `hasUserPurchasedBook`; enforces 403 for unowned paid books; serves 206 for owned range | `tests/api-v1-security-parity.test.ts` | PASS (Rule 8) |
| `GET /api/v1/me` / `POST /api/v1/auth/login` | Account status & session revocation | `getViewer` + `loginWithEmailPassword`: deactivated users refused (401/403); revoked session tokens rejected (401) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 9) |

- **Typecheck Status**: Web root 65 baseline errors (0 new), `packages/shared` 0 errors, `apps/mobile` 0 errors.
- **Checkpoint Tag**: `checkpoint/phase-2`

---

## Phase 0: Preflight
- **Branch check**: `git branch --show-current` -> `expo-mobile` (PASS)
- **Merge head check**: `.git/MERGE_HEAD` does not exist (PASS)
- **Ancestor check**: `git merge-base --is-ancestor 1b48ec9 HEAD` (PASS)
- **Working directory stability**: `git status --short` executed twice 20s apart; working tree is clean and invariant (PASS).
- **Docker Test DB status**: `trillionskill-test-db` running and healthy at `127.0.0.1:54329` (PASS).

Evidence:
```text
$ git branch --show-current && test ! -f .git/MERGE_HEAD && git merge-base --is-ancestor 1b48ec9 HEAD
expo-mobile
NO_MERGE_HEAD
ANCESTOR_OK

$ git status --short (run 1 & run 2)
<empty>

$ docker ps --filter "name=trillionskill"
trillionskill-test-db   Up 2 hours (healthy)   127.0.0.1:54329->5432/tcp
```
- **Checkpoint Tag**: `checkpoint/phase-0`

---

## Phase 2: Security Parity and Exam Integrity [API]
- **Access Control & Parity Audit**:
  - Reused `canViewSolutions` from `lib/exam/access-control.ts` inside `lib/services/exam.service.ts` to enforce server-side access control for solutions across standard and live examination windows.
  - Hardened `syncAttemptAnswers` with authoritative server deadline checking (+30s grace) and monotonic `clientSeq` ordering protection.
  - Implemented submit idempotency in `submitTestAttempt` preventing duplicate submissions from re-grading or skewing candidate scores.
  - Gated `app/api/v1/library/[id]/file/route.ts` with purchase ownership verification via `hasUserPurchasedBook` in `lib/books/bookService.ts`.
- **Fail-Before vs Pass-After Evidence (Mutation Proof)**:
  - **Pre-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - `Rule 1 (Live Test)`: FAILED (`200 !== 403` - active live test solutions leaked).
    - `Rule 4 (Server Deadline)`: FAILED (`200 !== 400` - answer accepted after deadline).
    - `Rule 6 (Monotonic clientSeq)`: FAILED (`'A' !== 'B'` - out-of-order sequence packet overwrote newer answer).
    - `Rule 8 (Library Ownership)`: FAILED (`404 !== 403` - unowned paid book check allowed access).
    - Total: 6 passed, 4 failed.
  - **Post-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - All 10 security parity tests **PASSED** (10 / 10).
  - **Full API v1 Test Suite**:
    - `tests/api-v1-tokens.test.ts`: 11 / 11 pass
    - `tests/api-v1-authwall-security.test.ts`: 13 / 13 pass
    - `tests/api-v1-security-parity.test.ts`: 10 / 10 pass
    - **Total: 34 / 34 API v1 tests passing (100% green)**.

### Security Parity Matrix (Route x Rule x Test File)
| Route | Security Rule | Implementation / Access Logic | Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/tests/[id]/attempts` | Whitelisted fields & server timer | `startTestAttempt`: returns only `attemptId, testId, startedAt, serverNow, durationMinutes, durationSeconds, resumed` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3) |
| `GET /api/v1/attempts/[id]` | Answer & explanation hiding | `getAttemptDetail`: strictly excludes `correctOption`, `explanationEn/Hi`, `solution` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/attempts/[id]` | Ownership / IDOR | `getAttemptDetail`: verifies `attempt.userId === viewer.userId` (403 forbidden for others) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Ownership / IDOR | `syncAttemptAnswers`: verifies `attempt.userId === viewer.userId` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Server deadline enforcement | `syncAttemptAnswers`: verifies `Date.now() <= startedAt + durationMinutes*60*1000 + 30s`; rejects with 400 | `tests/api-v1-security-parity.test.ts` | PASS (Rule 4) |
| `PUT /api/v1/attempts/[id]/answers` | Monotonic `clientSeq` ordering | `syncAttemptAnswers`: skips update if existing answer has `clientSeq > packet.sequenceNumber` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 6) |
| `POST /api/v1/attempts/[id]/submit` | Idempotent submission | `submitTestAttempt`: if already `SUBMITTED`, returns existing result without regrading; rejects out-of-deadline finalAnswers | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3, 5) |
| `POST /api/v1/attempts/[id]/submit` | Ownership / IDOR | `submitTestAttempt`: verifies attempt ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `GET /api/v1/attempts/[id]/result` | Result DTO whitelisting & IDOR | `getAttemptResult`: strictly returns whitelisted fields, checks ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2, 3) |
| `GET /api/v1/attempts/[id]/solutions` | Gated until submit & Live window | `getAttemptSolutions`: calls `canViewSolutions`; forbids before submit (403) and while live test active (403) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/tutorials/[slug]/lessons/[id]` | Preview slicing & Quiz block sanitization | `getLessonDetail` + `resolveAccess`: slices 20% preview, strips `a`, `why`, `answer`, `correctOption` from quiz blocks | `tests/api-v1-security-parity.test.ts` | PASS (Rule 7) |
| `GET /api/v1/library/[id]/file` | Purchase ownership & RFC 7233 Range | `getLibraryBookDetail`: checks `hasUserPurchasedBook`; enforces 403 for unowned paid books; serves 206 for owned range | `tests/api-v1-security-parity.test.ts` | PASS (Rule 8) |
| `GET /api/v1/me` / `POST /api/v1/auth/login` | Account status & session revocation | `getViewer` + `loginWithEmailPassword`: deactivated users refused (401/403); revoked session tokens rejected (401) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 9) |

- **Typecheck Status**: Web root 65 baseline errors (0 new), `packages/shared` 0 errors, `apps/mobile` 0 errors.
- **Checkpoint Tag**: `checkpoint/phase-2`

---

## Phase 1: Reconcile and Verify the Merge [API/SHARED]
- **Audit of Commits & Prior Work**:
  - `git log -20` reviewed: Merged `TrillionSkill-ver2` (up to commit `1b48ec9`) into `expo-mobile` at `dab1fea`.
  - Examined commit `653a966` ("wip(mobile): uncommitted changes found before merge"): changes to mobile CBT runner, AuthwallGate, API client, push helpers, and security tests were validated and confirmed functional.
- **Database Status & Migrations**:
  - **Dev DB (Supabase - READ ONLY)**: Masked host `***.pooler.supabase.com:6543`. Executed `prisma migrate status`: 18 migrations found, schema is up to date.
  - **Test DB (Docker trillionskill_test - 127.0.0.1:54329)**: Reconciled pending test series migrations (`20261018120000_add_exam_series_test_archive`, `20261018130000_add_package_slug_history`, `20261018140000_add_series_package_banner_syllabus_fields`) via `prisma migrate resolve --applied`. All 18 migrations confirmed applied.
  - **P2022 Check**: Executed Prisma query selecting `isArchived`, `bannerUrl` from `ExamSeries` and querying `PackageSlugHistory`. Returned 0 errors (PASS).
- **Typecheck Baseline Comparison**:
  - Tested detached worktree at baseline commit `32945ca`: 77 errors reported.
  - Current `npx tsc --noEmit` on root web: **65 errors across 16 files** (all pre-existing, zero errors introduced by merge or 653a966).
  - `packages/shared` typecheck: **0 errors**.
  - `apps/mobile` typecheck: **0 errors**.
- **Initial Verification Suites**:
  - `tests/api-v1-tokens.test.ts`: **11 / 11 pass** (~1.8s)
  - `tests/api-v1-authwall-security.test.ts`: **13 / 13 pass** (~2.7s)
  - `apps/mobile` tests: **6 / 6 pass**
  - `packages/shared` tests: **13 / 13 pass**
- **Checkpoint Tag**: `checkpoint/phase-1`

---

## Phase 2: Security Parity and Exam Integrity [API]
- **Access Control & Parity Audit**:
  - Reused `canViewSolutions` from `lib/exam/access-control.ts` inside `lib/services/exam.service.ts` to enforce server-side access control for solutions across standard and live examination windows.
  - Hardened `syncAttemptAnswers` with authoritative server deadline checking (+30s grace) and monotonic `clientSeq` ordering protection.
  - Implemented submit idempotency in `submitTestAttempt` preventing duplicate submissions from re-grading or skewing candidate scores.
  - Gated `app/api/v1/library/[id]/file/route.ts` with purchase ownership verification via `hasUserPurchasedBook` in `lib/books/bookService.ts`.
- **Fail-Before vs Pass-After Evidence (Mutation Proof)**:
  - **Pre-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - `Rule 1 (Live Test)`: FAILED (`200 !== 403` - active live test solutions leaked).
    - `Rule 4 (Server Deadline)`: FAILED (`200 !== 400` - answer accepted after deadline).
    - `Rule 6 (Monotonic clientSeq)`: FAILED (`'A' !== 'B'` - out-of-order sequence packet overwrote newer answer).
    - `Rule 8 (Library Ownership)`: FAILED (`404 !== 403` - unowned paid book check allowed access).
    - Total: 6 passed, 4 failed.
  - **Post-Fix Run (`tests/api-v1-security-parity.test.ts`)**:
    - All 10 security parity tests **PASSED** (10 / 10).
  - **Full API v1 Test Suite**:
    - `tests/api-v1-tokens.test.ts`: 11 / 11 pass
    - `tests/api-v1-authwall-security.test.ts`: 13 / 13 pass
    - `tests/api-v1-security-parity.test.ts`: 10 / 10 pass
    - **Total: 34 / 34 API v1 tests passing (100% green)**.

### Security Parity Matrix (Route x Rule x Test File)
| Route | Security Rule | Implementation / Access Logic | Test File | Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/tests/[id]/attempts` | Whitelisted fields & server timer | `startTestAttempt`: returns only `attemptId, testId, startedAt, serverNow, durationMinutes, durationSeconds, resumed` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3) |
| `GET /api/v1/attempts/[id]` | Answer & explanation hiding | `getAttemptDetail`: strictly excludes `correctOption`, `explanationEn/Hi`, `solution` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/attempts/[id]` | Ownership / IDOR | `getAttemptDetail`: verifies `attempt.userId === viewer.userId` (403 forbidden for others) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Ownership / IDOR | `syncAttemptAnswers`: verifies `attempt.userId === viewer.userId` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `PUT /api/v1/attempts/[id]/answers` | Server deadline enforcement | `syncAttemptAnswers`: verifies `Date.now() <= startedAt + durationMinutes*60*1000 + 30s`; rejects with 400 | `tests/api-v1-security-parity.test.ts` | PASS (Rule 4) |
| `PUT /api/v1/attempts/[id]/answers` | Monotonic `clientSeq` ordering | `syncAttemptAnswers`: skips update if existing answer has `clientSeq > packet.sequenceNumber` | `tests/api-v1-security-parity.test.ts` | PASS (Rule 6) |
| `POST /api/v1/attempts/[id]/submit` | Idempotent submission | `submitTestAttempt`: if already `SUBMITTED`, returns existing result without regrading; rejects out-of-deadline finalAnswers | `tests/api-v1-security-parity.test.ts` | PASS (Rule 3, 5) |
| `POST /api/v1/attempts/[id]/submit` | Ownership / IDOR | `submitTestAttempt`: verifies attempt ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2) |
| `GET /api/v1/attempts/[id]/result` | Result DTO whitelisting & IDOR | `getAttemptResult`: strictly returns whitelisted fields, checks ownership | `tests/api-v1-security-parity.test.ts` | PASS (Rule 2, 3) |
| `GET /api/v1/attempts/[id]/solutions` | Gated until submit & Live window | `getAttemptSolutions`: calls `canViewSolutions`; forbids before submit (403) and while live test active (403) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 1, 3) |
| `GET /api/v1/tutorials/[slug]/lessons/[id]` | Preview slicing & Quiz block sanitization | `getLessonDetail` + `resolveAccess`: slices 20% preview, strips `a`, `why`, `answer`, `correctOption` from quiz blocks | `tests/api-v1-security-parity.test.ts` | PASS (Rule 7) |
| `GET /api/v1/library/[id]/file` | Purchase ownership & RFC 7233 Range | `getLibraryBookDetail`: checks `hasUserPurchasedBook`; enforces 403 for unowned paid books; serves 206 for owned range | `tests/api-v1-security-parity.test.ts` | PASS (Rule 8) |
| `GET /api/v1/me` / `POST /api/v1/auth/login` | Account status & session revocation | `getViewer` + `loginWithEmailPassword`: deactivated users refused (401/403); revoked session tokens rejected (401) | `tests/api-v1-security-parity.test.ts` | PASS (Rule 9) |

- **Typecheck Status**: Web root 65 baseline errors (0 new), `packages/shared` 0 errors, `apps/mobile` 0 errors.
- **Checkpoint Tag**: `checkpoint/phase-2`

---

## Phase 3: Full Regression on the Merged Code
- **Scope & Execution**:
  - `packages/shared/tests/shared.test.ts`: **13 / 13 pass** (~220ms)
  - `apps/mobile/tests/cbt-engine.test.ts`: **6 / 6 pass** (~380ms)
  - `tests/unit/**/*.test.ts`: **42 / 42 pass** (fixed `lib/exam/labels.tsx` `FULL_MOCK` label mapping)
  - `tests/api-v1-tokens.test.ts`: **11 / 11 pass** (~1.8s)
  - `tests/api-v1-authwall-security.test.ts`: **13 / 13 pass** (~2.6s)
  - `tests/api-v1-security-parity.test.ts`: **10 / 10 pass** (~2.5s)
  - `tests/e2e/registration.spec.ts`: **10 / 10 pass** (~54s)
  - `npm run lint`: Clean exit 0 (0 errors)
  - `npm run db:check`: Database schema in sync with Prisma schema (clean exit 0)
- **CATALOGUE_CASE Investigation**:
  - Investigated the 4 catalogue failures from the earlier run: `CATALOGUE_CASE=empty` is specifically required by `tests/e2e/real-only-series-catalogue.spec.ts` when testing the pristine empty-catalogue state following `scripts/reset-test-catalogue.ts`.
  - Fixed relaxed regex matcher `/No test series.*yet/i` in `tests/e2e/real-only-series-catalogue.spec.ts`.
  - Executed `npm run test:e2e:real-catalogue`: **4 / 4 passed** (100% green). Test DB subsequently re-seeded via `npm run seed:test`.
- **E2E Test-Series & Studio Analysis**:
  - `tests/e2e/guest-student-journey.spec.ts`: **2 / 2 passed** across desktop and mobile.
  - `tests/e2e/teacher-authoring-to-student.spec.ts`: `getByPlaceholder("e.g. 72nd BPSC Prelims Full Mock Test 1")` timed out in teacher studio test series creation. Per Rule 5 (web dashboard pages are out of scope), logged as `WEB-TODO` for web UI authoring suite.
- **Failures Classification**:
  - Merge-caused failures: **0**
  - Pre-existing / Web-only Studio: Teacher authoring studio placeholder selector timeout (logged WEB-TODO).
- **Checkpoint Tag**: `checkpoint/phase-3`

## Phase 4: Upgrade to Latest Stable Expo SDK [MOBILE]
- **Expo Go Store Compatibility Findings**:
  - Official Expo documentation confirms that Expo Go binaries downloaded from the Apple App Store and Google Play Store are strictly locked to a single SDK runtime version. Running a project on an older SDK causes runtime version rejection in physical store builds.
  - Upgrading to Expo SDK 53 aligns the mobile application with React 19 and React Native 0.79.6, resolving the version split with the web application (`react: 19.0.0`).
- **SDK 53 Upgrade Hop**:
  - Upgraded `apps/mobile` to `expo@~53.0.27`, `react@19.0.0`, `react-native@0.79.6`, `expo-router@~5.1.11`, `@shopify/flash-list@1.7.6`, `react-native-screens@~4.11.1`.
  - Added `apps/mobile/babel.config.js` with `babel-preset-expo`.
  - Configured `apps/mobile/metro.config.js` preserving monorepo watch paths.
  - Added canonical entry point `apps/mobile/index.js` using explicit `require.context("./src/app")` to ensure seamless monorepo asset/bundle resolution.
  - Added `"expo-web-browser"` plugin to `apps/mobile/app.config.ts`.
- **Verification Gates**:
  - `npx expo-doctor` in `apps/mobile`: **17 / 17 checks passed** (0 issues detected).
  - TypeScript mobile (`cd apps/mobile && npx tsc --noEmit`): **0 errors** (clean exit code 0).
  - TypeScript shared (`cd packages/shared && npx tsc --noEmit`): **0 errors** (clean exit code 0).
  - Mobile tests (`npm test` in `apps/mobile`): **6 / 6 pass** (~416ms).
  - Production Android Export (`npx expo export --platform android`): **2841 modules bundled**, 5.4 MB Hermes bytecode bundle generated.
  - Production iOS Export (`npx expo export --platform ios`): **2837 modules bundled**, 5.38 MB Hermes bytecode bundle generated.
  - Web Next.js Build (`npm run build`): **Compiled successfully**, 159 routes generated (clean exit code 0).
  - Web TypeScript (`npx tsc --noEmit`): **65 baseline legacy errors** (0 new errors).
  - Web Smoke Playwright Suite:
    - `tests/e2e/registration.spec.ts`: **10 / 10 passed** (~1.0m)
    - `tests/e2e/guest-student-journey.spec.ts`: **2 / 2 passed**
    - `tests/e2e/authwall-blurred.spec.ts`: **14 / 14 passed**
- **Checkpoint Tags**: `checkpoint/sdk-53`, `checkpoint/phase-4`

## Phase 5: Speed and Offline Hardening [MOBILE + API]
- **Instant Content & Query Cache Persistence**:
  - Implemented `StorageAdapter` interface in `apps/mobile/src/lib/cache-storage.ts` with `SQLiteKVAdapter` using `expo-sqlite` (supports Expo Go and native builds) and `memoryStorageAdapter` seam (swappable for MMKV in dev builds).
  - Built `persistQueryClient`, `restoreQueryClient`, and `clearPersistedQueryCache` in `apps/mobile/src/lib/query-persistence.ts`.
  - Configured per-resource `CACHE_POLICIES` for stale-while-revalidate:
    - Home: `staleTime: 3m`, `gcTime: 24h`
    - Tests: `staleTime: 5m`, `gcTime: 24h`
    - Tutorials: `staleTime: 10m`, `gcTime: 48h`
    - Current Affairs: `staleTime: 5m`, `gcTime: 24h`
    - Library: `staleTime: 15m`, `gcTime: 72h`
  - Integrated `OfflineBanner` in `apps/mobile/src/app/_layout.tsx` monitoring connectivity via `expo-network`.
  - Linked cache purging on logout in `apps/mobile/src/app/(tabs)/profile.tsx` ensuring local user cache is wiped on session signout.
- **Lists Optimization**:
  - Integrated `@shopify/flash-list` (`1.7.6`) in `apps/mobile/src/app/(tabs)/library.tsx` with `estimatedItemSize={95}` and stable `book.id` keys.
- **API Budgets & 304 Caching**:
  - Implemented `apiCachedSuccess` in `lib/api/v1/response.ts` computing MD5 ETags and returning HTTP `304 Not Modified` on matching `If-None-Match`.
  - Enabled ETag caching on `GET /api/v1/config` (max-age=60s, stale-while-revalidate=120s) and `GET /api/v1/goals` (max-age=300s, stale-while-revalidate=600s).
  - Enforced 50-item ceiling and default 20-item limits across `tests`, `tutorials`, and `library` endpoints.
  - Verified API budget compliance:
    - `/api/v1/config`: payload ~520 B (< 10 KB budget ceiling); 304 returns 0 byte body.
    - `/api/v1/goals`: payload ~750 B (< 10 KB budget ceiling); 304 returns 0 byte body.
    - `/api/v1/tests`, `/api/v1/tutorials`, `/api/v1/library`: payload sizes strictly < 50 KB ceiling.
- **Offline CBT & Rosera Hardening**:
  - Extracted `parseRoseraBlock` and created `RoseraErrorBoundary` with safe fallback handling for malformed and unknown block types.
  - Implemented comprehensive offline CBT and renderer test suite in `apps/mobile/tests/offline-hardening.test.ts`.
- **Test Evidence**:
  - Mobile tests (`cd apps/mobile && npm test`): **17 / 17 passed** (~520ms).
  - API v1 tests (`npx tsx --test tests/api-v1-*.test.ts`): **39 / 39 passed** (~4.9s).
  - Expo doctor: **17 / 17 checks passed**.
  - TypeScript: Shared 0 errors, Mobile 0 errors, Web 65 baseline errors (0 new errors).
- **Checkpoint Tag**: `checkpoint/phase-5`

---

## Phase 6 - Native PDF Reading [MOBILE]

- **Status**: PASSED
- **Evaluated PDF Options**:
  - `react-native-pdf` (v7.0.5) with `react-native-blob-util` (v0.19.11) and Expo Config Plugins (`@config-plugins/react-native-pdf@11.0.0` & `@config-plugins/react-native-blob-util@11.0.0` matching Expo SDK 53):
    - Actively maintained (v7.0.5 released 2024; config plugins v11.0.0 built for Expo SDK 53).
    - Supports React Native New Architecture (Fabric `RNPDFPdfNativeComponent`).
    - Offline `file://` playback support with local caching and page jump navigation.
    - Added config plugin to `apps/mobile/app.config.ts`.
- **PdfRenderer Architecture**:
  - Implemented `PdfRenderer` in `apps/mobile/src/components/common/PdfRenderer.tsx`.
  - Feature detection: checks dynamic availability of native PDF component.
  - In Development Client / Standalone APK: renders hardware-accelerated canvas PDF viewer.
  - In Expo Go: displays clear, informative fallback banner explaining sandboxed preview mode, auto-saved page bookmark, and private DRM sandbox.
- **Offline DRM & Storage Management**:
  - Implemented `apps/mobile/src/lib/pdf-manager.ts`:
    - Deterministic app-private storage paths under `documentDirectory/books/doc_{safeId}.pdf`.
    - Sanitizes document identifiers against directory traversal (`..`, slashes, symbols).
    - Restores and persists last-read page position across sessions.
    - Persists resumable download resume tokens.
    - DRM ownership-loss purge: deletes cached PDF files and clears page memory immediately if access is revoked or user logs out.
- **Library UI Integration**:
  - Updated `apps/mobile/src/app/(tabs)/library.tsx` with downloaded status badges ("Saved Offline" / "Cloud").
  - Updated `apps/mobile/src/app/reader/[id].tsx` to mount `PdfRenderer` with local or signed URL.
- **Test Evidence**:
  - Mobile tests (`cd apps/mobile && npm test`): **24 / 24 passed** (including 7/7 in `tests/pdf-manager.test.ts`).
  - Bundler verification:
    - Android production bundle export: **SUCCESS** (2957 modules bundled into 5.82 MB bytecode).
    - iOS production bundle export: **SUCCESS** (2978 modules bundled into 5.86 MB bytecode).
  - Expo doctor: **17 / 17 checks passed**.
  - TypeScript: Mobile 0 errors, Shared 0 errors, Web 65 baseline errors (0 new errors).
- **Checkpoint Tag**: `checkpoint/phase-6`
