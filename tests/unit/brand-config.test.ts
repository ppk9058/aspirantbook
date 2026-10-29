import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getBrandConfig, getCanonicalBaseUrl } from "@/lib/config/brand";

describe("Task B9: Centralized Brand & Domain Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("1. Brand module exports all required brand and legal fields", () => {
    const config = getBrandConfig();

    assert.ok(config.brandName, "brandName must be present");
    assert.ok(config.brandTagline, "brandTagline must be present");
    assert.ok(config.legalEntityName, "legalEntityName must be present");
    assert.ok(config.canonicalDomain, "canonicalDomain must be present");
    assert.ok(config.supportEmail, "supportEmail must be present");
    assert.ok(config.supportPhone, "supportPhone must be present");
    assert.ok(config.grievanceOfficer, "grievanceOfficer must be present");
    assert.ok(config.registeredAddress, "registeredAddress must be present");
    assert.ok(config.copyrightNotice, "copyrightNotice must be present");
    assert.ok(config.socialLinks, "socialLinks must be present");

    assert.match(config.copyrightNotice, new RegExp(String(new Date().getFullYear())));
  });

  test("2. Environment variable overrides work as expected", () => {
    process.env.NEXT_PUBLIC_APP_NAME = "CustomAspirant";
    process.env.NEXT_PUBLIC_CANONICAL_DOMAIN = "customaspirant.org";
    process.env.LEGAL_ENTITY_NAME = "Custom EdTech Private Limited";
    process.env.SUPPORT_EMAIL = "helpdesk@customaspirant.org";
    process.env.SUPPORT_PHONE = "+91 99999 88888";
    process.env.GRIEVANCE_OFFICER = "Shri R. Sharma (officer@customaspirant.org)";
    process.env.REGISTERED_ADDRESS = "123 Knowledge Park, New Delhi, 110001";

    const config = getBrandConfig();
    assert.equal(config.brandName, "CustomAspirant");
    assert.equal(config.canonicalDomain, "customaspirant.org");
    assert.equal(config.legalEntityName, "Custom EdTech Private Limited");
    assert.equal(config.supportEmail, "helpdesk@customaspirant.org");
    assert.equal(config.supportPhone, "+91 99999 88888");
    assert.equal(config.grievanceOfficer, "Shri R. Sharma (officer@customaspirant.org)");
    assert.equal(config.registeredAddress, "123 Knowledge Park, New Delhi, 110001");
    assert.match(config.copyrightNotice, /CustomAspirant/);
  });

  test("3. getCanonicalBaseUrl prioritizes NEXT_PUBLIC_APP_URL with trailing slash normalized", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://staging.aspirantbook.com///";
    const url = getCanonicalBaseUrl();
    assert.equal(url, "https://staging.aspirantbook.com");
  });

  test("4. getCanonicalBaseUrl supports Vercel preview deployment URLs", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.NEXTAUTH_URL;
    process.env.VERCEL_URL = "aspirantbook-preview-abc123.vercel.app";

    const url = getCanonicalBaseUrl();
    assert.equal(url, "https://aspirantbook-preview-abc123.vercel.app");
  });

  test("5. getCanonicalBaseUrl in production defaults to https://<canonicalDomain>", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
    (process.env as any).NODE_ENV = "production";
    process.env.CANONICAL_DOMAIN = "aspirantbook.com";

    const url = getCanonicalBaseUrl();
    assert.equal(url, "https://aspirantbook.com");
  });

  test("6. getCanonicalBaseUrl in development defaults to http://localhost:<port>", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_URL;
    (process.env as any).NODE_ENV = "development";
    process.env.PORT = "3045";

    const url = getCanonicalBaseUrl();
    assert.equal(url, "http://localhost:3045");
  });
});
