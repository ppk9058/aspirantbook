# TrillionSkill API Reference

**Status:** Route-family overview, not a generated OpenAPI contract  
**Audience:** UI, integration, QA, and support engineers

## Contract note
The authoritative contract is each current route handler and server action. This guide groups known route families; exact verbs, payload fields, response shapes, role gates, and status codes must be checked against code before client integration. API availability depends on runtime configuration.

## Route families
| Family | Representative path | Purpose | Core safeguards |
|---|---|---|---|
| Auth | `/api/auth/*`, `/api/auth/role`, `/api/auth/mobile-login` | Sessions, role/session support | Safe return paths; secure session configuration |
| Courses | `/api/courses/enroll`, `/api/courses/progress`, `/api/courses/[slug]/demo-slots` | Enrollment, progress, demos | Auth, ownership, published/access checks |
| Exams | `/api/exam/series/*`, `/api/exam/attempt/*`, `/api/exam/[testId]/*` | Discovery, start, sync, submit, result | Entitlement, attempt ownership, server deadline, stale-write rejection |
| Assessments | `/api/assessments/[id]/start`, `/api/assessments/attempts/[attemptId]/submit` | Assessment attempt lifecycle | Auth, availability, ownership, validated answers |
| Admin | `/api/admin/*` | Staff content and operational actions | Server-side ADMIN/TEACHER policy and input validation |
| Checkout and payments | `/api/checkout/*`, `/api/verify-payment/razorpay` | Create/verify payments | Server-calculated amount, provider verification |
| Webhooks | `/api/webhooks/stripe`, `/api/webhooks/razorpay` | Provider event processing | Signature verification, idempotent state transitions |
| Uploads | `/api/upload/*` | Upload/sign URLs | MIME/size allowlist, ownership and private access control |
| Execution | `/api/execute` | Delegate code execution | Auth, input/size validation, bounded timeout, external isolation review |
| Classroom | `/api/classroom/*`, `/api/courses/demo/*` | Live/demo interactions | Role, token scope, provider setup and consent policy |

## Standard client behavior
Send only documented fields, handle 401/403/404/409/429/5xx where returned, and surface a useful retry/support path. Do not treat browser payment redirects as proof of payment. Do not assume all APIs share one response envelope. Use idempotency and request correlation only where the route contract supports them.

## Authorization matrix (baseline)
| Actor | Typical access | Restriction |
|---|---|---|
| Guest | Public landing/catalog routes | No private learner data |
| Student/learner | Own courses, attempts, profile, purchases | Cannot cross-read or mutate another user’s records |
| Teacher | Explicitly granted content/classroom operations | No admin-only settings or user operations unless separately allowed |
| Admin | Authorized administration | All mutations still validate inputs and preserve audit/data rules |

## Keeping this reference accurate
For a change, link the route file, request/response schema, auth helper, Prisma model, tests, and RTM ID in the pull request. A future generated OpenAPI spec should be produced from validated route schemas, not inferred from paths alone.
