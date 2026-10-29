# Dependency Security & Audit Report (Task B2)

**Audit Date:** 2026-10-29  
**Branch:** `feat/launch-blockers`  
**Auditor:** Skeptical Senior Auditor  

---

## 1. Summary of Vulnerabilities (Before vs After)

Every workspace was scanned with `npm audit --json`:

| Workspace | Before (Total / Critical) | After (Total / Critical) | Status (`audit --audit-level=critical`) |
| :--- | :--- | :--- | :--- |
| **Root (App Router / API)** | 56 / 7 | 27 / **0** | **0 Criticals (PASS)** |
| **`packages/shared`** | 1 / 0 | 1 / **0** | **0 Criticals (PASS)** |
| **`apps/mobile`** | 22 / 0 | 22 / **0** | **0 Criticals (PASS)** |

---

## 2. Critical Advisories Addressed

1. **`@auth/core` & `next-auth`**:
   - **Advisory ID:** [GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh) (Critical) - Email normalizer homoglyph bypass.
   - **Action:** Upgraded `next-auth` to `5.0.0-beta.32` and overridden `@auth/core` to `0.41.3`.
   - **Verdict:** Fully resolved.
2. **`swiper`**:
   - **Advisory ID:** [GHSA-hmx5-qpq5-p643](https://github.com/advisories/GHSA-hmx5-qpq5-p643) (Critical) - Prototype pollution.
   - **Action:** Upgraded `swiper` to `12.1.2`.
   - **Verdict:** Fully resolved.
3. **`fast-xml-parser`**:
   - **Advisory ID:** [GHSA-m7jm-9gc2-mpf2](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2) (Critical) - Entity encoding bypass.
   - **Action:** Overridden to `5.11.2`.
   - **Verdict:** Fully resolved.
4. **`protobufjs`**:
   - **Advisory ID:** [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) (Critical) - Arbitrary code execution.
   - **Action:** Overridden to `7.6.6`.
   - **Verdict:** Fully resolved.
5. **`dompurify` (nested under `monaco-editor`)**:
   - **Advisory ID:** [GHSA-cg2g-xh64-v4q7](https://github.com/advisories/GHSA-cg2g-xh64-v4q7) (Critical) - SAFE_FOR_TEMPLATES shadow root bypass.
   - **Action:** Sub-dependency override in `package.json` for `monaco-editor.dompurify` to `3.4.17`.
   - **Verdict:** Fully resolved.

---

## 3. Zod Upgrade Evaluation & Residual Risk Analysis

- **Advisory ID:** [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) (High) - Memory exhaustion on oversized constrained collections.
- **Evaluation:** Zod `4.x` is a major breaking rewrite with breaking API changes across error formatting, `.safeParse`, and schema definitions. Current versions of `@trpc/server`, `@hookform/resolvers`, and Prisma Zod generators are incompatible with Zod v4.
- **Residual Risk & Mitigation:**
  - The vulnerability requires an attacker to submit multi-megabyte payloads with deeply nested constrained collections.
  - The application strictly enforces:
    1. HTTP body size limits via Next.js and reverse proxy.
    2. Per-route rate limiting via `checkV1RateLimit`.
    3. Strict `.max()` length constraints on all input arrays and strings across public DTO schemas.

---

## 4. Verification Evidence Files

- Before raw audits:
  - `docs/evidence/raw/npm-audit-before.json`
  - `docs/evidence/raw/npm-audit-shared-before.json`
  - `docs/evidence/raw/npm-audit-mobile-before.json`
- After raw audits:
  - `docs/evidence/raw/npm-audit-after.json`
  - `docs/evidence/raw/npm-audit-shared-after.json`
  - `docs/evidence/raw/npm-audit-mobile-after.json`
