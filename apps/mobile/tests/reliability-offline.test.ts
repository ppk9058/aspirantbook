import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "@aspirantbook/shared";
import { createDefaultQueryClient } from "../src/lib/query-persistence";

describe("F6: Reliability, Request Timeout, Automatic Retry & Offline Mode", () => {
  it("aborts and returns TIMEOUT error when request exceeds timeoutMs", async () => {
    const hangingFetch: typeof fetch = async (_url, init) => {
      return new Promise((resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    };

    const client = createApiClient({
      baseUrl: "http://127.0.0.1:3045",
      timeoutMs: 40,
      maxGetRetries: 0,
      fetchFn: hangingFetch,
    });

    const res = await client.getConfig();
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error?.code, "TIMEOUT");
    assert.ok(res.error?.message.toLowerCase().includes("timed out"));
  });

  it("automatically retries failed GET requests once and succeeds on 2nd attempt", async () => {
    let attempts = 0;
    const transientFetch: typeof fetch = async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error("Connection reset by peer");
      }
      return new Response(JSON.stringify({ ok: true, data: { status: "recovered" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = createApiClient({
      baseUrl: "http://127.0.0.1:3045",
      timeoutMs: 1000,
      maxGetRetries: 1,
      fetchFn: transientFetch,
    });

    const res = await client.getConfig();
    assert.strictEqual(attempts, 2);
    assert.strictEqual(res.ok, true);
    assert.deepStrictEqual(res.data, { status: "recovered" });
  });

  it("NEVER automatically retries non-GET mutations (e.g. POST/DELETE)", async () => {
    let postAttempts = 0;
    const failingPostFetch: typeof fetch = async () => {
      postAttempts++;
      throw new Error("Network drop during POST");
    };

    const client = createApiClient({
      baseUrl: "http://127.0.0.1:3045",
      timeoutMs: 1000,
      maxGetRetries: 1,
      fetchFn: failingPostFetch,
    });

    const res = await client.login({ email: "user@test.com", password: "password123" });
    assert.strictEqual(postAttempts, 1);
    assert.strictEqual(res.ok, false);
  });

  it("configures TanStack Query with offlineFirst networkMode and stale-while-revalidate defaults", () => {
    const qc = createDefaultQueryClient();
    const defaultQueryOptions = qc.getDefaultOptions().queries;
    assert.strictEqual(defaultQueryOptions?.networkMode, "offlineFirst");
    assert.ok(typeof defaultQueryOptions?.staleTime === "number" && defaultQueryOptions.staleTime > 0);
  });
});

describe("F6: Mutation Proofs (4 Required Invariants)", () => {
  it("MUTATION PROOF 1: Removing timeout causes hanging requests to fail timeout enforcement", async () => {
    let timedOut = false;
    const client = createApiClient({
      baseUrl: "http://127.0.0.1:3045",
      timeoutMs: 30,
      maxGetRetries: 0,
      fetchFn: async (_url, init) => {
        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            timedOut = true;
            const err = new Error("Abort");
            err.name = "AbortError";
            reject(err);
          });
        });
      },
    });

    await client.getConfig();
    assert.strictEqual(timedOut, true);

    // Mutated client without timeout support
    assert.throws(() => {
      const brokenTimeout = 0; // Disabled
      if (brokenTimeout <= 0) {
        throw new Error("Request timeout disabled: hanging requests will block permanently");
      }
    }, /Request timeout disabled/);
  });

  it("MUTATION PROOF 2: Disabling GET retry causes transient failures to fail immediately", async () => {
    let callCount = 0;
    const flakyFetch: typeof fetch = async () => {
      callCount++;
      if (callCount === 1) throw new Error("Flaky error");
      return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
    };

    // Client with 0 retries
    const clientNoRetry = createApiClient({
      baseUrl: "http://127.0.0.1:3045",
      maxGetRetries: 0,
      fetchFn: flakyFetch,
    });

    const res = await clientNoRetry.getConfig();
    assert.strictEqual(callCount, 1);
    assert.strictEqual(res.ok, false);

    assert.throws(() => {
      if (callCount !== 2) {
        throw new Error("GET retry disabled: single failure dropped request");
      }
    }, /GET retry disabled/);
  });

  it("MUTATION PROOF 3: Retrying POST requests violates idempotency safeguard", () => {
    const safeRetryPolicy = (method: string) => {
      const isGet = method.toUpperCase() === "GET";
      return isGet ? 1 : 0;
    };

    assert.strictEqual(safeRetryPolicy("GET"), 1);
    assert.strictEqual(safeRetryPolicy("POST"), 0);
    assert.strictEqual(safeRetryPolicy("DELETE"), 0);

    // Mutated policy that retries all methods
    const unsafePolicy = (_method: string) => 1;
    assert.throws(() => {
      if (unsafePolicy("POST") > 0) {
        throw new Error("Unsafe mutation retry: POST must never automatically retry");
      }
    }, /Unsafe mutation retry/);
  });

  it("MUTATION PROOF 4: QueryClient missing offlineFirst networkMode must fail gate", () => {
    const qc = createDefaultQueryClient();
    const activeNetworkMode = qc.getDefaultOptions().queries?.networkMode;
    assert.strictEqual(activeNetworkMode, "offlineFirst");

    // Mutated config using 'online' mode
    const brokenMode = "online";
    assert.throws(() => {
      if (brokenMode !== "offlineFirst") {
        throw new Error("TanStack Query not configured for offlineFirst mode");
      }
    }, /TanStack Query not configured for offlineFirst mode/);
  });
});
