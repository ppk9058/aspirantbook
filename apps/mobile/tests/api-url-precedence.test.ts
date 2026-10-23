import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveApiBaseUrl, extractHost } from "../src/lib/api-url";
import { classifyError } from "../src/lib/error-classifier";

describe("A1: API URL Resolution & Precedence", () => {
  it("extracts host cleanly from various uri formats", () => {
    assert.equal(extractHost("192.168.0.100:8083"), "192.168.0.100");
    assert.equal(extractHost("exp://192.168.0.100:8083"), "192.168.0.100");
    assert.equal(extractHost("exp://192.168.0.100:8083/--/"), "192.168.0.100");
    assert.equal(extractHost("http://api.domain.com:3000/v1"), "api.domain.com");
    assert.equal(extractHost(""), null);
    assert.equal(extractHost(null), null);
  });

  it("Precedence 1: Shell environment variable overrides everything", () => {
    const res = resolveApiBaseUrl({
      envUrl: "http://192.168.0.50:3045/api/v1/",
      isDev: true,
      constants: { expoConfig: { hostUri: "192.168.0.99:8083" } },
    });
    assert.equal(res.baseUrl, "http://192.168.0.50:3045");
    assert.equal(res.source, "env");
  });

  it("Precedence 2: Dotenv source override tracks source accurately", () => {
    const res = resolveApiBaseUrl({
      envUrl: "http://192.168.0.60:3045",
      sourceOverride: "dotenv",
      isDev: true,
    });
    assert.equal(res.baseUrl, "http://192.168.0.60:3045");
    assert.equal(res.source, "dotenv");
  });

  it("Precedence 3: Dev-derived host from Metro hostUri when env is unset", () => {
    const res = resolveApiBaseUrl({
      envUrl: "",
      isDev: true,
      constants: { expoConfig: { hostUri: "192.168.0.100:8083" } },
    });
    assert.equal(res.baseUrl, "http://192.168.0.100:3045");
    assert.equal(res.source, "derived");
  });

  it("Precedence 3b: Dev-derived host from linkingUri fallback", () => {
    const res = resolveApiBaseUrl({
      envUrl: "",
      isDev: true,
      constants: { linkingUri: "exp://192.168.0.102:8083" },
    });
    assert.equal(res.baseUrl, "http://192.168.0.102:3045");
    assert.equal(res.source, "derived");
  });

  it("Precedence 3c: Configurable backend port via EXPO_PUBLIC_API_PORT", () => {
    const res = resolveApiBaseUrl({
      envUrl: "",
      envPort: "3050",
      isDev: true,
      constants: { expoConfig: { hostUri: "192.168.0.100:8083" } },
    });
    assert.equal(res.baseUrl, "http://192.168.0.100:3050");
    assert.equal(res.source, "derived");
  });

  it("Precedence 4: Production (__DEV__=false) NEVER derives host, requires explicit env", () => {
    const res = resolveApiBaseUrl({
      envUrl: "",
      isDev: false,
      constants: { expoConfig: { hostUri: "192.168.0.100:8083" } },
    });
    assert.equal(res.baseUrl, "");
    assert.equal(res.source, "unconfigured");
    assert.ok(res.error?.includes("API endpoint is not configured"));
  });

  it("Precedence 5: Dev mode with no Metro host returns unconfigured", () => {
    const res = resolveApiBaseUrl({
      envUrl: "",
      isDev: true,
      constants: {},
    });
    assert.equal(res.baseUrl, "");
    assert.equal(res.source, "unconfigured");
  });
});

describe("A2: Network Error Classification & Diagnosability", () => {
  const dummyBaseUrl = "http://192.168.0.100:3045";

  it("classifies connection refused with preflight instructions in dev", () => {
    const err = new Error("java.net.ConnectException: failed to connect to 192.168.0.100:3045");
    const classified = classifyError(err, dummyBaseUrl, true);
    assert.equal(classified.category, "CONNECTION_REFUSED");
    assert.equal(classified.isNetwork, true);
    assert.ok(classified.devReason.includes("npm run dev:mobile-api"));
    assert.ok(classified.displayMessage.includes("[Dev Reason]:"));
    assert.ok(classified.displayMessage.includes(dummyBaseUrl));
  });

  it("classifies timeout errors with firewall isolation guidance in dev", () => {
    const err = new Error("ETIMEDOUT: Connection timed out");
    const classified = classifyError(err, dummyBaseUrl, true);
    assert.equal(classified.category, "TIMEOUT");
    assert.equal(classified.isNetwork, true);
    assert.ok(classified.devReason.includes("firewall/isolation"));
  });

  it("classifies DNS / host unreachable errors in dev", () => {
    const err = new Error("ENOTFOUND: getaddrinfo ENOTFOUND server.local");
    const classified = classifyError(err, dummyBaseUrl, true);
    assert.equal(classified.category, "DNS_UNREACHABLE");
    assert.equal(classified.isNetwork, true);
    assert.ok(classified.devReason.includes("DNS"));
  });

  it("classifies HTTP 4xx/5xx status errors", () => {
    const err = { status: 502, message: "Bad Gateway" };
    const classified = classifyError(err, dummyBaseUrl, true);
    assert.equal(classified.category, "HTTP_STATUS");
    assert.equal(classified.statusCode, 502);
    assert.ok(classified.devReason.includes("HTTP 502"));
  });

  it("classifies invalid JSON parsing errors", () => {
    const err = new SyntaxError("Unexpected token < in JSON at position 0");
    const classified = classifyError(err, dummyBaseUrl, true);
    assert.equal(classified.category, "INVALID_JSON");
    assert.equal(classified.isNetwork, false);
    assert.ok(classified.devReason.includes("Invalid JSON"));
  });

  it("classifies unconfigured API errors", () => {
    const classified = classifyError("API_UNCONFIGURED", "", true);
    assert.equal(classified.category, "NOT_CONFIGURED");
    assert.equal(classified.isNetwork, true);
    assert.ok(classified.devReason.includes("API endpoint is not configured"));
  });

  it("Production (__DEV__=false): strictly returns friendly text only and zero dev leakage", () => {
    const err = new Error("java.net.ConnectException: failed to connect to 192.168.0.100:3045");
    const prodClassified = classifyError(err, dummyBaseUrl, false);
    assert.equal(prodClassified.displayMessage, "Can't reach the server. Check your connection and try again.");
    assert.equal(prodClassified.displayTitle, "Connection Unavailable");
    assert.ok(!prodClassified.displayMessage.includes("dev:mobile-api"));
    assert.ok(!prodClassified.displayMessage.includes("192.168.0.100"));
    assert.ok(!prodClassified.displayMessage.includes("[Dev Reason]"));
  });
});

describe("A1/A2 Mutation Tests", () => {
  it("MUTATION PROOF 1: Production must NEVER derive host from Metro", () => {
    // If someone removes the isDev check and derives host in production
    const brokenDeriver = (opts: any) => {
      const host = extractHost(opts.constants?.expoConfig?.hostUri);
      return host ? `http://${host}:3045` : "";
    };
    const mutatedResult = brokenDeriver({
      isDev: false,
      constants: { expoConfig: { hostUri: "192.168.0.100:8083" } },
    });
    // The mutated deriver leaks a dev URL in production:
    assert.equal(mutatedResult, "http://192.168.0.100:3045");
    // But official resolveApiBaseUrl guarantees empty string in production:
    const realResult = resolveApiBaseUrl({
      envUrl: "",
      isDev: false,
      constants: { expoConfig: { hostUri: "192.168.0.100:8083" } },
    });
    assert.equal(realResult.baseUrl, "");
    assert.equal(realResult.source, "unconfigured");
  });

  it("MUTATION PROOF 2: Production must NEVER leak devReason or host details", () => {
    const err = new Error("ECONNREFUSED 192.168.0.100:3045");
    const brokenClassifier = (e: any) => `${e.message} (dev:mobile-api)`;
    const leaked = brokenClassifier(err);
    assert.ok(leaked.includes("dev:mobile-api"));

    const realProd = classifyError(err, "http://192.168.0.100:3045", false);
    assert.equal(realProd.displayMessage, "Can't reach the server. Check your connection and try again.");
  });
});
