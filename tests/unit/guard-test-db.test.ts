import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  guardTestDatabase,
  assertNoEnvLocal,
  assertNoSupabaseEnv,
} from "../../scripts/guard-test-db";

describe("Phase 0 Safety Harness: Test DB & Environment Guards", () => {
  test("guardTestDatabase accepts valid local docker test DB URLs", () => {
    assert.doesNotThrow(() => {
      guardTestDatabase("postgresql://postgres:secret@127.0.0.1:54329/trillion_test_perf_v2");
    });
    assert.doesNotThrow(() => {
      guardTestDatabase("postgresql://postgres:secret@localhost:54329/trillion_test_perf_v2");
    });
    assert.doesNotThrow(() => {
      guardTestDatabase("postgresql://postgres:secret@test-db:5432/trillion_test_perf_v2");
    });
    assert.doesNotThrow(() => {
      guardTestDatabase("postgresql://postgres:secret@127.0.0.1:54330/trillion_test_perf_v2");
    });
  });

  test("guardTestDatabase rejects supabase.co URLs explicitly", () => {
    assert.throws(
      () => {
        guardTestDatabase(
          "postgresql://postgres:some_secret_pass@db.xyzcompany.supabase.co:5432/postgres"
        );
      },
      (err: Error) => {
        return err.message.includes("supabase.co") || err.message.includes("Disallowed database host");
      }
    );

    assert.throws(
      () => {
        guardTestDatabase(
          "postgresql://postgres.xyzcompany:some_secret_pass@aws-0-ap-south-1.pooler.supabase.co:6543/postgres"
        );
      },
      (err: Error) => {
        return err.message.includes("supabase.co") || err.message.includes("Disallowed database host");
      }
    );
  });

  test("guardTestDatabase rejects unauthorized hosts and ports", () => {
    assert.throws(
      () => {
        guardTestDatabase("postgresql://user:pass@192.168.1.100:54329/test");
      },
      /Disallowed database host/
    );

    assert.throws(
      () => {
        guardTestDatabase("postgresql://user:pass@127.0.0.1:5432/test");
      },
      /Disallowed database port/
    );
  });

  test("assertNoEnvLocal detects .env.local in directory", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-test-"));
    const tempEnvLocal = path.join(tempDir, ".env.local");
    fs.writeFileSync(tempEnvLocal, "FOO=bar");

    assert.throws(
      () => {
        assertNoEnvLocal(tempDir);
      },
      /\.env\.local exists/
    );

    fs.unlinkSync(tempEnvLocal);
    assert.doesNotThrow(() => {
      assertNoEnvLocal(tempDir);
    });
    fs.rmdirSync(tempDir);
  });

  test("assertNoSupabaseEnv detects supabase.co in any env var", () => {
    const original = process.env.TEST_TEMP_VAR;
    try {
      process.env.TEST_TEMP_VAR = "https://abc.supabase.co";
      assert.throws(
        () => {
          assertNoSupabaseEnv();
        },
        /Unsafe environment variable/
      );
    } finally {
      delete process.env.TEST_TEMP_VAR;
      if (original !== undefined) process.env.TEST_TEMP_VAR = original;
    }
  });
});
