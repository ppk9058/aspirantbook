# Agent Policy – R12 (durable, for any agent)

## Session rules
- One session per worktree. Do not open a second terminal that writes.
- Stay on the current branch. Never create, switch, delete branches or worktrees.

## Forbidden git actions
`push`, `merge`, `rebase`, `reset`, `clean`, `stash`, `force`, branch/worktree deletion.
Commits only, prefix `R12-<step>:`.

## Evidence protocol
- All test/build/tsc output → `docs/evidence/raw/` logs. Print only `tail -5` + EXIT code.
- Every log ends with a line `EXIT:<n>`.
- Never `cat` large files; use `grep -n` and `sed -n` ranges.
- Do not re-read files you just wrote.

## Secrets
Never print `.env*` values, `.auth/` contents, real keys. Names/paths/counts only.

## Commit prefixes
- Step work: `R12-<step>: <description>`
- State updates: `R12-state: <description>`
- Work-in-progress: `R12-<step>-WIP: <description>`
- Control plane: `R12-ctl: <description>`

## Checkpoint protocol
**Before** a step: set IN_PROGRESS in STATE.md with HEAD SHA; commit `R12-state:`.
**After** a step:
1. Commit the step `R12-<step>:`
2. Update STATE.md row + append PROGRESS.md row (quote EXIT code from raw log)
3. Commit `R12-state:`
4. `git status --short` must be clean (only `data/form-submissions.json` untracked)

## Mid-step crash recovery
Run `git status` and `git diff --stat`. Finish or commit as `R12-<step>-WIP:`.
Mark IN_PROGRESS. Never reset, clean or stash.

## STOP conditions
- Quota or context warning → finish only the checkpoint, write HANDOFF, commit, end.
- A step cannot be marked DONE if its log shows EXIT other than 0.
- Max 2 fix attempts per problem → BLOCKED with evidence.

## Quality bar
- Fail-before and pass-after 5× in clean env per step.
- Full clean-env unit suite 5× only at CP1 (after Tier-1) and CP2 (R12-Z).
- No test/assertion removal. `git diff` for removed assert/expect/it(/test( = 0.

## Test environment
```
env -i HOME=$HOME PATH=$PATH NODE_ENV=test \
  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54329/trillionskill_test?schema=public" \
  DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54329/trillionskill_test?schema=public" \
  npm test
```
