# Task Execution & Evidence Ledger

**Branch:** `perf/exam-runtime-v2`  
**Base Worktree:** `/Users/praveenkumar/ws-perf-v2`  
**Starting Commit:** `2281365`  
**Audit Standard:** Skeptical Senior Auditor (Strict Evidence Protocol)

---

## Task Progress Table

| Task ID | Description | Status | Commit SHA | Evidence Path | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A1** | Claim audit & report rewrite | DONE | `53f6455` | `docs/evidence/claims-register.md`, `docs/perf/*` | Audited all claims, classified into PROVEN/DISPROVEN/UNPROVEN, rewrote 4 docs with retraction sections |
| **A2** | tsc truth across 3 trees | DONE | `d642d57` | `docs/evidence/raw/tsc-*.txt`, `docs/evidence/raw/tsc-truth-analysis.md` | Base: 65, c603168: 67, Tip: 0 (web/shared), mobile: 2 config errors. Root cause identified & verified. |
| **A3** | Intentional behaviour changes with flags OFF | DONE | `62d34e1` | `docs/evidence/raw/parity-diff.txt`, `docs/evidence/raw/exam-runtime-golden-5x.txt` | Enumerated 8 intentional diffs, pinned by tests 5-8 in golden parity suite, verified 5x passes |
| **A4** | Stripe placeholder lazy initialisation | DONE | `2b5c6d9` | `docs/evidence/raw/stripe-test.txt` | Replaced placeholder with lazy proxy, fails closed at runtime, health shows "payments: not configured", passed 5x |
| **A5** | force-dynamic review | DONE | `856bbe3` | `docs/evidence/raw/force-dynamic-audit.txt` | Audited all 20 added pages/sitemaps in branch; all verified session/auth/db scoped; confirmed public pages cacheable |
| **A6** | Migration safety & additive check | DONE | `57680ae` | `docs/evidence/raw/migration-safety.txt`, `docs/evidence/raw/migration-safety-report.md` | 100k attempts measured: table 16MB, index 6.6MB, build time 187.8ms. Additive script passed, migrate status clean, concurrent procedure documented |
| **A7** | Honest baselines (Docker build/size/memory) | DONE | `e56868e` | `docs/evidence/legacy-build.patch`, `docs/evidence/raw/docker-baseline.txt` | Identified why unpatched legacy failed; created minimal patch; retracted 1.4GB/57% claims; measured honest 595MB/173s metrics |
| **A8** | Ranking correctness at scale | DONE | `af7fa76` | `docs/evidence/raw/ranking-property-5x.txt`, `docs/evidence/raw/ranking-scale-explain.txt` | Property test (1000 datasets) 100% matched in-memory ref; top-N consistency confirmed; 50 concurrent submits unique; 1k/10k/100k/300k scale EXPLAIN recorded (top-N 0.3ms at 300k, live-rank 288ms); 5x passed |
| **A9** | Flag performance root causes & fixes | DONE | `81b0581` | `docs/evidence/raw/flag-overhead-analysis.txt`, `scripts/profile-flag-overhead.ts` | Profiled statement counts & latency; identified interactive transaction roundtrip bottleneck in BATCH_SYNC and unshared container version checks; removed redundant findUnique and optimized UNNEST execution; flags remain default OFF with NO PROVEN BENEFIT |
| **A10** | Rigorous load methodology | DONE | `0d10fae` | `tools/loadtest/results/`, `docs/evidence/raw/load-results.txt` | 3 scenarios (start_herd, submit_burst, steady), 0ms & 40ms Toxiproxy tiers, 3 configs, 5 reps per cell (N=5); raw JSONs captured, bootstrap 95% CIs calculated (NO PROVEN BENEFIT confirmed) |
| **A11** | Correctness invariants verification | DONE | `0d10fae` | `docs/evidence/raw/load-invariants.txt`, `tools/loadtest/verify-invariants.ts` | 6 automated SQL invariant checks executed after every run: zero double grading, regrade parity, percentile monotonicity, no orphaned answers, clientSeq monotonicity, stored answer integrity; 100% PASSED |
| **A12** | Connection evidence & pool limit verification | DONE | `672b031` | `docs/evidence/raw/connections-*.csv`, `docs/evidence/raw/connection-evidence.txt` | Measured pg_stat_activity every 200ms across 80 VUs under Uncapped, limit=10, and limit=5; captured time series CSVs and proved pool boundary enforcement |
| **A13** | Rate limit hardening (server & mobile) | NOT_STARTED | - | `docs/evidence/raw/ratelimit-hardening.txt` | Fail-open, per-auth & IP, 429 Retry-After, mobile debounce + fake clock |
| **A14** | Entitlement thundering herd measurement | NOT_STARTED | - | `docs/evidence/raw/entitlements-herd.txt` | Measure 300-user start herd, evaluate caching necessity |
| **A15** | Final verdict table in RESULTS.md & RUNBOOK update | NOT_STARTED | - | `docs/perf/RESULTS.md`, `docs/perf/RUNBOOK.md` | Rollout order only for PROVEN-FASTER flags |
| **B1** | Real Google OAuth & token verification | NOT_STARTED | - | - | On feat/launch-blockers branch |
| **B2** | Dependency security (audit & next-auth upgrade) | NOT_STARTED | - | - | `npm audit --audit-level=critical` = 0 |
| **B3** | No local-disk writes (PERSIST_BACKEND db/fs, S3/MinIO) | NOT_STARTED | - | - | Read-only container test with zero EROFS |
| **B4** | Client IP / TRUST_PROXY hardening | NOT_STARTED | - | - | Single getClientIp(), CF-Connecting-IP safe parsing |
| **B5** | Razorpay webhook verification & idempotency | NOT_STARTED | - | - | Raw body HMAC-SHA256, timingSafeEqual, event idempotency table |
| **B6** | Legal and account pages (/refund, /contact, /data-deletion, /privacy) | NOT_STARTED | - | - | Real data processors, owner placeholders, deletion API |
| **B7** | Email provider abstraction (Brevo + Resend fallback) | NOT_STARTED | - | - | Local SMTP test, DB outbox |
| **B8** | Turnstile server verification | NOT_STARTED | - | - | Fail closed, client widget |
| **B9** | Centralized domain & brand configuration | NOT_STARTED | - | - | Replace hardcoded strings with config |
| **B10** | CI workflow & tsc ratchet | NOT_STARTED | - | - | `.github/workflows/ci.yml`, dependabot, ratchet script |
| **B11** | Mobile config guards | NOT_STARTED | - | - | `npm run check:release`, HTTPS check |
| **B12** | Health endpoint verification | NOT_STARTED | - | - | Read-only container test, no secrets leaked |
| **C1** | Measure before compacting (10k seeded attempts) | NOT_STARTED | - | - | On feat/attempt-compaction branch |
| **C2** | Reader & writer inventory | NOT_STARTED | - | - | Full grep inventory of ExamAttemptAnswer readers/writers |
| **C3** | Compact archive table & dry-run job design | NOT_STARTED | - | - | Additive schema, transparent fallback |
| **C4** | Compaction verifier script | NOT_STARTED | - | - | `scripts/verify-compaction` 100% match |
| **C5** | Compaction evidence & crash consistency | NOT_STARTED | - | - | Space measurements, byte-identical responses, kill -9 test |
| **C6** | Boundaries check & unmeasured savings disclaimer | NOT_STARTED | - | - | Leave feat/ai-layer untouched |
| **Z1** | Clean-room fresh temporary clone verification | NOT_STARTED | - | - | Run verification on fresh clones of all branches |
| **Z2** | Test accounting (pre-existing vs new, diff summary) | NOT_STARTED | - | - | Full test counts and diff |
| **Z3** | Merge conflict prediction across 3 branches | NOT_STARTED | - | - | Trial merge / merge-tree analysis |
| **Z4** | Final report & claims register final state | NOT_STARTED | - | - | English, max ~80 lines, honest headline numbers |
| **Z5** | Isolation & safety proof | NOT_STARTED | - | - | Zero supabase.co hits, zero remote pushes |
