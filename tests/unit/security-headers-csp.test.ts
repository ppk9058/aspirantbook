import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";

// Load next.config.js to inspect the headers function
const nextConfigPath = path.resolve(__dirname, "../../next.config.js");

describe("R12-C: Security headers and CSP", () => {
  let headers: any[];

  it("C-R12-00: next.config.js headers() returns valid config", async () => {
    // Clear module cache
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    assert.ok(config.headers, "next.config.js must export a headers function");
    headers = await config.headers();
    assert.ok(Array.isArray(headers), "headers() must return an array");
  });

  it("C-R12-01: HSTS header is present and strong", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    assert.ok(mainRoute, "must have a /:path* route");
    const hsts = mainRoute.headers.find((h: any) => h.key === "Strict-Transport-Security");
    assert.ok(hsts, "HSTS header must be present");
    assert.ok(hsts.value.includes("max-age="), "must have max-age");
    assert.ok(hsts.value.includes("includeSubDomains"), "must include subdomains");
  });

  it("C-R12-02: X-Content-Type-Options is nosniff", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const xcto = mainRoute.headers.find((h: any) => h.key === "X-Content-Type-Options");
    assert.ok(xcto, "X-Content-Type-Options must be present");
    assert.equal(xcto.value, "nosniff");
  });

  it("C-R12-03: Referrer-Policy is set", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const rp = mainRoute.headers.find((h: any) => h.key === "Referrer-Policy");
    assert.ok(rp, "Referrer-Policy must be present");
    assert.ok(rp.value.length > 0, "Referrer-Policy must have a value");
  });

  it("C-R12-04: frame-ancestors is self (via CSP)", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
    assert.ok(csp, "CSP header must be present");
    assert.ok(csp.value.includes("frame-ancestors 'self'"), "frame-ancestors must be 'self'");
  });

  it("C-R12-05: Permissions-Policy is set", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const pp = mainRoute.headers.find((h: any) => h.key === "Permissions-Policy");
    assert.ok(pp, "Permissions-Policy must be present");
  });

  it("C-R12-06: CSP has no wildcard * in script-src", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
    // Extract script-src directive
    const scriptSrc = csp.value.match(/script-src\s+([^;]+)/)?.[1] || "";
    assert.ok(!scriptSrc.includes(" * ") && !scriptSrc.endsWith(" *") && !scriptSrc.startsWith("* "),
      "script-src must not contain a bare wildcard *");
    // Also check for wildcard domains like *.example.com in script-src
    // (https://*.razorpay.com in img-src is fine, but script-src should be exact)
    const scriptEntries = scriptSrc.split(/\s+/);
    for (const entry of scriptEntries) {
      if (entry.startsWith("https://") || entry.startsWith("http://")) {
        assert.ok(!entry.includes("*"), `script-src must not have wildcard domain: ${entry}`);
      }
    }
  });

  it("C-R12-07: CSP does not contain supabase.co", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
    assert.ok(!csp.value.includes("supabase.co"), "CSP must not contain supabase.co");
  });

  it("C-R12-08: CSP allows Cloudflare Turnstile (challenges.cloudflare.com)", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
    assert.ok(csp.value.includes("challenges.cloudflare.com"),
      "CSP must allow challenges.cloudflare.com for Turnstile");
    // Check it's in script-src and frame-src
    const scriptSrc = csp.value.match(/script-src\s+([^;]+)/)?.[1] || "";
    const frameSrc = csp.value.match(/frame-src\s+([^;]+)/)?.[1] || "";
    assert.ok(scriptSrc.includes("challenges.cloudflare.com"),
      "script-src must include challenges.cloudflare.com");
    assert.ok(frameSrc.includes("challenges.cloudflare.com"),
      "frame-src must include challenges.cloudflare.com");
  });

  it("C-R12-09: CSP allows Razorpay checkout", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
    assert.ok(csp.value.includes("checkout.razorpay.com"), "CSP must allow checkout.razorpay.com");
    assert.ok(csp.value.includes("api.razorpay.com"), "CSP must allow api.razorpay.com");
  });

  it("C-R12-10: CSP allows Google Fonts", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
    assert.ok(csp.value.includes("fonts.googleapis.com"), "style-src must allow fonts.googleapis.com");
    assert.ok(csp.value.includes("fonts.gstatic.com"), "font-src must allow fonts.gstatic.com");
  });

  it("C-R12-11: CSP allows Google OAuth (accounts.google.com)", async () => {
    delete require.cache[require.resolve(nextConfigPath)];
    const config = require(nextConfigPath);
    headers = await config.headers();
    const mainRoute = headers.find((h: any) => h.source === "/:path*");
    const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
    assert.ok(csp.value.includes("accounts.google.com"), "CSP must allow accounts.google.com for Google OAuth");
  });

  it("C-R12-12: CSP dynamically includes configured S3/R2 host via env", async () => {
    const origEndpoint = process.env.S3_ENDPOINT;
    try {
      process.env.S3_ENDPOINT = "https://my-bucket.r2.cloudflarestorage.com";
      delete require.cache[require.resolve(nextConfigPath)];
      const config = require(nextConfigPath);
      const testHeaders = await config.headers();
      const mainRoute = testHeaders.find((h: any) => h.source === "/:path*");
      const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
      assert.ok(
        csp.value.includes("https://my-bucket.r2.cloudflarestorage.com"),
        "connect-src must include configured S3_ENDPOINT"
      );
    } finally {
      if (origEndpoint !== undefined) {
        process.env.S3_ENDPOINT = origEndpoint;
      } else {
        delete process.env.S3_ENDPOINT;
      }
    }
  });

  it("C-R12-13: CSP dynamically includes Sentry ingest host via env when SENTRY_DSN is set", async () => {
    const origDsn = process.env.SENTRY_DSN;
    try {
      process.env.SENTRY_DSN = "https://publicKey@o0.ingest.sentry.io/0";
      delete require.cache[require.resolve(nextConfigPath)];
      const config = require(nextConfigPath);
      const testHeaders = await config.headers();
      const mainRoute = testHeaders.find((h: any) => h.source === "/:path*");
      const csp = mainRoute.headers.find((h: any) => h.key === "Content-Security-Policy");
      assert.ok(
        csp.value.includes("https://o0.ingest.sentry.io"),
        "connect-src must include configured Sentry ingest host"
      );
    } finally {
      if (origDsn !== undefined) {
        process.env.SENTRY_DSN = origDsn;
      } else {
        delete process.env.SENTRY_DSN;
      }
    }
  });
});
