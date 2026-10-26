# WORKSPACE_TRIAL.md: Monorepo Workspaces Architectural Evaluation

**Scope:** Empirical trial comparing three monorepo workspace configurations on branch `merge-trial-mobile`.  
**Context:** Web code imports `@aspirantbook/shared` in 27 locations (`app/api/v1/**`, `lib/services/**`, `lib/exam-grading.ts`). Pure `--workspaces=false` breaks `@aspirantbook/shared` module resolution. All experiments were conducted in isolated temporary copies (`/tmp/workspace-trial-*`).

---

## 1. Options Defined

- **Option A (Targeted Workspace Flag):**
  - Root `package.json` retains `"workspaces": ["packages/*", "apps/*"]`.
  - Mobile references `"@aspirantbook/shared": "*"`.
  - Web CI runs: `npm ci --omit=dev --workspace=@aspirantbook/shared --include-workspace-root`.

- **Option B (Decoupled Mobile Workspace):**
  - Root `package.json` sets `"workspaces": ["packages/*"]` (drops `"apps/*"`).
  - Mobile `apps/mobile/package.json` sets `"@aspirantbook/shared": "file:../../packages/shared"`.
  - Web CI runs standard `npm ci --omit=dev` with no special workspace flags.
  - Mobile dependencies are managed strictly within `apps/mobile/` (`cd apps/mobile && npm install`).

- **Option C (Full Monorepo Workspaces):**
  - Root `package.json` retains `"workspaces": ["packages/*", "apps/*"]`.
  - Web CI runs default unqualified `npm ci --omit=dev`.

---

## 2. Empirical Benchmark Matrix

| Metric | Option A (Targeted Flag) | Option B (Decoupled Mobile) | Option C (Full Monorepo) |
| :--- | :--- | :--- | :--- |
| **Root Workspaces Setting** | `["packages/*", "apps/*"]` | `["packages/*"]` | `["packages/*", "apps/*"]` |
| **Web CI Command** | `npm ci --omit=dev --workspace=@aspirantbook/shared --include-workspace-root` | `npm ci --omit=dev` (standard) | `npm ci --omit=dev` (standard) |
| **Web Install Time** | **35.06s** | **41.34s** | **81.36s** (+40-46s / +100%) |
| **Packages Added (Web)** | 584 | **518** | 1238 (+720 packages) |
| **Root `node_modules` Size** | 1.0 GB | 1.0 GB | 1.51 GB (+510 MB) |
| **`@aspirantbook/shared` Linked?**| Yes (`node_modules/@aspirantbook/shared` symlinked) | Yes (`node_modules/@aspirantbook/shared` symlinked) | Yes |
| **Next.js Web Build** | **PASS** (182 static pages compiled) | **PASS** (182 static pages compiled) | **PASS** (182 static pages compiled) |
| **Root `tsc --noEmit` Errors** | 73 (0 module errors) | 73 (0 module errors) | 75 (0 module errors) |
| **Dual React in Root Lockfile** | Yes (`19.2.0` root, `19.1.0` mobile) | **No** (Root has only `19.2.0`) | Yes (`19.2.0` root, `19.1.0` mobile) |
| **Mobile Setup Command** | None (installed by root) | `cd apps/mobile && npm install` (49s) | None (installed by root) |
| **Mobile `tsc --noEmit`** | 0 errors | **0 errors** | 0 errors |
| **Mobile Test Suite (26 tests)** | 26 passed / 0 failed | **26 passed / 0 failed (895ms)** | 26 passed / 0 failed |

---

## 3. Workflow & Boundary Impact

### Option A Impact:
- **Pros:** Zero file changes across the repo; mobile developer workflow remains a 1-step root install; monorepo root commands (`npm run dev:lan`) work immediately without running a secondary install.
- **Cons:** Any external CI/CD runner (Docker, Vercel, GitHub Actions) for the web app must be configured with the specific flag `--workspace=@aspirantbook/shared --include-workspace-root`. If omitted, CI defaults to Option C.

### Option B Impact:
- **Pros:** Completely isolates web and mobile dependencies. Root `package-lock.json` remains clean of Expo/React-Native packages and dual-React versions. Standard `npm ci` works everywhere without special flags. Mobile builds have their own dedicated `apps/mobile/package-lock.json`.
- **Cons:** Mobile developers must run `cd apps/mobile && npm install` whenever mobile dependencies or `@aspirantbook/shared` change. Root scripts interacting with mobile require `apps/mobile/node_modules` to exist.

### Option C Impact:
- **Pros:** Simplest developer setup (single `npm install` for everything).
- **Cons:** Unacceptably penalizes web CI builds with ~81s install times and +510MB of unused React Native dependencies, while contaminating the root lockfile with dual React versions.

---

## 4. Recommendation

### **Recommend: Option B (Decoupled Mobile Workspace)**

> **One-line reasoning:** Option B provides complete architectural isolation—keeping the root lockfile pure of mobile/React-Native dependencies, eliminating dual-React hazards, and allowing standard `npm ci` for web deployments without custom flags, while cleanly symlinking `@aspirantbook/shared` via `"file:../../packages/shared"` with 100% test pass rates on both web and mobile.
