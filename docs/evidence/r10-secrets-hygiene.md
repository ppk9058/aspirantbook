# R10-6 — Secrets Hygiene and Gitleaks Audit

**Worktree:** `/Users/praveenkumar/ws-launch`
**Branch:** `feat/launch-blockers`
**Date:** 2026-11-01

---

## 1. Replacement of Hardcoded Secret-like Literals

Hardcoded secret assignments in 41 files under `scripts/` and `tests/e2e/` were replaced with `process.env.<NAME>` reads.
In all test/benchmark/utility scripts, missing required environment variables fail clearly with a descriptive `Error` or `${VAR:?required}` check.
In `tests/e2e/razorpay-webhook-idempotency.spec.ts`, fallback values preserve fixture behavior for signature testing.

### Modified Files (41 total):
1. `scripts/measure-connection-limits.ts`
2. `scripts/pass10_5/test_part_a.ts`
3. `scripts/pass10_5/test_part_c.ts`
4. `scripts/pass10_5/test_part_e.ts`
5. `scripts/pass10_5/test_part_i.ts`
6. `scripts/pass10_7/test_part8.sh`
7. `scripts/pass10_8/test_part1.sh`
8. `scripts/pass10_8/test_part10.sh`
9. `scripts/pass10_8/test_part11.sh`
10. `scripts/pass10_8/test_part2.sh`
11. `scripts/pass10_8/test_part4.sh`
12. `scripts/pass10_8/test_part5.sh`
13. `scripts/run-pass9-qa-matrix.ts`
14. `scripts/setup-stripe-webhook.sh`
15. `scripts/start-test-server-3045.sh`
16. `scripts/test-b2-session-ux.ts`
17. `scripts/test-b3-home-nav.ts`
18. `scripts/test-browser-b1-repro.ts`
19. `scripts/test-c1-viewport-user-mismatch.ts`
20. `scripts/test-cookie-cross-host.ts`
21. `scripts/test-landing-nav-proof.ts`
22. `scripts/test-p0-2-p0-3-leftovers.ts`
23. `scripts/test-p0-4-exam-integrity.ts`
24. `scripts/test-p0-5-locked-content-scan.ts`
25. `scripts/test-part-a-b1-repro.ts`
26. `scripts/test-part-a-precise-b1.ts`
27. `scripts/test-part-a-regressions.ts`
28. `scripts/test-part1-redirect-origin.ts`
29. `scripts/test-part2-b1-proof.ts`
30. `scripts/test-part4-landing-nav-proof.ts`
31. `scripts/test-part7-dashboard-cta.ts`
32. `scripts/test-part8-sidebar-dashboard.ts`
33. `scripts/test-part9-dashboard-links.ts`
34. `scripts/test-pass10-logout-every-layout.ts`
35. `scripts/test-pass5-section1.ts`
36. `scripts/test-pass6-webhook.ts`
37. `scripts/test-pass9-playwright-crawl.ts`
38. `scripts/test-pass9-real-payment-path.ts`
39. `scripts/test-rate-limit-proof.ts`
40. `scripts/test-step4-real-http-suite.ts`
41. `scripts/test-step5-complete-http-suite.ts`
42. `tests/e2e/razorpay-webhook-idempotency.spec.ts`

---

## 2. `.gitleaksignore` & Gitleaks Scan Reachable from HEAD

A scan was executed across all commits reachable from HEAD using `gitleaks git --log-opts="HEAD"`:
- Total findings: 30
- Findings with secret length <= 12 characters in `tests/`, `scripts/`, `tools/loadtest/`, `docs/`: **0**
- `.gitleaksignore` created with standard headers (0 ignore entries needed).

### Findings with Secret Length > 12 Characters (for Owner Review)
*Note: Values are never printed; only Commit SHA, File, Line, Rule, and Length are listed.*

| Commit | File | Line | Rule | Secret Length |
| :--- | :--- | :--- | :--- | :--- |
| `610550d` | `docs/evidence/raw/g6-email-transport-verify.txt` | 35 | `generic-api-key` | 34 chars |
| `610550d` | `docs/evidence/raw/g6-email-transport-verify.txt` | 36 | `generic-api-key` | 29 chars |
| `a59f135` | `tests/unit/health-secret-leak.test.ts` | 23 | `generic-api-key` | 38 chars |
| `a59f135` | `tests/unit/health-secret-leak.test.ts` | 28 | `generic-api-key` | 35 chars |
| `a59f135` | `tests/unit/health-secret-leak.test.ts` | 33 | `generic-api-key` | 37 chars |
| `a59f135` | `tests/unit/health-secret-leak.test.ts` | 40 | `generic-api-key` | 32 chars |
| `6c1bce7` | `docs/evidence/raw/r9-s1-web-unit-1x.txt` | 3298 | `generic-api-key` | 64 chars |
| `d0035fc` | `tests/unit/health-completeness.test.ts` | 118 | `generic-api-key` | 34 chars |
| `d0035fc` | `tests/unit/health-completeness.test.ts` | 119 | `generic-api-key` | 29 chars |
| `672b031` | `scripts/measure-connection-limits.ts` | 15 | `generic-api-key` | 44 chars |
| `8951110` | `docker-compose.loadtest.yml` | 58 | `generic-api-key` | 44 chars |
| `0d10fae` | `tools/loadtest/rigorous-load-harness.ts` | 17 | `generic-api-key` | 44 chars |
| `8951110` | `tools/loadtest/smoke-test.ts` | 13 | `generic-api-key` | 44 chars |
| `8951110` | `tools/loadtest/ablation-harness.ts` | 16 | `generic-api-key` | 44 chars |
| `ea69680` | `scripts/test-browser-b1-repro.ts` | 5 | `generic-api-key` | 42 chars |
| `ea69680` | `scripts/test-part-a-b1-repro.ts` | 7 | `generic-api-key` | 42 chars |
| `8748475` | `scripts/test-p0-5-locked-content-scan.ts` | 12 | `generic-api-key` | 42 chars |
| `8748475` | `scripts/test-p0-4-exam-integrity.ts` | 191 | `generic-api-key` | 42 chars |
| `3393dea` | `scripts/test-pass9-real-payment-path.ts` | 9 | `generic-api-key` | 24 chars |
| `b421f2b` | `scripts/test-pass9-playwright-crawl.ts` | 9 | `generic-api-key` | 42 chars |
| `570bfd0` | `scripts/run-pass9-qa-matrix.ts` | 23 | `generic-api-key` | 42 chars |
| `986edd2` | `scripts/test-step4-real-http-suite.ts` | 22 | `generic-api-key` | 42 chars |
| `8a62116` | `scripts/test-step5-complete-http-suite.ts` | 22 | `generic-api-key` | 42 chars |
| `4741dff` | `scripts/test-pass6-webhook.ts` | 5 | `generic-api-key` | 26 chars |
| `5ac0721` | `scripts/test-pass5-section1.ts` | 11 | `generic-api-key` | 26 chars |
| `165cd03` | `REPORT.md` | 1187 | `generic-api-key` | 42 chars |
| `165cd03` | `REPORT.md` | 1194 | `generic-api-key` | 42 chars |
| `165cd03` | `REPORT.md` | 1204 | `generic-api-key` | 24 chars |
| `672194e` | `docs/PAYMENT_TESTING.md` | 13 | `generic-api-key` | 107 chars |
| `672194e` | `docs/PHASE_8_COMPLETE.md` | 86 | `generic-api-key` | 18 chars |

---

## 3. S1 Evidence Log Verification Token Audit

- **Location:** `docs/evidence/raw/r9-s1-web-unit-1x.txt:3298`
- **Identifier:** `DevEmailOutbox` verification link token (`hex64`)
- **Status:** **Expired / Unusable**
- **Reason:** Generated during unit test execution against an ephemeral local throwaway test database (`127.0.0.1:54329`) with an immediate expiration window. Not a live or remote secret.
