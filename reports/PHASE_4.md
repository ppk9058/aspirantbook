# PHASE 4 — Security hardening (secrets, XSS, CSRF, headers, uploads, deps)

Branch `final-verify`. Runtime checks against `127.0.0.1:3048` with
`127.0.0.1:54329/launch_verify`; no other host or database was contacted.

Legend: DONE / PARTIAL / SKIPPED / NOT TESTED / FAILED / NOT FOUND.

## 4.1 Secret scanning — PARTIAL

Tool: `gitleaks detect --source . --redact` (git history + working tree).

Raw: `reports/EVIDENCE/p4-secret-scan.txt`.

- 727 commits / 55.93 MB scanned; **44 findings**, **0 in the working tree**.
- The worktree shares the parent repo history
  (`/Users/praveenkumar/TrillionSkill/.git`), so findings also cover unrelated
  `Market/` and `MarketFlow/` projects; those are out of scope here.
- Findings inside this app: 16 lines (16 files). Classification:
  - 7 test scripts use a hardcoded `NEXTAUTH_SECRET` fallback that contains
    the word `test` (`scripts/test-p0-4-*.ts:191`,
    `test-p0-5-*.ts:12`, `test-pass9-*.ts:9`,
    `scripts/run-pass9-qa-matrix.ts:23`,
    `scripts/test-step4-real-http-suite.ts:22`,
    `scripts/test-step5-complete-http-suite.ts:22`,
    `scripts/test-browser-b1-repro.ts:5`). None of these values equals any
    value in `.env`, `.env.local` or `.env.test` (hash comparison).
  - 2 Stripe findings are `NEXT_PUBLIC_*` **publishable** keys
    (`docs/PAYMENT_TESTING.md:13`, `docs/PHASE_8_COMPLETE.md:86`) — public by
    design.
  - `reports/EVIDENCE/p2-v1-otp.txt:5` was a **local test** refresh token;
    redacted in this phase's evidence commit.
  - `docs/verify-launch/evidence/sec6-unit-sweep.txt:3706` is an assertion
    string (false positive).
- No tracked `.env` / `.env.local`; only `.env.example` files are committed.
- Hardcoded test fallbacks are a hygiene issue (LOW): if one of those scripts
  ran against a real deployment without env, it would mint cookies with a
  known secret. Not changed here (test tooling, no production path).

## 4.2 HTML injection sinks — 2 bugs FIXED

25 `dangerouslySetInnerHTML` occurrences across 16 files. Full classification:
`reports/EVIDENCE/p4-html-sinks.txt`.

### 4.2.1 JSON-LD script breakout (stored XSS) — FIXED

**Bug.** Eight server components built
`<script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(x)}}>`.
`JSON.stringify` does not escape `<`, so a course/tutorial description
containing `</script><script>…` breaks out of the JSON-LD block. The repo
already ships `safeJsonLdStringify` (`lib/seo/core.ts:102`) and even documents
the rule in `app/admin/seo/page.tsx:260`, but these pages bypassed it.

**Runtime proof (before).** Set `fv-pub-a.description` to
`probe </script><script>window.__fvxss=1</script>` through the admin API, then
fetched `/tutorials/fv-pub-a` as admin:

```
"description":"probe </script><script>window.__fvxss=1</script>"
RAW_BREAKOUT_COUNT=1
```

Raw: `reports/EVIDENCE/p4-jsonld-xss-before.txt`.

**Fix.** Replaced `JSON.stringify(...)` with `safeJsonLdStringify(...)` and
imported it in: `app/page.tsx:9,106`, `app/(dashboard)/books/[slug]/page.tsx:5,84`,
`app/(dashboard)/courses/[slug]/page.tsx:2,403`,
`app/(dashboard)/tutorials/[slug]/page.tsx:2,218`,
`app/(dashboard)/test-series/[id]/page.tsx:2,217`,
`app/(dashboard)/current-affairs-quizzes/[slug]/page.tsx:23,114`,
`app/(dashboard)/pyqs/[examId]/page.tsx:3,100`.

**Proof (after).** Same payload (marker `__fvxss2`) is emitted as
`\u003c/script>\u003cscript>…`, `RAW_BREAKOUT_COUNT=0`.
Raw: `reports/EVIDENCE/p4-jsonld-xss-after.txt`.
Pages still render: `/` 200 (1 JSON-LD), `/pyqs/bpsc-tre` 200 (1),
`/tutorials/fv-pub-a` 200 (2), `/test-series/<id>` 200 (2), no 500s.

**Regression test.** New `tests/unit/jsonld-escaping.test.ts` (7 files) passes
after the fix and fails when the pre-fix `app/page.tsx` is restored:
`not ok 1 … # pass 6 # fail 1`.

### 4.2.2 Regex sanitizer bypass (`<svg/onload=…>`) — FIXED

**Bug.** `lib/security/sanitizer.ts` stripped event handlers with
`/\son[a-z0-9_-]+\s*=/`, which requires whitespace before `on…`. Payloads such
as `<svg/onload=alert(1)>` and `<body/onload=alert(1)>` survived. The sanitizer
is the SSR fallback for tutorial HTML and the render-time guard for
`components/practice/InstructionsPanel.tsx:35`.

**Proof (before).** Corpus of 25 payloads:

```
FAIL | event-handler | in="<svg/onload=alert(1)>" | out="<svg/onload=alert(1)>"
FAIL | event-handler | in="<body/onload=alert(1)>" | out="<body/onload=alert(1)>"
failures=2
```

Raw: `reports/EVIDENCE/p4-sanitizer-before.txt`.

**Fix.** `lib/security/sanitizer.ts`:
- event-handler regex now `(^|[\s"'`/])on[a-z0-9_-]+\s*=…` (catches `/onload=`),
- numeric/named entities are decoded on a detection copy; if a hidden
  `javascript:` / `vbscript:` / `data:text/html` scheme is revealed, all
  URI-bearing attributes are stripped.

**Proof (after).** All 25 payloads plus 5 `inlineFmt` cases pass
(`failures=0`), including `<svg/onload>`, `<body/onload>`,
`<svg><animate onbegin=…>`, `java&#115;cript:`, `java&#x73;cript:`,
`javascript&#58;`. Raw: `reports/EVIDENCE/p4-sanitizer-after.txt`.

**Regression test.** `tests/unit/xss-sanitizer.test.ts` strengthened (24 cases).
It previously passed the `<svg/onload>` payload because its own assertion
required whitespace; it now uses the same `(^|[\s"'`/])on…` rule and adds
entity/`data:text/html` cases. Old sanitizer: `# pass 22 # fail 2`; new: 24/24.

### 4.2.3 Remaining sinks — DONE (reviewed)

- `inlineFmt` escapes `<`, `>`, `&` before inserting `strong`/`mark`/`code`
  (`lib/rosera/inline.ts:11-22`); used by `RoseraRenderer`,
  `CodecademyContentRenderer`, `AspirantbookTutorialView`, `CourseDetailView`.
- `RoseraRenderer` raw HTML/SVG goes through DOMPurify on the client and the
  hardened regex on the server (`lib/rosera/inline.ts:27-41`).
- `PublicQuestionView` uses `safeJsonLdStringify`/`\u003c` escaping.
- Static-only sinks: `app/layout.tsx` theme script,
  `app/(exam)/test-series/[id]/result/page.tsx` print `<style>`,
  `AspirantbookTutorialView` scoped `<style>`.
- KaTeX output (`components/exam/MathRenderer.tsx`) is generated by
  `katex.renderToString`, which escapes the input math.

## 4.3 CSRF / origin guard — DONE

Raw: `reports/EVIDENCE/p4-csrf-headers-upload.txt`.

Guard: `middleware.ts:47-63` → `verifyRequestOrigin` (`lib/security/csrf.ts`).
It applies when a session cookie is present, the method is not GET/HEAD/OPTIONS,
and the path is not `/api/auth*` or `/api/webhooks*`.

| request | result |
| --- | --- |
| admin `PUT /api/admin/courses/<id>` Origin same | 200 |
| same, Origin `http://evil.example` | 403 `Cross-origin request rejected` |
| same, Origin `null` | 403 |
| same, Referer `http://evil.example/x` | 403 |
| same, Referer same host | 200 |
| student `POST /api/courses/progress` Origin evil | 403 |

Requests with neither Origin nor Referer are allowed by design for non-browser
clients (documented in `middleware.ts:44-46`); they still need a valid session.

## 4.4 Security headers — DONE (with caveats)

Raw: `reports/EVIDENCE/p4-csrf-headers-upload.txt`.

Present on `/`: `Content-Security-Policy`, `Strict-Transport-Security`
(`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options:
nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy:
camera=(), microphone=(), geolocation=(), browsing-topics=()`.
Configured in `next.config.js:69-160`.

Caveats (not changed):
- `script-src` includes `'unsafe-inline'` and `'unsafe-eval'`. Next.js inline
  bootstrap needs `'unsafe-inline'`; `'unsafe-eval'` is dev-oriented.
- `img-src` allows `https:` and `http:` broadly.
- No `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy`.

## 4.5 Open redirect — DONE

`sanitizeReturnPath` (`lib/utils/return-path.ts`) run against 18 payloads:
protocol-relative, backslash, absolute URL, `javascript:`, single/double
URL-encoded `//`, `/@evil`, header-injection newline/tab, `localhost.evil`
lookalike. All 18 returned the fallback or the original safe path.

Raw: `reports/EVIDENCE/p4-open-redirect.txt` (`18/18 passed`).

## 4.6 Upload validation — DONE

Raw: `reports/EVIDENCE/p4-csrf-headers-upload.txt`.
Route `app/api/upload/presigned-url/route.ts`.

| request | result |
| --- | --- |
| anonymous `image/png` | 401 |
| free user `image/png` | 500 `File storage is not configured` (S3 absent locally; fail closed) |
| free user `image/svg+xml` | 400 invalid type |
| free user `text/html` | 400 unsupported |
| free user 999 MB `image/png` | 400 max 5 MB |
| free user filename `../../x.png` | key sanitised (`[^a-zA-Z0-9.-]` → `_`), reaches storage check |

Also: rate limit 20/min per IP with `failClosed: true` (`:16-20`), auth required
(`:22-26`), server-generated key (`lib/aws-s3.ts:119-124`).

LOW observation (not changed): the `folder` body field is interpolated into the
S3 key without allow-listing. S3 keys do not traverse the filesystem, so impact
is limited to writing under an unexpected prefix.

## 4.7 Raw SQL — DONE (reviewed)

`$queryRawUnsafe` / `$executeRawUnsafe` used in 9 app/lib files:
`lib/rate-limit.ts:169,179`, `lib/auth/rate-limiter.ts:77`,
`lib/exam-runtime/cache-invalidation.ts:40`, `lib/exam-ranking.ts:80`,
`lib/platform-settings.ts:63`, `lib/prisma-lock.ts:20`,
`app/api/test/health/route.ts:13`, plus read-only `scripts/`. Every query uses
`$1,$2,…` bind parameters or a constant; no user value is interpolated into
SQL text (grep for `${` shows only cache-key strings). No `$queryRaw` with
template interpolation of input was found.

## 4.8 Turnstile — DONE

Raw: `reports/EVIDENCE/p4-turnstile.txt`.
`lib/security/turnstile.ts`, applied to register/login (`lib/actions/auth.ts:54,283`)
and legal forms (`lib/actions/legal.ts:120`).

| config | token | result |
| --- | --- | --- |
| flag off | none | `{"success":true}` (documented dev/test bypass) |
| flag on, no secret | any | `500` misconfigured (fails closed) |
| flag on + secret | empty | `400` missing-input-response |

## 4.9 Dependency audit — PARTIAL

Raw: `reports/EVIDENCE/p4-npm-audit.txt`.

- Root: 29 vulnerabilities — 7 high, 21 moderate, 1 low, **0 critical**.
  High items: `zod <4.6.6` (memory exhaustion), `postcss <=8.5.22`
  (CSS-stringify XSS / file read), `picomatch` (ReDoS), and Prisma
  `@prisma/config` / `deepmerge-ts` / `effect`.
- Mobile: 41 vulnerabilities — 5 high, 30 moderate, 6 low, **0 critical**
  (`@expo/cli`, `expo-router`, `query-string`, `decode-uri-component`, `zod`).
- Installed: `zod 3.25.76`, `next 15.5.28`, `postcss 8.5.32`.
- Fixing `zod` (3 → 4.6.7) and `next`/`expo` majors requires a package.json
  and lockfile change plus a regression pass, so it was **not** applied here
  (see HUMAN DECISIONS).

## 4.10 Test-only routes — DONE

`/api/test/health`, `/api/test/seed`, `/api/test/login` → 404 in development
(raw in `p4-csrf-headers-upload.txt`), consistent with Phase 3.

## HUMAN DECISIONS

1. **Dependency majors (zod 3→4, next 15→16, expo-router).** Real advisories
   with fixes only in major versions. Needs approval and a full regression run;
   package.json/lockfile were not touched.
2. **`unsafe-inline` / `unsafe-eval` in CSP.** Removing them requires a nonce
   pipeline across Next inline scripts; out of scope for a verification pass.
3. **Hardcoded test-secret fallbacks in 7 scripts.** Safe to remove (`require`
   the env var instead) but they are tooling, not runtime.
4. **Upload `folder` allow-list.** LOW; behaviour change to the upload API.

## Verification commands (raw tails)

`npx tsc --noEmit`:

```
(no output; exit 0)
```

`npx next lint --file <changed files>`:

```
✔ No ESLint warnings or errors
```

`npx tsx --test tests/unit/jsonld-escaping.test.ts`:

```
# tests 7  # pass 7  # fail 0
```

`npx tsx --test tests/unit/xss-sanitizer.test.ts`:

```
# tests 24  # pass 24  # fail 0
```

## Status summary

| item | status |
| --- | --- |
| Secret history scan | PARTIAL (no prod secret; test fallbacks LOW) |
| JSON-LD XSS | FIXED, DONE |
| Regex sanitizer `<svg/onload>` | FIXED, DONE |
| Other HTML sinks | DONE (reviewed) |
| CSRF / origin | DONE |
| Security headers | DONE (CSP caveats) |
| Open redirect | DONE (18/18) |
| Upload validation | DONE |
| Raw SQL | DONE (parameterised) |
| Turnstile | DONE |
| Dependency audit | PARTIAL (0 critical; majors need approval) |
| `/api/test/*` | DONE (404) |
