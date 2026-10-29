import test, { describe } from "node:test";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {
  getPublicDeletionUrl,
  formatDeletionStatus,
  submitMobileDeletionRequest,
  fetchMobileDeletionStatus,
} from "../src/lib/data-deletion";

describe("Mobile Data Deletion Pure Module", () => {
  test("1. Constructs valid public data-deletion web URL", () => {
    assert.equal(getPublicDeletionUrl("https://aspirantbook.com"), "https://aspirantbook.com/data-deletion");
    assert.equal(getPublicDeletionUrl("https://aspirantbook.com/"), "https://aspirantbook.com/data-deletion");
  });

  test("2. Correctly formats and classifies all 4 deletion statuses", () => {
    const pending = formatDeletionStatus("PENDING");
    assert.equal(pending.label, "Pending Review");
    assert.equal(pending.variant, "warning");

    const inReview = formatDeletionStatus("IN_REVIEW");
    assert.equal(inReview.label, "Under Review");
    assert.equal(inReview.variant, "info");

    const completed = formatDeletionStatus("COMPLETED");
    assert.equal(completed.label, "Completed");
    assert.equal(completed.variant, "success");

    const rejected = formatDeletionStatus("REJECTED");
    assert.equal(rejected.label, "Rejected");
    assert.equal(rejected.variant, "danger");
  });

  test("3. submitMobileDeletionRequest calls /api/v1/data-deletion with payload", async () => {
    let calledEndpoint = "";
    let calledBody: any = null;

    const mockClient = {
      post: async (endpoint: string, body: any) => {
        calledEndpoint = endpoint;
        calledBody = body;
        return {
          ok: true,
          data: {
            id: "del_123",
            status: "PENDING",
            requestedAt: new Date().toISOString(),
          },
        };
      },
    };

    const res = await submitMobileDeletionRequest(mockClient as any, "Taking a study break");
    assert.equal(res.ok, true);
    assert.equal(calledEndpoint, "/api/v1/data-deletion");
    assert.equal(calledBody.reason, "Taking a study break");
    assert.equal(res.data?.id, "del_123");
    assert.equal(res.data?.status, "PENDING");
  });

  test("4. fetchMobileDeletionStatus calls /api/v1/data-deletion GET", async () => {
    let calledEndpoint = "";

    const mockClient = {
      get: async (endpoint: string) => {
        calledEndpoint = endpoint;
        return {
          ok: true,
          data: {
            request: {
              id: "del_active",
              status: "IN_REVIEW",
              requestedAt: new Date().toISOString(),
            },
          },
        };
      },
    };

    const res = await fetchMobileDeletionStatus(mockClient as any);
    assert.equal(res.ok, true);
    assert.equal(calledEndpoint, "/api/v1/data-deletion");
    assert.equal(res.request?.status, "IN_REVIEW");
  });

  test("5. Already-pending request is surfaced as existing (isExisting=true)", async () => {
    const mockClient = {
      post: async () => ({
        ok: true,
        data: {
          id: "del_existing",
          status: "IN_REVIEW",
          requestedAt: new Date().toISOString(),
          isExisting: true,
        },
      }),
    };

    const res = await submitMobileDeletionRequest(mockClient as any, "Retry tap");
    assert.equal(res.ok, true);
    assert.equal(res.data?.isExisting, true);
    assert.equal(res.data?.status, "IN_REVIEW");
  });

  test("6. API error is returned as a visible error string, not swallowed", async () => {
    const mockClient = {
      post: async () => ({
        ok: false,
        error: { message: "Authentication required to submit data deletion request" },
      }),
    };

    const res = await submitMobileDeletionRequest(mockClient as any);
    assert.equal(res.ok, false);
    assert.match(res.error || "", /Authentication required/);
  });

  test("7. Unknown status falls back to a neutral label instead of crashing", () => {
    const unknown = formatDeletionStatus("SOMETHING_NEW");
    assert.equal(unknown.variant, "neutral");
    assert.equal(unknown.label, "SOMETHING_NEW");
  });

  test("8. Settings screen really calls the authenticated deletion API and displays request status", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/app/settings.tsx"), "utf8");
    assert.match(source, /submitMobileDeletionRequest\(/, "Settings must submit via the /api/v1/data-deletion helper");
    assert.match(source, /fetchMobileDeletionStatus\(/, "Settings must fetch the current request status");
    assert.match(source, /formatDeletionStatus\(/, "Settings must render the request status label");
    assert.match(source, /settings-deletion-status/, "Settings must show a status element");
    assert.doesNotMatch(source, /api\.deleteMe\(/, "Settings must not bypass the queue with an immediate delete call");
  });
});
