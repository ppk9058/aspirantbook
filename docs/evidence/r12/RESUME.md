# R12 Resume Protocol

## Checkpoint protocol (repeat around every step)

### Before a step
1. Set the step `IN_PROGRESS` in `docs/evidence/r12/STATE.md` with current HEAD SHA
2. Commit: `R12-state: <step> in progress`

### After a step
1. Commit the step work: `R12-<step>: <description>`
2. Update STATE.md row (status DONE, commit SHA, evidence log path)
3. Append one summary row to `docs/evidence/PROGRESS.md` (quote EXIT code)
4. Commit: `R12-state: <step> done`
5. Verify: `git status --short` shows only `?? data/form-submissions.json`

### Handoff
If quota/context runs low: finish checkpoint, write `HANDOFF: <UTC> HEAD <sha> next <step>` at top of STATE.md, update REVIEW-PACKET.md, commit, stop.

---

## Resume prompt (paste-ready)

```
ROLE: continuing R12 in /Users/praveenkumar/ws-launch (branch feat/launch-blockers).
Ignore chat history. Read docs/process/AGENT-POLICY.md, then docs/evidence/r12/STATE.md;
read docs/evidence/r12/SPEC.md only for the step you take.
Run cd /Users/praveenkumar/ws-launch, git status --short, git log --oneline -5.
Resume the first IN_PROGRESS step, else the first TODO in the order of STATE.md.
Follow the checkpoint protocol. When every step is DONE, BLOCKED or SKIPPED,
write docs/evidence/r12/REVIEW-PACKET.md and stop.
```
