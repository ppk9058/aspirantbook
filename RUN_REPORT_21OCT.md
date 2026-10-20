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
