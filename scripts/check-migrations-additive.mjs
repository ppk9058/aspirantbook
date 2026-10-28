#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "prisma", "migrations");

// Explicit allowlist of pre-existing historical migrations that contained non-additive operations
// Format: "migration_dir:line_number" -> justification
const ALLOWLIST = {
  "20261006002100_drop_redundant_couponredemption_unique:2":
    "Historical index cleanup: redundant unique index dropped in favor of CouponRedemption_paymentId_key",
  "20261006085000_add_razorpay_columns_to_payment:2":
    "Historical index migration: json-expression index idx_payment_razorpay_order_id dropped when real column added",
  "20261006085000_add_razorpay_columns_to_payment:3":
    "Historical index migration: json-expression index idx_payment_razorpay_payment_id dropped when real column added",
  "20261009153000_drop_series_logo_default:2":
    "Historical column constraint change: DROP DEFAULT on ExamSeries.logoType to avoid implicit default",
  "20261012141500_add_current_affairs_pdf:2":
    "Additive enum value expansion: ALTER TYPE ExamTestType ADD VALUE CURRENT_AFFAIRS",
  "20261028174115_audit2_b6_revenue_metrics_nullable:11":
    "Historical column relaxation: DROP NOT NULL on RevenueAnalytics.mrr to allow nullable metrics",
  "20261028174115_audit2_b6_revenue_metrics_nullable:12":
    "Historical default removal: DROP DEFAULT on RevenueAnalytics.mrr",
  "20261028174115_audit2_b6_revenue_metrics_nullable:13":
    "Historical column relaxation: DROP NOT NULL on RevenueAnalytics.arr to allow nullable metrics",
  "20261028174115_audit2_b6_revenue_metrics_nullable:14":
    "Historical default removal: DROP DEFAULT on RevenueAnalytics.arr",
  "20261028174115_audit2_b6_revenue_metrics_nullable:15":
    "Historical column relaxation: DROP NOT NULL on RevenueAnalytics.churnRate to allow nullable metrics",
  "20261028174115_audit2_b6_revenue_metrics_nullable:16":
    "Historical default removal: DROP DEFAULT on RevenueAnalytics.churnRate",
};

// Patterns to detect potentially destructive or non-additive SQL statements:
// DROP, TRUNCATE, DELETE, ALTER ... TYPE, RENAME
// Note: Ignore foreign key actions like "ON DELETE CASCADE" or "ON DELETE SET NULL"
const DESTRUCTIVE_PATTERNS = [
  { name: "DROP", regex: /\bDROP\b/i },
  { name: "TRUNCATE", regex: /\bTRUNCATE\b/i },
  { name: "DELETE", regex: /(?<!ON\s+)\bDELETE\b/i },
  { name: "ALTER ... TYPE", regex: /ALTER\s+.*?\bTYPE\b/i },
  { name: "RENAME", regex: /\bRENAME\b/i },
];

export function checkAdditiveMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.error(`[check-migrations-additive] Migrations directory not found at: ${migrationsDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const violations = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sqlFile = path.join(migrationsDir, entry.name, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    const content = fs.readFileSync(sqlFile, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("--") || trimmed.startsWith("/*")) return;

      for (const pattern of DESTRUCTIVE_PATTERNS) {
        if (pattern.regex.test(trimmed)) {
          const key = `${entry.name}:${lineNum}`;
          if (ALLOWLIST[key]) {
            // Permitted with explicit justification
            continue;
          }
          violations.push({
            migration: entry.name,
            line: lineNum,
            pattern: pattern.name,
            code: trimmed,
          });
        }
      }
    });
  }

  if (violations.length > 0) {
    console.error(`\n[FAIL] Found ${violations.length} non-additive migration statements without allowlist approval:\n`);
    for (const v of violations) {
      console.error(`  ${v.migration}:${v.line} [${v.pattern}]: ${v.code}`);
    }
    console.error("\nAny destructive migration requires explicit justification in the allowlist in scripts/check-migrations-additive.mjs.\n");
    return false;
  }

  console.log(`[PASS] All migrations are strictly additive. Scanned ${entries.length} migration folders with zero unallowlisted violations.`);
  return true;
}

try {
  if (fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
    const success = checkAdditiveMigrations();
    process.exit(success ? 0 : 1);
  }
} catch {
  // If invoked programmatically or path mismatch
}
