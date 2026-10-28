# Open Issues & Future Hardening Roadmap

This document catalogs technical debt, edge cases, follow-up items for mobile clients, and future AI translation integration requirements identified during the `perf/exam-runtime-v2` hardening cycle.

---

## 1. Mobile App Follow-Up Work

1. **Client-Side Debouncing for Answer Autosave**:
   - `apps/mobile/src/lib/cbt-sync.ts`: `saveAnswer()` triggers `void this.flush(attemptId)` immediately on every option tap. While the server-side rate limit permits 60 syncs/min (`EXAM_RATE_LIMIT_CONFIG.sync`), rapid tapping by anxious students could trigger 429 errors.
   - **Recommended change**: Add client-side 1500–2000 ms debounce before invoking `flush()` during live exams, matching the web client's debounce in `AttemptClient.tsx:750`.
2. **Handling 429 Response in Mobile Sync Driver**:
   - `cbt-sync.ts:602` captures sync error messages as generic strings.
   - **Recommended change**: Explicitly parse the `Retry-After` header on 429 status codes and schedule the next sync retry accordingly instead of retrying immediately upon reconnection.

---

## 2. Edge Cases & Technical Debt

1. **Distributed LRU Cache Divergence under High-Frequency Question Edits**:
   - While `getExamQuestionsVersion()` provides database-level version checking on LRU cache access, in-memory caches across distinct container instances can serve cached questions for up to the configured stale window (`EXAM_CACHE_STALE_WINDOW_MS = 60000`) if database version checks are throttled.
   - **Recommended change**: When multi-container deployments exceed 10 instances, consider Redis Pub/Sub for real-time inter-instance invalidation broadcasts.
2. **Live Test Series Entitlements Caching**:
   - `checkTestAccess()` currently queries PostgreSQL synchronously on every `/api/exam/attempt/start` request. Under thousands of concurrent students attempting a live exam within the first 60 seconds (thundering herd), this creates an entitlement read surge.
   - **Recommended change**: Cache active user subscriptions in Redis with a 5-minute TTL to offload the entitlement check.

---

## 3. AI Translation Integration Requirements

1. **Batch Translation Approval Hook**:
   - When the AI layer (`feat/ai-layer`) approves new Hindi translations for question batches (`ExamQuestion.questionHi`, `optionAHi`, etc.), it must call the exported canonical cache invalidation hook:
     ```ts
     import { onAiQuestionTranslationBatchApproved } from "@/lib/exam-runtime/cache-invalidation";

     await onAiQuestionTranslationBatchApproved(testId, questionIds.length);
     ```
   - For full architectural instructions and code references, refer to [`docs/perf/ai-integration-note.md`](./ai-integration-note.md).
2. **Translation Fallback Behavior**:
   - If a student requests Hindi for an exam where only partial questions have approved translations, the system falls back to English for untranslated questions (`questionHi || questionEn`). Ensure client-side localization notices inform the student when partial translation is detected.
