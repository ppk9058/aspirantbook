# AI Development and Prompt Governance

**Applies when:** TrillionSkill changes deterministic parsing, adds a hosted model, or changes prompts, provider/model configuration, output schemas, or AI-assisted editorial workflows.

## Change lifecycle

1. Link the change to an approved requirement and ADR; identify affected roles, data, and content.
2. Keep prompts and schemas versioned with code. Record provider/model identifiers and configuration without committing secrets.
3. Review the diff for authorization, input size, rate limits, secret handling, injection resistance, safe output rendering, and manual fallback.
4. Run unit and integration checks plus the relevant AI evaluation and red-team suites; compare with a named baseline.
5. Require a human approver for content-impacting behavior. Document material changes in release notes.
6. Deploy gradually where supported; monitor quality, errors, latency, cost, and reports. Roll back prompt/config/code together if the gate regresses.

## Version record

For each released behavior, record change ID, route/feature, prompt version or parser version, provider/model version if applicable, schema version, evaluation dataset version, approval, release, and rollback target. Secrets and raw learner prompts do not belong in the record.

## Training and experiments

No model training, MLflow experiment tracking, feature store, or model registry is evidenced for the inspected feature. Do not create those processes by assumption. If training is later approved, add a separate data-provenance, experiment, reproducibility, model-card, and approval workflow before collecting training data.

