import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  initSentry,
  isSentryInitialized,
  scrubSentryEvent,
  getSentryConfig,
} from "@/lib/sentry/config";

describe("R12-E: Sentry Configuration & PII Scrubber", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_RELEASE;
  });

  describe("DSN Guard & No-Op Behavior", () => {
    test("does not initialize when SENTRY_DSN is absent or empty", () => {
      delete process.env.SENTRY_DSN;
      const initialized = initSentry();
      assert.strictEqual(initialized, false, "initSentry must return false when SENTRY_DSN is unset");
      assert.strictEqual(isSentryInitialized(), false, "isSentryInitialized must be false");

      process.env.SENTRY_DSN = "   ";
      const initializedWhitespace = initSentry();
      assert.strictEqual(initializedWhitespace, false, "initSentry must return false for empty/whitespace DSN");
      assert.strictEqual(isSentryInitialized(), false);
    });

    test("reads configuration correctly when SENTRY_DSN is provided", () => {
      process.env.SENTRY_DSN = "https://public_key@o0.ingest.sentry.io/0000000";
      process.env.SENTRY_ENVIRONMENT = "staging";
      process.env.SENTRY_RELEASE = "sha-12345678";

      const config = getSentryConfig();
      assert.ok(config, "Config object must be returned");
      assert.strictEqual(config.dsn, "https://public_key@o0.ingest.sentry.io/0000000");
      assert.strictEqual(config.environment, "staging");
      assert.strictEqual(config.release, "sha-12345678");
      assert.strictEqual(typeof config.beforeSend, "function", "beforeSend hook must be configured");
    });
  });

  describe("PII Scrubber (scrubSentryEvent)", () => {
    test("scrubs request bodies completely", () => {
      const event: any = {
        request: {
          url: "https://aspirantbook.com/api/auth/callback",
          method: "POST",
          data: {
            username: "aspirant",
            password: "super-secret-password-123",
            creditCard: "4111222233334444",
          },
        },
      };

      const scrubbed = scrubSentryEvent(event);
      assert.ok(scrubbed, "Event must be returned");
      assert.strictEqual(scrubbed.request.data, undefined, "request.data must be completely stripped");
    });

    test("scrubs cookies from request object and headers", () => {
      const event: any = {
        request: {
          url: "https://aspirantbook.com/dashboard",
          cookies: {
            session_token: "eyJh...sensitive_jwt_token...",
            remember_me: "true",
          },
          headers: {
            "cookie": "session_token=eyJh...sensitive_jwt_token...; other=123",
            "set-cookie": "token=abc",
            "host": "aspirantbook.com",
            "user-agent": "Mozilla/5.0",
          },
        },
      };

      const scrubbed = scrubSentryEvent(event);
      assert.strictEqual(scrubbed.request.cookies, undefined, "request.cookies must be deleted");
      assert.strictEqual(scrubbed.request.headers.cookie, undefined, "cookie header must be removed");
      assert.strictEqual(scrubbed.request.headers["set-cookie"], undefined, "set-cookie header must be removed");
      assert.strictEqual(scrubbed.request.headers.host, "aspirantbook.com", "Non-sensitive headers must be preserved");
    });

    test("scrubs authorization and authentication headers", () => {
      const event: any = {
        request: {
          url: "https://aspirantbook.com/api/internal",
          headers: {
            "authorization": "Bearer super-secret-oauth-token-xyz",
            "proxy-authorization": "Basic dXNlcjpwYXNz",
            "x-auth-token": "secret-auth-token-456",
            "x-api-key": "secret-api-key-789",
            "accept": "application/json",
          },
        },
      };

      const scrubbed = scrubSentryEvent(event);
      assert.strictEqual(scrubbed.request.headers.authorization, undefined, "authorization header must be stripped");
      assert.strictEqual(scrubbed.request.headers["proxy-authorization"], undefined, "proxy-authorization header must be stripped");
      assert.strictEqual(scrubbed.request.headers["x-auth-token"], undefined, "x-auth-token header must be stripped");
      assert.strictEqual(scrubbed.request.headers["x-api-key"], undefined, "x-api-key header must be stripped");
      assert.strictEqual(scrubbed.request.headers.accept, "application/json", "safe header preserved");
    });

    test("scrubs query strings from URL and query_string field", () => {
      const event: any = {
        request: {
          url: "https://aspirantbook.com/verify-email?token=sensitive_token_999&email=user@test.com",
          query_string: "token=sensitive_token_999&email=user@test.com",
        },
      };

      const scrubbed = scrubSentryEvent(event);
      assert.strictEqual(scrubbed.request.url, "https://aspirantbook.com/verify-email", "Query string must be stripped from URL");
      assert.strictEqual(scrubbed.request.query_string, undefined, "query_string field must be removed");
    });

    test("scrubs email addresses and PII from user object", () => {
      const event: any = {
        user: {
          id: "usr_12345",
          email: "aspirant.learner@example.com",
          username: "learner@example.com",
          ip_address: "192.0.2.1",
        },
      };

      const scrubbed = scrubSentryEvent(event);
      assert.strictEqual(scrubbed.user.id, "usr_12345", "User id preserved for error grouping");
      assert.strictEqual(scrubbed.user.email, undefined, "User email must be deleted");
      assert.strictEqual(scrubbed.user.ip_address, undefined, "User ip_address must be deleted");
      assert.strictEqual(scrubbed.user.username, "[Filtered Email]", "User username matching email format must be scrubbed");
    });

    test("scrubs emails and bearer tokens from error messages and breadcrumbs", () => {
      const event: any = {
        message: "Failed to dispatch email to candidate.target@test.com with token Bearer secret_jwt_xyz",
        breadcrumbs: [
          {
            category: "fetch",
            data: {
              url: "https://api.external.com/v1/user?apiKey=secretKey123&email=target@test.com",
            },
            message: "Request failed for user john.doe@example.org",
          },
        ],
      };

      const scrubbed = scrubSentryEvent(event);
      assert.strictEqual(
        scrubbed.message,
        "Failed to dispatch email to [Filtered Email] with token Bearer [Filtered]"
      );
      assert.strictEqual(
        scrubbed.breadcrumbs[0].data.url,
        "https://api.external.com/v1/user"
      );
      assert.strictEqual(
        scrubbed.breadcrumbs[0].message,
        "Request failed for user [Filtered Email]"
      );
    });
  });
});
