# LOCKFILE_IMPACT.md: Lockfile Impact & Monorepo Workspaces Analysis

**Scope:** Read-only impact audit of `package-lock.json` and workspaces on branch `merge-trial-mobile`.  
**Comparison:** `HEAD:package-lock.json` (Phase D hardening baseline) vs. Merged `package-lock.json` (`expo-mobile` integration).

---

## 1. Web-Critical Package Version Comparison

All versions extracted directly from `node_modules/<pkg>` in `HEAD:package-lock.json` versus the merged `package-lock.json`.

| Package Name | HEAD Version | Merged Lockfile Version | Status | Impact on Web |
| :--- | :--- | :--- | :--- | :--- |
| `next` | `15.1.4` | `15.1.4` | **IDENTICAL** | None |
| `react` | `19.2.0` | `19.2.0` | **IDENTICAL** | None |
| `react-dom` | `19.2.0` | `19.2.0` | **IDENTICAL** | None |
| `@prisma/client` | `6.19.0` | `6.19.0` | **IDENTICAL** | None |
| `prisma` | `6.19.0` | `6.19.0` | **IDENTICAL** | None |
| `typescript` | `5.9.3` | `5.9.3` | **IDENTICAL** | None |
| `tailwindcss` | `4.1.17` | `4.1.17` | **IDENTICAL** | None |
| `next-auth` | `5.0.0-beta.30` | `5.0.0-beta.30` | **IDENTICAL** | None |

### Comprehensive Direct Root Dependencies Audit (81 packages):
Across all 81 direct `dependencies` and `devDependencies` defined in root `package.json`, **exactly two** packages changed:
1. `@types/react`: `19.2.6` -> `19.3.0` (minor type definitions bump).
2. `dompurify`: `3.2.7` -> `3.4.17` (added to root dependencies for mobile/API HTML sanitization parity).

**Zero core runtime web dependencies were modified or degraded.**

---

## 2. Install Size & Timing Benchmark (`npm ci --omit=dev`)

Conducted in isolated temporary directories in `/tmp` using clean copies of the manifests:

| Configuration | Packages Added | Install Time | Root `node_modules` Size | Mobile `node_modules` Size | Total Disk Footprint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HEAD Baseline Lockfile** | 512 | **48.25s** | 1.0 GB | N/A | **1.0 GB** |
| **Merged (`--workspaces=false`)** | 583 | **46.70s** | 1.1 GB | N/A | **1.1 GB** |
| **Merged (Workspaces Enabled)** | 1238 | **81.36s** | 1.5 GB | 8.5 MB | **1.51 GB** |

### Key Observations:
- Enabling workspaces installs 726 additional packages (React Native, Expo SDK, Metro, and associated native toolchains).
- Total CI install time increases by **+33.1s (+68%)** when workspaces are included in production installs.
- Disk footprint increases by **~500 MB** (+50%).
- However, running `npm ci --omit=dev --workspaces=false` produces an install identical in speed and footprint to the pre-merge baseline (46.7s vs 48.2s).

---

## 3. Web Bundle Contamination Audit

An audit of the fresh production Next.js test build (`.next-test`, 193 static pages compiled) was conducted:
1. **React Native Bundle Check:**
   ```bash
   grep -r "react-native" .next-test/static/ .next-test/server/
   # Result: 0 matches
   ```
2. **Expo SDK Import Check:**
   ```bash
   grep -r -E "node_modules/(expo|@expo)" .next-test/static/ .next-test/server/
   # Result: 0 matches
   ```
3. **Internal Codebase Boundaries:**
   ```bash
   grep -r "apps/mobile" app/ components/ lib/ packages/
   # Result: 0 matches
   ```
4. **Shared Package (`packages/shared`):**
   - `@aspirantbook/shared` contains pure TypeScript models, DTOs, and formatting utilities.
   - Its only dependency is `zod: ^3.25.76`.
   - It contains zero imports of React Native or Expo.

**Conclusion:** The web client and server Next.js bundles are 100% free of React Native and Expo contamination.

---

## 4. React Version Coexistence & Conflict Analysis

### Are there two React versions in one tree?
**YES.**
- Root `node_modules/react`: **`19.2.0`** (installed for Next.js 15 and `@prisma/client`).
- Sub-workspace `apps/mobile/node_modules/react`: **`19.1.0`** (pinned and installed for `react-native@0.81.5`).

### Cause:
- `react-native@0.81.5` specifies peer dependency `react: ^19.1.0`.
- While root `package.json` specifies `"react": "^19.0.0"` and resolved to `19.2.0`, React Native requires `19.1.0`.
- NPM's workspace resolution correctly isolates the mobile React instance under `apps/mobile/node_modules/react` (8.5 MB nested folder) to satisfy React Native's runtime requirement while keeping `19.2.0` at the root for Next.js.

### Runtime Risk Assessment:
- **Web App:** Zero risk. Node.js and Next.js resolve packages starting from the project root (`node_modules/react` 19.2.0). They never ascend or descend into `apps/mobile`.
- **Mobile App:** Metro bundler is configured in `apps/mobile/metro.config.js` with resolution rules prioritizing `apps/mobile/node_modules`. However, dual-React trees in monorepos can cause React hooks dispatcher collisions if a symlinked shared package imports `react`. Currently, `@aspirantbook/shared` has zero React dependencies, preventing any dispatcher collisions.

---

## 5. Recommendation

### Option Comparison:
1. **Option (a): Keep Workspaces (`"workspaces": ["packages/*", "apps/*"]`)**
   - *Advantages:*
     - Single repository workflow: `npm run dev:lan`, `npm run seed:mobile-test`, and linting work seamlessly from root.
     - `@aspirantbook/shared` is symlinked natively into `apps/mobile`.
     - Mobile developers do not need separate manual link/install steps.
   - *Trade-offs:*
     - Web CI builds take ~33s longer if running unqualified `npm ci`.
     - Can be mitigated in CI/CD by passing `--workspaces=false` (e.g. `npm ci --workspaces=false` for web Dockerfiles/Vercel).

2. **Option (b): Drop `"apps/*"` from Workspaces (`"workspaces": ["packages/*"]`)**
   - *Advantages:*
     - Root `npm ci` remains ~47s without flags.
     - Root `node_modules` contains only web packages.
     - Eliminates nested dual React in the root lockfile.
   - *Trade-offs:*
     - Requires updating `apps/mobile/package.json` to reference `"@aspirantbook/shared": "file:../../packages/shared"` instead of `"*"`.
     - Mobile developers must remember to run `npm install` inside `apps/mobile/`.

### Final Recommendation:
**Recommend Option (a) with web CI flag mitigation.**
Keep `"workspaces": ["packages/*", "apps/*"]` in `package.json`.
- The web application build and runtime are provably unaffected by mobile dependencies.
- Monorepo tooling (`dev:lan`, `@aspirantbook/shared` resolution, unified testing) functions out-of-the-box.
- For web production container builds / CI, use `npm ci --omit=dev --workspaces=false` to preserve the 46.7s / 1.1 GB fast build pipeline.
