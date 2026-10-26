import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rewriteApiRequestUrl } from "../src/lib/api-url";

describe("Bug #5: requests must follow the currently resolved API host", () => {
  const stale = "http://192.168.0.10:3045";
  const active = "http://192.168.0.20:3045";

  it("re-targets a URL built from the stale module-load base onto the active host", () => {
    assert.equal(
      rewriteApiRequestUrl(`${stale}/api/v1/courses?limit=20`, active, stale),
      `${active}/api/v1/courses?limit=20`
    );
  });

  it("normalizes trailing slashes and /api/v1 on both bases", () => {
    assert.equal(
      rewriteApiRequestUrl(
        "http://old-host:3045/api/v1/tests",
        "http://new-host:3045/",
        "http://old-host:3045/api/v1/"
      ),
      "http://new-host:3045/api/v1/tests"
    );
  });

  it("attaches the active base to a relative request when no base was known at load", () => {
    assert.equal(
      rewriteApiRequestUrl("/api/v1/home", active, ""),
      `${active}/api/v1/home`
    );
    assert.equal(
      rewriteApiRequestUrl("api/v1/home", active, ""),
      `${active}/api/v1/home`
    );
  });

  it("leaves third-party absolute URLs untouched", () => {
    assert.equal(
      rewriteApiRequestUrl("https://cdn.example.com/file.pdf", active, stale),
      "https://cdn.example.com/file.pdf"
    );
  });

  it("does not rewrite a different host that only shares the stale prefix", () => {
    assert.equal(
      rewriteApiRequestUrl("http://192.168.0.100:3045/api/v1/courses", active, stale),
      "http://192.168.0.100:3045/api/v1/courses"
    );
  });
});
