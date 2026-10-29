import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { getClientIp, normalizeIp } from "@/lib/rate-limit";

describe("Task B4: Client IP / TRUST_PROXY Hardening", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("normalizeIp", () => {
    test("accepts valid IPv4 addresses", () => {
      assert.equal(normalizeIp("192.168.1.1"), "192.168.1.1");
      assert.equal(normalizeIp("10.0.0.1"), "10.0.0.1");
      assert.equal(normalizeIp("203.0.113.195"), "203.0.113.195");
    });

    test("accepts valid IPv6 addresses in canonical form", () => {
      assert.equal(
        normalizeIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334"),
        "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
      );
      assert.equal(normalizeIp("2001:db8::1"), "2001:db8::1");
      assert.equal(normalizeIp("::1"), "::1");
    });

    test("normalizes bracketed and port-annotated IPs", () => {
      assert.equal(normalizeIp("[::1]"), "::1");
      assert.equal(normalizeIp("[::1]:8080"), "::1");
      assert.equal(normalizeIp("192.168.1.10:3000"), "192.168.1.10");
    });

    test("extracts IPv4 from IPv4-mapped IPv6", () => {
      assert.equal(normalizeIp("::ffff:192.0.2.128"), "192.0.2.128");
    });

    test("rejects malicious or invalid strings", () => {
      assert.equal(normalizeIp("../../etc/passwd"), null);
      assert.equal(normalizeIp("999.999.999.999"), null);
      assert.equal(normalizeIp("javascript:alert(1)"), null);
      assert.equal(normalizeIp("a".repeat(10000)), null);
      assert.equal(normalizeIp("1.2.3.4.5"), null);
      assert.equal(normalizeIp(""), null);
      assert.equal(normalizeIp(null), null);
      assert.equal(normalizeIp(undefined), null);
    });
  });

  describe("TRUST_PROXY=false (Default - Fail Closed)", () => {
    test("ignores spoofed X-Forwarded-For headers", () => {
      delete process.env.TRUST_PROXY;
      const headers = new Headers({
        "x-forwarded-for": "203.0.113.195, 10.0.0.1",
      });
      assert.equal(getClientIp(headers), "127.0.0.1");
    });

    test("ignores CF-Connecting-IP header", () => {
      delete process.env.TRUST_PROXY;
      const headers = new Headers({
        "cf-connecting-ip": "198.51.100.42",
      });
      assert.equal(getClientIp(headers), "127.0.0.1");
    });

    test("ignores X-Real-IP header", () => {
      delete process.env.TRUST_PROXY;
      const headers = new Headers({
        "x-real-ip": "198.51.100.42",
      });
      assert.equal(getClientIp(headers), "127.0.0.1");
    });

    test("returns 127.0.0.1 when no request is passed", () => {
      delete process.env.TRUST_PROXY;
      assert.equal(getClientIp(), "127.0.0.1");
    });
  });

  describe("TRUST_PROXY=true (Production behind Cloudflare/Reverse Proxy)", () => {
    test("prioritizes valid CF-Connecting-IP over other headers", () => {
      process.env.TRUST_PROXY = "true";
      const headers = new Headers({
        "cf-connecting-ip": "198.51.100.42",
        "x-forwarded-for": "10.0.0.1",
        "x-real-ip": "10.0.0.2",
      });
      assert.equal(getClientIp(headers), "198.51.100.42");
    });

    test("rejects malicious CF-Connecting-IP and falls back safely", () => {
      process.env.TRUST_PROXY = "true";
      const headers = new Headers({
        "cf-connecting-ip": "../../../etc/shadow",
        "x-forwarded-for": "198.51.100.99",
      });
      assert.equal(getClientIp(headers), "198.51.100.99");
    });

    test("extracts right-most trusted hop of X-Forwarded-For with TRUST_PROXY_HOPS=1", () => {
      process.env.TRUST_PROXY = "true";
      process.env.TRUST_PROXY_HOPS = "1";
      const headers = new Headers({
        // Attacker spoofed 1.1.1.1, real edge proxy appended 203.0.113.5
        "x-forwarded-for": "1.1.1.1, 203.0.113.5",
      });
      assert.equal(getClientIp(headers), "203.0.113.5");
    });

    test("extracts Nth hop from right when TRUST_PROXY_HOPS > 1", () => {
      process.env.TRUST_PROXY = "true";
      process.env.TRUST_PROXY_HOPS = "2";
      const headers = new Headers({
        // Client IP: 203.0.113.5 -> Ingress Proxy: 10.0.1.2 -> Load Balancer: 10.0.0.1
        "x-forwarded-for": "spoofed.bad.actor, 203.0.113.5, 10.0.0.1",
      });
      assert.equal(getClientIp(headers), "203.0.113.5");
    });

    test("falls back to X-Real-IP if X-Forwarded-For is missing", () => {
      process.env.TRUST_PROXY = "true";
      const headers = new Headers({
        "x-real-ip": "198.51.100.77",
      });
      assert.equal(getClientIp(headers), "198.51.100.77");
    });

    test("handles standard Request object and Next.js { headers } container", () => {
      process.env.TRUST_PROXY = "true";
      const req = new Request("https://example.com/api/test", {
        headers: { "cf-connecting-ip": "198.51.100.88" },
      });
      assert.equal(getClientIp(req), "198.51.100.88");

      const nextContainer = {
        headers: new Headers({ "cf-connecting-ip": "198.51.100.89" }),
      };
      assert.equal(getClientIp(nextContainer), "198.51.100.89");
    });
  });
});
