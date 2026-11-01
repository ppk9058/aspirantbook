# Google Play Data Safety — DRAFT FOR OWNER REVIEW

**Status: DRAFT. Not submitted to Google Play.** The owner must verify this against the production build, backend configuration, privacy policy, retention schedule, and current Google Play data-safety definitions. This document uses code field names only and contains no real user data.

## Collection and processing inventory

| Code fields / records | Purpose | Storage identified in code | Deletion / retention path |
|---|---|---|---|
| `name`, `email`, `password` (server-side hash), optional `phoneNumber` | Account registration, login, password/OTP recovery, account communication | Backend `User` record; access/refresh tokens and cached user profile on device under `ab_access_token`, `ab_refresh_token`, `ab_user_profile` | Local credentials/profile are cleared on logout and successful direct deletion. Direct account deletion anonymizes `email`, `name`, `phoneNumber`, `image`, and `password`, deactivates `isActive`, and revokes sessions. Settings can instead submit an authenticated deletion request for administrative processing. |
| `selectedGoal`, `selectedSubGoal`, mobile goal key `trillion_selected_goal` | Personalize courses, tests, home content, and recommendations | Backend `User`; mobile secure storage abstraction | Owner to confirm whether goal fields are anonymized or retained as non-identifying preferences after account deletion. Local values are subject to auth-storage clearing. |
| `image` | Optional profile avatar | Backend `User.image`; referenced uploaded asset | Direct mobile/API deletion sets `image` to null. Owner must confirm deletion of the referenced stored asset in every deletion path. |
| `consent` | Records that the registrant affirmed age/terms/privacy consent during registration | Validated during registration; owner to confirm whether a durable consent timestamp/version is stored | Owner/legal review required for consent-record retention. |
| `deviceName`, `platform`, `appVersion`, `ip`, `userAgent`, session expiry/revocation timestamps | Device sessions, refresh-token rotation, session revocation, account security | Backend `DeviceSession`; only token hashes are shown in the schema | Active sessions are revoked during account deletion; session rows and security logs require owner-defined retention. |
| Expo push `token`, `platform`, `deviceModel`, `appVersion` | Deliver opted-in push notifications and manage registered devices | Backend `DevicePushToken`; Expo notification service receives the push token for delivery | Unregister endpoint deletes a token owned by the authenticated user; direct account deletion deletes the user's push-token rows. |
| `ExamAttempt`: `language`, `status`, `score`, `totalMarks`, `correctCount`, `wrongCount`, `skippedCount`, `markedCount`, `timeTakenSecs`, `percentile`, `allIndiaRank`, `tabSwitchCount`, start/submit timestamps | Deliver tests, autosave/resume, scoring, results, rankings, and anti-interruption accounting | Backend `ExamAttempt`; offline answer/sync data may be held in mobile SQLite before synchronization | Code comments state exam attempts remain linked to the anonymized user id for historical/statutory purposes. Owner must confirm retention and Play disclosure. |
| `ExamAttemptAnswer`: `questionId`, `selectedOption`, `isMarked`, `isCorrect`, `marksAwarded`, `timeSpentSecs`, `clientSeq` | Exam answers, autosave, grading, review, and analytics | Backend `ExamAttemptAnswer`; mobile SQLite CBT sync queue for offline operation | Anonymized exam answers may be retained for analytics under the deletion procedure. Owner must confirm the production retention period. |
| `Enrollment`, `completedAt`, course `Progress`, `xp`, `level`, `streak`, `lastActive` | Entitlements, learning progress, dashboard, streaks, and learner experience | Backend relational records and profile fields | Owner must verify which learning records are erased, anonymized, or retained after each deletion path. |
| Payment/order/subscription identifiers and transaction history | Purchases, entitlement verification, receipts, statutory accounting | Backend payment/subscription records; displayed through the purchases API | Direct account-deletion code explicitly retains financial/payment/order records linked to the anonymized user id. Payment processor retention and Play disclosure require owner confirmation. |
| Public cached query data under `ab_tanstack_query_cache_v1`; cache DB `aspirantbook_cache.db` | Offline/responsive display of public read queries | Mobile SQLite key-value cache; sensitive query keys `attempt`, `activeExam`, `answers`, and `userPrivate` are excluded from persistence | `clearPersistedQueryCache` removes persisted cache and clears in-memory queries on logout/deletion flows that call it. |
| `reason` and deletion-request status/timestamps | Process and track account/data-deletion requests | Backend `DataDeletionRequest` and audit records | Processed according to the deletion/retention procedure; legal/audit retention requires owner confirmation. |

## Mobile storage mechanisms

- Authentication tokens, cached user profile, selected goal, theme, and content language use the abstraction in `apps/mobile/src/lib/storage.ts`, backed by Expo SecureStore on native devices when available, with localStorage/in-memory fallbacks for web/test environments.
- Public TanStack Query persistence uses `aspirantbook_cache.db` through `apps/mobile/src/lib/cache-storage.ts`; sensitive exam/private query keys are excluded in `query-persistence.ts`.
- Offline CBT synchronization uses SQLite in `apps/mobile/src/lib/cbt-sync.ts`.
- Backend profile, session, device, exam, and payment records use the Prisma models in `prisma/schema.prisma`.

## Account and data deletion paths

- **Public account-deletion URL:** `https://aspirantbook.com/data-deletion`, returned by `getPublicDeletionUrl` in `apps/mobile/src/lib/data-deletion.ts` and linked from mobile Settings.
- **Settings request path:** authenticated `POST /api/v1/data-deletion`; status is read through `GET /api/v1/data-deletion`.
- **Profile direct path:** `api.deleteMe({})` calls the account API. The service revokes sessions, deletes push tokens/OAuth links, anonymizes profile credentials, and deactivates the account. Re-authentication requirements are enforced by the API/service.
- **Owner action required:** reconcile and verify the Settings queue-backed flow and Profile direct-deletion flow before publishing the form. State exactly which path production exposes and how retained exam/payment/audit records are disclosed.

## Draft Play-form guidance

Owner to decide each Google Play category based on the actual production behavior. At minimum review disclosure for name, email, phone number, profile image, authentication credentials, precise/coarse network identifiers if applicable, device or other IDs, push token, app interactions, exam/learning activity, crash/diagnostic data if enabled, and purchase history. Do not mark data as encrypted, shared, optional, or deletable without verifying the deployed implementation and vendor configuration.
