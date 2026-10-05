# AI Evaluation and Red-Team Plan

**Status:** Proposed release gate for question-authoring assistance. No evaluation scores are claimed in this document.

## Evaluation set

Create a versioned, rights-cleared set of representative questions reviewed by subject experts. Include Indian exam-preparation subjects and topics, varied difficulty, English and Hindi examples, malformed source papers, ambiguous answer keys, duplicate questions, and adversarial input. Keep any learner-identifiable data out unless separately approved. Record the dataset owner, source rights, version, and access policy.

## Quality dimensions

| Dimension | What reviewers check | Release evidence |
|---|---|---|
| Factual accuracy | Statement and explanation agree with authoritative source | Expert rubric and answer-key verification |
| Answer correctness | Exactly one defensible correct option; key matches explanation | Independent subject reviewer |
| Curriculum alignment | Topic, exam, and level match request | Curriculum rubric |
| Language quality | Natural, equivalent English and Hindi; no fabricated translation | Bilingual reviewer results by language |
| Completeness | Required fields and four options are present and parse correctly | Automated schema results plus sampled human review |
| Robustness | Handles ambiguous, malformed, empty, very long, or adversarial input | Regression fixtures and red-team log |
| Safety and rights | No unsafe instruction, exposed personal data, or unauthorized reproduction | Security/privacy/content sign-off |
| Utility | Teacher edits, accepts, rejects, and time-to-finalize | Pilot metrics with baseline and cohort definition |

Set numeric thresholds with the product and academic owners before the pilot. Do not convert an unmeasured “accuracy” estimate into a public claim.

## Red-team scenarios

- Prompt injection embedded in pasted paper text asks to ignore rules or expose secrets.
- Content requests private learner data, hidden prompts, provider credentials, or unrelated records.
- Incorrect/missing answer keys, two correct options, no correct option, misleading explanations.
- Discriminatory, abusive, age-inappropriate, or unsafe output; code-execution or cheating advice.
- English/Hindi mismatch, transliteration errors, or output that claims translation without evidence.
- Very large input, repeated retries, provider timeout, malformed JSON, and service outage.
- Copyrighted question content copied verbatim without a documented right to use it.

## Release decision

Block release for a material answer-key error, unauthorized data transfer, exposed personal data, unsafe learner-facing output, or bypass of the human approval boundary. For lower-severity issues, define owner, severity, mitigation, due date, and accepted residual risk. Store evaluation version, results, failed examples with sensitive content redacted, reviewer, and decision alongside release evidence.

## Flow

`Versioned gold set → automated schema/security checks → blinded expert review → red-team cases → compare to baseline → named go/no-go → release evidence`

