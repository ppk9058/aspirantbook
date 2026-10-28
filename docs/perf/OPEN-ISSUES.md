# Open Issues & Hardening Roadmap (Audited)

This document catalogs technical debt, open issues, and required hardening items identified during the skeptical audit of `perf/exam-runtime-v2`.

---

## 1. Corrections to Previous Report (Retracted Claims)

1. **Retracted "Feature flags are production-ready"**: As demonstrated by the load testing data in `RESULTS.md`, performance flags introduced unexpected latency and throughput degradation. They must remain disabled until Task A9 profiling is complete.
2. **Retracted "Rate limiting is complete"**: Server rate limiting must be proven to fail open when Redis or Postgres is down or slow (Task A13), and mobile sync debounce must be tested against client clock scenarios.

---

## 2. Priority Performance & Reliability Deficiencies

1. **Flag Throughput Inversion (Critical Task A9)**:
   - Enabling `BATCH_SYNC` and `CACHE_QUESTIONS` degrades throughput from 86.0 RPS to ~70 RPS.
   - Root cause hypothesis: Database round trip on every request to verify cache version (`getExamQuestionsVersion`), and potential transaction locking in raw SQL upserts.
2. **Server Rate Limiter Fail-Open Requirement (Task A13)**:
   - When the rate limit store (Redis or Postgres) is unavailable or latent, exam endpoints must fail open to avoid rejecting student answers during an exam.
3. **Mobile Client Sync Cadence & 429 Handling (Task A13)**:
   - `apps/mobile/src/lib/cbt-sync.ts` triggers sync on every tap without debounce.
   - Requires 1500–2000 ms debounce before flush during live exams, with immediate local storage persistence and `Retry-After` header parsing.
4. **Stripe Import Failure & Lazy Initialization (Task A4)**:
   - Replace placeholder string `sk_test_placeholder_for_build` with true lazy initialization that does not throw during Next.js production build and fails closed at runtime.
5. **Entitlement Thundering Herd (Task A14)**:
   - Measure 300-user start herd query count and P95 latency before adding entitlement caching.
