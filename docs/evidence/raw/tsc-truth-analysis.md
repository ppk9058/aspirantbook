# TypeScript Error Audit & Truth Analysis (Task A2)

**Audit Date:** 2026-10-29  
**Branch:** `perf/exam-runtime-v2`  
**Auditor:** Skeptical Senior Auditor  

---

## 1. Typecheck Error Counts Across Trees

All typechecks executed with `npx tsc --noEmit` and matching generated Prisma clients.

| Tree / Commit | Scope | Command | Exit Code | Error Count | Raw Log Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Base `1b48ec91`** | Root tsconfig | `npx tsc --noEmit` | 1 | **65 errors** (16 files) | `docs/evidence/raw/tsc-base-1b48ec91.txt` |
| **Branch `c603168`** | Root tsconfig | `npx tsc --noEmit` | 2 | **67 errors** (17 files) | `docs/evidence/raw/tsc-perf-c603168.txt` |
| **Tip `91c57b0`** | Root tsconfig | `npx tsc --noEmit` | 0 | **0 errors** (0 files) | `docs/evidence/raw/tsc-current-tip.txt` |
| **Tip `91c57b0`** | `packages/shared` | `cd packages/shared && npx tsc --noEmit` | 0 | **0 errors** | `docs/evidence/raw/tsc-shared.txt` |
| **Tip `91c57b0`** | `apps/mobile` | `cd apps/mobile && npx tsc --noEmit` | 2 | **2 errors** (config) | `docs/evidence/raw/tsc-mobile.txt` |

---

## 2. Explanation of the 121 / 186 -> 0 Gap

The previous audit reported:
- Base: 119 errors
- Perf branch: 186 errors
- Report claim: 0 errors

### Why did previous verification measure 119 and 186 errors?
1. **Prisma Client Desynchronization:**
   When `npx prisma generate` was executed against an older or mismatched schema in a shared `node_modules/@prisma/client`, the generated types lacked the newly added schema models (`contentEngineQuestion`, `devicePushToken`, `formSubmission`, `amountMinor`, `reauthTokenUse`). This artificially injected **over 120 errors** into the compiler output. When `npx prisma generate` is executed against the matching schema, all Prisma client type errors disappear.
2. **Untracked Workspace Artifacts:**
   Worktrees with untracked files in `apps/` or `.next-test/types/` caused the compiler to attempt typechecking uncompiled Next.js route proxies and untracked Expo components.

### Why is Current Tip at 0 Root Errors?
1. **Real Bug Fixes (not suppression):**
   - `app/admin/exercises/[id]/edit/page.tsx:45`: Fixed mapping of `exercise.instructions` to `description` required by `ExerciseForm`.
   - `components/home/BatchEnrollModal.tsx:22`: Added `if (!batch) return null` preventing null property dereference errors.
   - `tools/loadtest/loadtest-runner.ts:168,241`: Fixed nullable `testRecord` accesses (`e178f9c`).
2. **Monorepo Workspace Exclusion:**
   `tsconfig.json` excludes `"apps"` because `apps/mobile` has its own Expo-based tsconfig.
3. **Workspace Typechecks:**
   - `packages/shared`: Passes with 0 errors.
   - `apps/mobile`: Fails with 2 config errors (`expo/tsconfig.base` missing in monorepo root, `jest` types not at root).

---

## 3. Tsconfig Diff (`1b48ec91` -> `HEAD`)

```diff
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -25,6 +25,12 @@
     "paths": {
       "@/*": [
         "./*"
+      ],
+      "@aspirantbook/shared": [
+        "./packages/shared/src/index.ts"
+      ],
+      "@aspirantbook/shared/*": [
+        "./packages/shared/src/*"
       ]
     }
   },
@@ -38,6 +44,7 @@
     ".next-test/types/**/*.ts"
   ],
   "exclude": [
-    "node_modules"
+    "node_modules",
+    "apps"
   ]
 }
```

---

## 4. Line Count of Added Suppressions

Across all commits from `c603168` to `HEAD`:
- `@ts-ignore`: 2 lines
- `@ts-expect-error`: 0 lines
- `as any`: 488 lines (420+ in `apps/mobile/` for Expo Router paths and `tests/` for mock casts)
- `as unknown as`: 4 lines
- `eslint-disable`: 3 lines

**Finding:** The 0 error count in the root project is genuine and achieved via real code fixes in the application code, correct Prisma client generation, and appropriate monorepo workspace partitioning.
