# Open Issues & Hardening Roadmap (Audited)

This document catalogs technical debt, open issues, and required hardening items identified during the skeptical audit of `perf/exam-runtime-v2`.

---

## 1. Corrections to Previous Report (Retracted Claims)

1. **Retracted "Feature flags are production-ready"**: As demonstrated by the load testing data in `RESULTS.md`, performance flags introduced unexpected latency and throughput degradation. They must remain disabled until Task A9 profiling is complete.
2. **Retracted "Rate limiting is complete"**: Server rate limiting must be proven to fail open when Redis or Postgres is down or slow (Task A13), and mobile sync debounce must be tested against client clock scenarios.

---

## 2. Hardened & Resolved Audit Items (Part A)

1. **Flag Throughput Inversion & Overheads (Task A9 - RESOLVED)**:
   - Root causes identified: interactive Prisma transaction roundtrips in `BATCH_SYNC` and unshared DB version checks in `CACHE_QUESTIONS`.
   - Optimized `sync/route.ts` raw SQL execution; flags evaluated via rigorous load harness and confirmed to remain default **OFF**.
2. **Server Rate Limiter Fail-Open Requirement (Task A13 - RESOLVED)**:
   - `lib/rate-limit.ts` and `lib/exam-runtime/exam-rate-limit.ts` updated to fail open gracefully on DB/Redis latency or outage, returning standard `Retry-After` header when active. Verified 5x in `tests/unit/ratelimit-and-mobile-sync.test.ts`.
3. **Mobile Client Sync Cadence & 429 Handling (Task A13 - RESOLVED)**:
   - Built `apps/mobile/src/lib/cbt-sync.ts` featuring 1800ms trailing debounce, immediate local storage persistence, and queue pause on 429 responses with `Retry-After` honoring.
4. **Stripe Import Failure & Lazy Initialization (Task A4 - RESOLVED)**:
   - Replaced placeholder string `sk_test_placeholder_for_build` with lazy getter `getStripeClient()`. Build never throws in absence of keys; runtime calls fail closed with clear error.
5. **Entitlement Thundering Herd (Task A14 - RESOLVED)**:
   - Benchmarked 300 concurrent `checkTestAccess` requests under 0ms and 40ms Toxiproxy latency. Measured P95 is 53.9ms–63.7ms for FREE tests and 234ms for PRO tests, demonstrating that entitlement caching is unnecessary.
6. **Ranking Index & Scalability (Task A8 - RESOLVED)**:
   - Composite index `idx_examattempt_ranking` created with `CREATE INDEX IF NOT EXISTS`. Benchmarked across 1k, 10k, 100k, and 300k attempts with sub-millisecond Top-N execution.
7. **Connection Safety Bounds (Task A12 - RESOLVED)**:
   - Tested uncapped pool vs `connection_limit=10` and `connection_limit=5`. Uncapped grew to 31 active connections; limits strictly bounded active connections.

---

## 3. Remaining Operational Roadmap & Next Tasks (Part B & C)

1. **Launch Blockers (Part B)**:
   - Google OAuth token verification, production container read-only filesystem check, client IP trust proxy spoof defense, Razorpay webhook HMAC verification, legal pages, Brevo email outbox, and Turnstile integration.
2. **Attempt Compaction (Part C)**:
   - Additive schema for cold attempt archiving (`ExamAttemptArchive`), non-destructive compaction of historical attempts with transaction isolation.
