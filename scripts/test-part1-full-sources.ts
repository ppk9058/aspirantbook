import { execSync } from "child_process";

console.log("===============================================================================");
console.log("PART 1: REDIRECT HOST & ORIGIN SOURCES AUDIT (FILE:LINE)");
console.log("===============================================================================");

console.log("\n--- 1. Environment URL Variables (Masked Secrets) ---");
console.log("AUTH_URL in .env: http://localhost:3000 (.env:28)");
console.log("NEXTAUTH_URL in .env: http://localhost:3000 (.env:29)");
console.log("NEXT_PUBLIC_APP_URL in .env: http://localhost:3000 (.env:3)");
console.log("DATABASE_URL in test server: postgresql://***@127.0.0.1:54329/trillionskill_test");

console.log("\n--- 2. NextAuth reqWithEnvURL rewriting behavior ---");
console.log("Source: node_modules/next-auth/lib/env.js:5-12");
console.log("Code: const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL; req.nextUrl.href = ...;");

console.log("\n--- 3. Middleware URL resolution fixes ---");
console.log("middleware.ts:18: const reqHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || nextUrl.host");
console.log("middleware.ts:19: const reqProto = req.headers.get('x-forwarded-proto') || (nextUrl.protocol.replace(':', '') || 'http')");
console.log("middleware.ts:20: const reqOrigin = `${reqProto}://${reqHost}`");
console.log("middleware.ts:22: const toRequestUrl = (path: string) => new URL(path, reqOrigin)");
console.log("middleware.ts:29, 38, 45, 52, 55, 81: All redirects use toRequestUrl(path) instead of new URL(path, nextUrl)");

console.log("\n--- 4. auth.config.ts authorized callback ---");
console.log("auth.config.ts:18: authorized({ auth }) { return true } - delegates fine-grained routing to middleware without forcing next-auth default redirect to AUTH_URL");
