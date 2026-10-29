import test, { describe } from "node:test";
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
});
