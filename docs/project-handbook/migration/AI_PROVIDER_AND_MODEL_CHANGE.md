# AI Provider and Model Change Plan

**Status:** Proposed lifecycle control for a future external model integration; no production provider/model deployment is verified by this repository scan.

## Change categories

Treat changes to provider, model/version, prompt, schema, safety filter, parsing logic, retention terms, region, or feature audience as a controlled change. A dependency appearing in `package.json` is not proof of runtime use. The inspected question route currently uses local parsing and a fixed question bank.

## Promotion sequence

`Change proposal → data/contract review → pinned config + rollback point → evaluation/red-team run → staff-only shadow/pilot (if safe) → owner approval → release → monitor → retain or roll back`

Before promotion, compare the candidate to the current approved baseline on answer correctness, explanations, bilingual parity, safety, latency, and cost. Preserve a tested prior configuration or deterministic fallback. If no provider exists, use the same checklist when introducing one; skip model-training steps unless actual training is proposed.

## Retraining decision

Continuous retraining is **not applicable by default** to a third-party hosted LLM that TrillionSkill does not train. If TrillionSkill later trains or fine-tunes a model, add dataset provenance and rights, privacy approval, reproducible experiments, model card, bias/fairness results, registry/approval flow, rollback, and deletion/retention controls before the first training run.

## Provider retirement

Plan for contract or model deprecation: identify feature owner and affected flows, inform staff, export only permitted records, switch to an approved provider or manual fallback, revoke credentials, delete provider-side data as contracted, validate no code path still calls the service, update the handbook and status page if needed, and retain audit evidence under approved retention. Coordinate final shutdown with the existing EOL and decommissioning documents.

