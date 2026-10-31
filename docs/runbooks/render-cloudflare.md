# Production hosting on Render (Docker) behind Cloudflare

Status: **owner runbook**. Nothing here has been executed against a live Render
or Cloudflare account. Every value below is either a variable *name* from
`.env.example` or a setting to click in a dashboard. Never paste real secrets
into tickets, chat, commits or logs.

Measured reference points (this branch):

- image `trillionskill:b61845a`, 625 MB, build 1476 s, runs as uid 1001 `nextjs`
  (`docs/evidence/raw/r9-s4-image.txt`)
- `--read-only` + tmpfs `/tmp` and `/app/.next/cache` is sufficient
  (`docs/evidence/raw/r9-s4-container-health-b001.txt`)
- exam flow PASS 5/5 against the container
  (`docs/evidence/raw/r9-s4-exam-flow-{1..5}of5.txt`)

## 0. Render Blueprint (`render.yaml`)

The repo root contains `render.yaml` – a Render Blueprint that defines the
Docker web service. It specifies the Dockerfile, health check path (`/api/health`),
pre-deploy migration command (`scripts/ops/migrate-deploy.sh` using `DIRECT_URL`),
`autoDeploy: false`, and all required env var NAMES (no values; secrets use
`sync: false`). `TRUST_PROXY` is commented out – uncomment and set to `"true"`
only after Cloudflare proxy is active.

To create the service from the blueprint: Render dashboard → New → Blueprint →
point at this repo. Review the env var list and fill in secret values.

## 1. Why Render free/starter needs `PERSIST_BACKEND=db`

Render instances (including free tier) have an **ephemeral filesystem** and free
web services spin down when idle. Anything written to local disk is lost on
restart or redeploy. `lib/boot-guard.ts` therefore refuses to start when
`NODE_ENV=production` and the persistence backend resolves to `fs`:

```
[CRITICAL SECURITY REFUSAL AT BOOT] PERSIST_BACKEND resolves to the local-disk
backend in NODE_ENV=production! ... set PERSIST_BACKEND=db.
```

Verified: `docs/evidence/raw/r9-s2-boot-guard-fs-refusal.txt` (health 500, the
error above in the instrumentation hook).

**Set `PERSIST_BACKEND=db` on every Render environment, including previews.**

## 2. Render service

| Setting | Value |
| :--- | :--- |
| Service type | Web Service → **Docker** |
| Repository / branch | this repo, `main` (owner merges `feat/launch-blockers` first) |
| Dockerfile path | `./Dockerfile` |
| Health check path | `/api/health` |
| Port | Render injects `PORT`; the image listens on `3000` by default and honours `PORT` (`Dockerfile` runner stage) |
| Auto-deploy | on, after the first manual deploy succeeds |
| Disk | none (see §1) |

The image already declares
`HEALTHCHECK ... curl -f http://127.0.0.1:${PORT:-3000}/api/health`, so Render's
health check and the container's own check agree.

Do **not** add a Render persistent disk. If one is ever added, `PERSIST_BACKEND`
must still stay `db`; local disk is never the source of truth.

## 3. Environment variables (names only)

REQUIRED (from `.env.example`):

| Name | Value shape |
| :--- | :--- |
| `DATABASE_URL` | Neon **pooled** URL, `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `DIRECT_URL` | Neon **direct** (non-pooled) URL, `sslmode=require` |
| `AUTH_SECRET` | `openssl rand -base64 32` (min 32 chars) |
| `NEXTAUTH_SECRET` | same value as `AUTH_SECRET` |
| `PERSIST_BACKEND` | literal `db` |
| `NODE_ENV` | `production` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | `https://aspirantbook.com` |
| `NEXTAUTH_URL` | `https://aspirantbook.com` |
| `CANONICAL_DOMAIN` / `NEXT_PUBLIC_CANONICAL_DOMAIN` | `aspirantbook.com` |

OPTIONAL but expected for this deployment:

| Name | Why |
| :--- | :--- |
| `TRUST_PROXY` | `true` **only** when every request arrives through Cloudflare (see §4) |
| `TRUST_PROXY_HOPS` | upstream proxy count for `X-Forwarded-For` fallback (default 1) |
| `HEALTH_DETAILS_TOKEN` | enables the detailed `/api/health` body (migrations, storage backend) |
| `CRON_SECRET` | authorises internal cron endpoints |
| `RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | payments |
| `RESEND_API_KEY` or `BREVO_API_KEY`, `EMAIL_FROM` | transactional email |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_REGION` | media/PDF storage |
| `TURNSTILE_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | bot protection on public forms |
| `REDIS_URL` | optional cache / distributed rate limits |
| `GIT_COMMIT` | makes `/api/health` report the deployed SHA instead of `unknown` |
| `MAINTENANCE_MODE` | surfaced to clients as `isMaintenance` in `GET /api/v1/config`; it does not by itself block web traffic |

Never set `ALLOW_DEV_MOBILE_LOGIN` in production: `isDevBypassAllowed()` is
closed in production regardless, but the variable must not exist there at all.

Set `GIT_COMMIT` from the Render build (e.g. `RENDER_GIT_COMMIT`) so the health
endpoint identifies the running image.

## 4. Cloudflare

### 4.1 Client IP and rate limiting

`lib/rate-limit.ts` reads forwarding headers **only** when `TRUST_PROXY=true`,
and prefers `CF-Connecting-IP` (validated as a literal IPv4/IPv6 address), then
the right-most `X-Forwarded-For` entry per `TRUST_PROXY_HOPS`.

- Cloudflare proxied → `TRUST_PROXY=true`. Without it every request appears to
  come from Cloudflare's edge and the 5/hour registration limit would be shared
  by all users.
- Direct-to-Render (grey cloud / DNS-only) → `TRUST_PROXY=false`, otherwise a
  client could spoof `CF-Connecting-IP`.
- Never enable `TRUST_PROXY` while the origin is publicly reachable around
  Cloudflare; lock the origin down or keep it DNS-only.

### 4.2 DNS cutover (do not break email)

Existing mail records on the zone are **out of scope**. Leave these exactly as
they are:

- MX records: `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`,
  `route3.mx.cloudflare.net` (Email Routing)
- SPF `TXT` on the apex
- DKIM `cf2024-1._domainkey` `TXT`
- `_dmarc` `TXT`

Only the web records change:

1. Add the Render custom domain for `aspirantbook.com` and
   `www.aspirantbook.com` in the Render dashboard; copy the target hostname it
   gives you.
2. In Cloudflare DNS create `CNAME www → <render target>` with **Proxy status:
   DNS only** (grey cloud). Add the apex (`CNAME` flattening at
   `aspirantbook.com`, or `ALIAS`/`A` as Render instructs) also **DNS only**.
3. Wait for Render to show both domains as **Verified** and for its certificate
   to be issued. Confirm `https://<render-target>/api/health` returns 200.
4. Only then switch both records to **Proxied** (orange cloud).
5. SSL/TLS mode: **Full (strict)**. Never `Flexible` (redirect loop with HSTS)
   and never `Off`.
6. Enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
7. Add a Redirect Rule: `www.aspirantbook.com/*` → `https://aspirantbook.com/$1`,
   status **301**, preserve query string.
8. Optional but recommended: HSTS is already sent by `next.config.js`
   (`max-age=63072000; includeSubDomains; preload`). Do not add a second,
   conflicting HSTS header in Cloudflare.

### 4.3 Turnstile and WAF

- Turnstile: create a widget for `aspirantbook.com` (and `www`), put the site key
  in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, the secret in `TURNSTILE_SECRET_KEY`, set
  `TURNSTILE_ENABLED=true`. The server verifies via `lib/security/turnstile.ts`;
  a failed verification blocks the form, it never silently passes.
- WAF / rate limiting rules at the edge: **next phase**, after the origin is
  stable. Do not add edge rules that would mask the app's own 429s during the
  first rollout.

## 5. First deploy order

1. Neon project + pooled/direct URLs (owner) — see `docs/runbooks/staging-neon.md`.
2. Apply migrations from a trusted machine:
   `DIRECT_URL='postgresql://...' scripts/ops/migrate-deploy.sh`
   (refuses an empty `DIRECT_URL`; prints only the host).
3. Create the Render service with the env vars from §3, `PERSIST_BACKEND=db`.
4. Deploy. Wait for the health check to go green.
5. DNS cutover per §4.2.
6. Smoke checks per §6.

## 6. Smoke checks (after every deploy)

```bash
BASE=https://aspirantbook.com
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/health                  # 200
curl -s $BASE/api/health                                                  # status ok, database healthy
curl -s -H "x-health-details-token: $HEALTH_DETAILS_TOKEN" $BASE/api/health
                                                                          # migrations.pending: 0, storageBackend: db
for p in /admin /api/admin /api/auth/role; do
  curl -s -o /dev/null -w "$p %{http_code}\n" $BASE$p
done                                                                      # 307 / 401 / 404
curl -s -o /dev/null -w '%{http_code}\n' -X POST $BASE/api/exam/test/bulk  # 401
R9_BASE_URL=$BASE npx tsx scripts/r9-container-exam-flow.ts               # EXAM_FLOW_PASS
```

The exam-flow script registers one throwaway user per run and the app limits
registration to 5/hour/IP; run it sparingly in production or against staging.

## 7. Rollback

- Render keeps previous deploys: **Rollback** to the last healthy deploy from
  the service's *Events* tab. Health check gates the switch.
- Migrations are forward-only. A rollback of the image does **not** revert the
  schema, so only roll back to an image that is compatible with the current
  schema. For a schema-incompatible change, restore from the last verified
  backup instead (`scripts/ops/backup-restore-test.sh` proves the dump restores).
- Cloudflare: switch the web records back to **DNS only** and repoint them at the
  previous origin; leave the mail records untouched.

## 8. Things that will break if done wrong

| Mistake | Symptom |
| :--- | :--- |
| `PERSIST_BACKEND` unset or `fs` | container exits at boot with the CRITICAL SECURITY REFUSAL message |
| `TRUST_PROXY=true` without Cloudflare in front | rate-limit keys can be spoofed via `CF-Connecting-IP` |
| `TRUST_PROXY=false` behind Cloudflare | all users share Cloudflare's IP; registration returns 429 after 5 attempts |
| `DATABASE_URL` = direct URL | pgbouncer/prepared-statement errors, connection exhaustion |
| `DIRECT_URL` = pooled URL | `prisma migrate deploy` hangs or fails |
| Cloudflare SSL mode `Flexible` | redirect loop (origin already redirects to HTTPS) |
| Editing MX/SPF/DKIM/`_dmarc` | inbound and outbound email breaks |
| Persistent disk added and used as storage | multi-instance divergence; `db` backend still required |

## 9. Email Outbox Consumer (Cron)

The email outbox consumer is scheduled in `render.yaml` as a cron service running every 5 minutes (`*/5 * * * *`).
It triggers the `CRON_SECRET`-protected internal endpoint:
```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/internal/email-outbox"
```
- **Authentication:** `CRON_SECRET` must match between the web service and the cron service (managed via environment variables, never committed).
- **Delivery Order:** Brevo first (REST), fallback to Resend upon failure.
- **Retry Policy:** Exponential backoff with jitter up to max configured attempts (`EMAIL_OUTBOX_MAX_ATTEMPTS`).
- **GitHub Actions Alternative:** A dormant workflow stub exists at `.github/workflows/email-outbox-cron.yml.disabled` for use if external cron runners are required.
