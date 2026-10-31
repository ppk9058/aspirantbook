# Push-ready checklist (owner commands)

Branch `feat/launch-blockers`, 16 commits ahead of `r7d-green-2026-10-31`,
nothing pushed. Every command below is for the owner to run. Nothing in this
document was executed against a remote.

Evidence behind each item:

- `docs/evidence/raw/r9-s7-ci-sim.txt` — every `ci.yml` job replayed on a fresh
  `git clone --no-hardlinks` + `npm ci`
- `docs/evidence/raw/r9-s7-gitleaks.txt` — full-history secret scan
  (613 commits, 44 findings, no live keys)
- `docs/evidence/raw/r9-s7-git-hygiene.txt` — branch/tracked/untracked state

## 1. Blocking decisions before the push

| # | Item | Why it blocks | Owner action |
| :--- | :--- | :--- | :--- |
| 1 | CI `test` job is red **on the baseline too** | `tests/unit/connection-limit-validator.test.ts:56` appends `?connection_limit=3` to a `DATABASE_URL` that CI already sets to `...?connection_limit=10`, and `tests/unit/course-metadata-db.test.ts` requires a seeded course that CI never creates. Both files and `ci.yml` are byte-identical to `r7d-green-2026-10-31`. | Decide: (a) drop `?connection_limit=10` from `ci.yml`'s `DATABASE_URL`, and (b) add `npm run seed:test` before the unit step (or point the test at a fixture). Editing the tests was out of scope. |
| 2 | Two pre-existing mobile unit failures | `apps/mobile` suite is 265/267 on 5/5 runs; failures exist at the baseline (`settings.tsx` no longer contains `deleteMe`; `app.config.ts` guard contains literal `localhost`). | Decide whether the test or the product contract is stale. Not edited. |
| 3 | `sk_test_...` Stripe key in history | `TrillionSkill/docs/PAYMENT_TESTING.md` line 12, commit `89c29690647f` (pre-R9 subtree import). Test-mode only; no live key anywhere. | Rotate that test key in the Stripe dashboard. Purging history is optional and would need a rewrite. |
| 4 | Local verification token in an R9 evidence log | `docs/evidence/raw/r9-s1-web-unit-1x.txt:3298` contains a `DevEmailOutbox` verification link token from the throwaway `127.0.0.1` test DB (hex64, expired, not a credential). | Either accept it or squash `feat/launch-blockers` before pushing. History was not rewritten. |
| 5 | Owner inputs for the runbooks | `docs/runbooks/staging-neon.md`, `docs/runbooks/render-cloudflare.md` | Neon pooled+direct URLs, Render account/service, pincode confirmation, `grievance@` alias, legal review, CA retention check. |

## 2. Commands (owner, in order)

```bash
# 1. Confirm the branch is what you expect (nothing pushed yet)
git log --oneline r7d-green-2026-10-31..HEAD
git status --short

# 2. Re-run the local gates one last time
npm run lint
npx tsc --noEmit
./scripts/r7d-clean-env-suite.sh /tmp/final-unit.log
cd apps/mobile && npx tsc --noEmit && cd ../..

# 3. Push the branch and the readiness tag
git push -u origin feat/launch-blockers
git push origin r9-ready-2026-10-31

# 4. Open the PR against main (CI will run; see item 1 above)
gh pr create --base main --head feat/launch-blockers \
  --title "R9 launch blockers" --fill
```

## 3. After the PR is green

1. Neon project + pooled/direct URLs → `DIRECT_URL='...' scripts/ops/migrate-deploy.sh`.
2. Render Docker service with the env names in `docs/runbooks/render-cloudflare.md`
   (`PERSIST_BACKEND=db` mandatory).
3. Cloudflare DNS cutover exactly as written there: MX `route1-3.mx.cloudflare.net`,
   SPF, DKIM `cf2024-1` and `_dmarc` stay untouched; apex + www CNAME first
   DNS-only, then proxied; SSL Full (strict); www→apex 301.
4. Smoke checks: `/api/health` 200 + `migrations.pending: 0`,
   `/admin` 307, `/api/admin` 401, `/api/auth/role` 404,
   `POST /api/exam/test/bulk` 401, exam flow `EXAM_FLOW_PASS`.
5. Turnstile on; WAF next phase.

## 4. Deliberately not done

- No history rewrite, no `git gc`, no branch switching, no force flags.
- `data/form-submissions.json` is untracked local runtime output and must stay
  out of the commit.
- `docs/design_walkthrough.pdf` (11.5 MB) is already tracked; not touched.
- `actionlint` is not installed, so the workflow YAML was executed step by step
  instead of linted.
- `gitleaks dir` findings under `.next/` and `logs/` are build artefacts and a
  gitignored dev email outbox; neither is tracked.
