# TrillionSkill Project Handbook

This folder contains the project-specific source documents included in the downloadable [complete project handbook](../TrillionSkill_Complete_Project_Documentation.docx). The DOCX has a clickable index and internal links; import it into Google Docs to preserve the text, tables, diagrams, and navigation.

## Read in this order

0. **Decide responsibly** — [AI feasibility and risk assessment](ai/AI_FEASIBILITY_AND_RISK.md) → [AI ethics and learner safety charter](ai/AI_ETHICS_AND_LEARNER_SAFETY.md).
1. **Scope product and data** — existing BRD / PRD / FRD / FRS / SRS → [AI feature requirements appendix](ai/AI_REQUIREMENTS_APPENDIX.md) → [Data governance and lineage](data/DATA_GOVERNANCE_AND_LINEAGE.md).
2. **Design the system** — [HLD](architecture/HLD.md) → [LLD](architecture/LLD.md) → [Technical Design Decisions](architecture/TDD.md) → [AI architecture decisions and data-flow maps](architecture/AI_ADR_AND_DFD_REGISTER.md) → [Engineering README](engineering/README.md) → [API reference](engineering/API_REFERENCE.md).
3. **Build and change safely** — [Development and prompt governance](engineering/AI_DEVELOPMENT_AND_PROMPT_GOVERNANCE.md) → [Test plan](quality/TEST_PLAN.md) → [Test cases](quality/TEST_CASES.md) → [Requirements traceability matrix](quality/RTM.md).
4. **Prove and release** — [AI evaluation and red-team plan](quality/AI_EVALUATION_AND_RED_TEAM_PLAN.md) → [Vulnerability assessment plan](quality/VAPT_SECURITY_REVIEW_PLAN.md) → [CI/CD and infrastructure release gates](deployment/CI_CD_AND_IAC_RELEASE_GATES.md) → [Release notes](deployment/RELEASE_NOTES.md) → [Deployment runbook](deployment/Runbook.md).
5. **Operate and learn** — [AI observability and incident controls](operations/AI_OBSERVABILITY_AND_INCIDENT_CONTROLS.md) → [SLA baseline](operations/SLA.md) → [Operating procedures](operations/SOP.md) → [Root cause analysis](operations/RCA.md).
6. **Change and retire safely** — [Data migration strategy](migration/DATA_MIGRATION_STRATEGY.md) → [AI provider and model change plan](migration/AI_PROVIDER_AND_MODEL_CHANGE.md) → [End-of-life plan](retirement/EOL_PLAN.md) → [Decommissioning protocol](retirement/DECOMMISSIONING_PROTOCOL.md).

The AI documents are **proposed governance and delivery controls** unless explicitly marked as verified repository behavior. They do not assert that a production LLM, model registry, feature store, training pipeline, or automated CI/CD deployment exists. Start with feasibility and learner safety; only then approve requirements, data handling, architecture, and release evidence.

## Why the order works

Each phase produces inputs the next phase needs: a safe and affordable use case leads to measurable requirements; requirements lead to data and architecture decisions; the implementation is evaluated and security-reviewed before controlled deployment; production signals then guide changes, migration, or retirement. The master DOCX includes this full index, clickable section links, flow maps, and the source contents.

These documents distinguish repository evidence from proposed controls and decisions that still need owners. Environment topology, CI/CD automation, production service levels, and operational metrics should be confirmed with the relevant project owners before being treated as current facts.
