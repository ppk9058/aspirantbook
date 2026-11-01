import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");
const BACKUP_SCRIPT = path.join(ROOT, "scripts/ops/db-backup-to-s3.sh");
const ROLLBACK_RUNBOOK = path.join(ROOT, "docs/runbooks/rollback.md");
const FALLBACK_TEST_DB = "postgresql://postgres:testpassword123@127.0.0.1:54329/trillionskill_test?schema=public";

function resolveTestDatabaseUrl(): string {
  const candidates = [process.env.DATABASE_URL, process.env.DIRECT_URL, FALLBACK_TEST_DB];

  for (const candidate of candidates) {
    if (!candidate) continue;

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error("Database target must be a valid PostgreSQL URL");
    }

    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      throw new Error("Database target must use 127.0.0.1 or localhost");
    }
    if (!databaseName.endsWith("_test")) {
      throw new Error("Database target must use a database ending in _test");
    }

    return candidate;
  }

  throw new Error("No test database target available");
}

const TEST_DB = resolveTestDatabaseUrl();
const TEST_DB_TARGET = new URL(TEST_DB);
// Prisma accepts driver-only query parameters that libpq/pg_dump rejects.
TEST_DB_TARGET.search = "";
TEST_DB_TARGET.hash = "";
const BACKUP_DB_URL = TEST_DB_TARGET.toString();

describe("R12-G: Database backup, restore verification and rollback runbook", () => {
  it("G-R12-01: scripts/ops/db-backup-to-s3.sh exists and is executable", () => {
    assert.ok(fs.existsSync(BACKUP_SCRIPT), "db-backup-to-s3.sh must exist");
    const stat = fs.statSync(BACKUP_SCRIPT);
    const isExecutable = Boolean(stat.mode & 0o111);
    assert.ok(isExecutable, "db-backup-to-s3.sh must be executable");
  });

  it("G-R12-02: docs/runbooks/rollback.md exists and covers all required sections", () => {
    assert.ok(fs.existsSync(ROLLBACK_RUNBOOK), "docs/runbooks/rollback.md must exist");
    const content = fs.readFileSync(ROLLBACK_RUNBOOK, "utf-8");
    assert.ok(content.includes("Render"), "must cover Render app rollback");
    assert.ok(content.includes("pg_restore") || content.includes("restore"), "must cover DB restore steps");
    assert.ok(content.includes("additive") || content.includes("forward-only"), "must cover additive migration policy");
    assert.ok(content.includes("Checklist") || content.includes("who-does-what") || content.includes("Who"), "must include who-does-what checklist");
  });

  it("G-R12-03: db-backup-to-s3.sh refuses execution when DIRECT_URL is missing", () => {
    assert.throws(
      () => {
        execSync(`bash "${BACKUP_SCRIPT}"`, {
          env: { ...process.env, DIRECT_URL: "", DATABASE_URL: "" },
          stdio: "pipe",
        });
      },
      /DIRECT_URL is required/,
      "must refuse execution without database URL"
    );
  });

  it("G-R12-04: db-backup-to-s3.sh never echoes credentials or full connection strings", () => {
    const src = fs.readFileSync(BACKUP_SCRIPT, "utf-8");
    assert.ok(
      !src.includes('echo "$DIRECT_URL"') && !src.includes('echo $DIRECT_URL'),
      "must never echo DIRECT_URL"
    );
  });

  it("G-R12-05: db-backup-to-s3.sh successfully backs up local DB to local target directory", () => {
    const tmpTarget = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "r12g-backup-"));
    try {
      const output = execSync(`bash "${BACKUP_SCRIPT}"`, {
        env: {
          ...process.env,
          DIRECT_URL: BACKUP_DB_URL,
          BACKUP_LOCAL_TARGET: tmpTarget,
        },
        encoding: "utf-8",
      });

      assert.ok(output.includes("PASS"), "backup output must contain PASS");
      assert.ok(!output.includes("testpassword123"), "output must not leak db password");
      assert.ok(!output.includes("postgresql://"), "output must not leak a connection string");
      if (TEST_DB_TARGET.password) {
        assert.ok(!output.includes(TEST_DB_TARGET.password), "output must not leak the database password");
      }

      const files = fs.readdirSync(tmpTarget);
      assert.ok(files.length >= 1, "at least one backup file must be written to target");
      const dumpFile = path.join(tmpTarget, files[0]);
      const stat = fs.statSync(dumpFile);
      assert.ok(stat.size > 1000, `dump file must not be empty (size=${stat.size})`);
    } finally {
      fs.rmSync(tmpTarget, { recursive: true, force: true });
    }
  });
});
