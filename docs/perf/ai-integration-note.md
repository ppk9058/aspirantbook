# AI Layer Integration Note: Question Cache Invalidation

**Target Branch:** `feat/ai-layer`  
**Integration Module:** `lib/exam-runtime/cache-invalidation.ts`  
**Hook Function:** `onAiQuestionTranslationBatchApproved(testId: string, questionIds: string[]): Promise<void>`

---

## 1. Context & Rationale
When batch translations are approved in the AI Studio (`feat/ai-layer`), regional language content (`questionHi`, `optionAHi`, `explanationHi`, etc.) is committed directly to the `ExamQuestion` table in Postgres.

If `EXAM_RUNTIME_CACHE_QUESTIONS=true`, student attempt clients consume question payloads from the sanitized question cache (`lib/exam-questions-cache.ts`). Without explicit cache invalidation:
1. Students currently taking or starting the exam would continue seeing empty or old Hindi translations until the TTL expires.
2. Cross-instance deployments might serve stale questions across different worker nodes.

---

## 2. Exact Invocation Location in `feat/ai-layer`

In `app/api/admin/content-engine/hindi/review/route.ts` (or `app/actions/ai/batch-translate.ts`):
When the admin hits the "Approve & Apply Translations" endpoint:

```ts
import { onAiQuestionTranslationBatchApproved } from "@/lib/exam-runtime/cache-invalidation";

// ... inside the batch approval transaction / handler after prisma.examQuestion.updateMany:
await prisma.$transaction(
  approvedTranslations.map((t) =>
    prisma.examQuestion.update({
      where: { id: t.questionId },
      data: {
        questionHi: t.questionHi,
        optionAHi: t.optionAHi,
        optionBHi: t.optionBHi,
        optionCHi: t.optionCHi,
        optionDHi: t.optionDHi,
        explanationHi: t.explanationHi,
      },
    })
  )
);

// CRITICAL CACHE INVALIDATION HOOK:
// Evicts Redis / in-memory question cache and triggers version bump across all instances
await onAiQuestionTranslationBatchApproved(testId, approvedQuestionIds);
```

---

## 3. Guarantees Provided
1. **Immediate Invalidation:** `deleteCache("exam:sanitized-questions:v1:<testId>")` runs synchronously.
2. **Inter-Process Protection:** `getExamQuestionsVersion(testId)` aggregates `max(q.updatedAt)`. Because `prisma.examQuestion.update` updates `updatedAt`, every other process or server container detects the version mismatch on its next request and reloads fresh translations from the database.
3. **Zero Answer Leakage:** Cache invalidation maintains strict zero-leakage security rules (`correctOption` and explanations remain stripped in sanitized payloads).
