# Task B4: Client IP Extraction & TRUST_PROXY Hardening

## Overview
Previous implementations in `lib/actions/auth.ts`, `lib/actions/admin/users.ts`, and `lib/authwall/bot-verify.ts` relied on unsanitized left-most header reads:
```typescript
// INSECURE (Legacy):
h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "127.0.0.1"
```
This allowed an attacker to inject an arbitrary IP into their client request via `X-Forwarded-For: 8.8.8.8`, spoofing rate-limiting keys, evading lockout mechanisms, and poisoning security audit trails.

## Implemented Hardening
1. **Centralized Resolver:** All IP extraction routes through `getClientIp(req?: Request | { headers: Headers } | Headers)` in `lib/rate-limit.ts`.
2. **Default Fail-Closed (`TRUST_PROXY !== "true"`):**
   - In development, staging, or direct deployments where `TRUST_PROXY` is not explicitly `"true"`, all forwarding headers (`CF-Connecting-IP`, `X-Forwarded-For`, `X-Real-IP`) are strictly ignored.
   - The resolver defaults to `"127.0.0.1"`, preventing external clients from forging addresses.
3. **Validated Edge Ingress (`TRUST_PROXY === "true"`):**
   - **`CF-Connecting-IP` Primary:** Validated using Node.js `net.isIP(value)` to ensure RFC-compliant IPv4 or IPv6 format. Inputs over 256 characters, containing traversal paths (`../../etc/passwd`), or malformed strings are discarded.
   - **Right-most Hop of `X-Forwarded-For`:** Uses `TRUST_PROXY_HOPS` (default `1`). The value is extracted from `chain[chain.length - hops]`. Because upstream proxies (such as Cloudflare or AWS ALB) append the true peer IP to the end of the chain, taking the right-most hop excludes attacker-supplied prefixes.
   - **`X-Real-IP` Fallback:** Strictly validated via `normalizeIp` before return.

---

## CRITICAL OWNER REQUIREMENT: Origin Firewall Configuration

> [!WARNING]
> Setting `TRUST_PROXY=true` in production is secure **ONLY IF AND ONLY WHEN** the origin server's firewall (or security group) restricts ingress traffic exclusively to Cloudflare's published IP ranges.

### The Attack Vector If Unrestricted
If an attacker can connect directly to your origin server's IP address (bypassing Cloudflare):
1. The attacker can directly send `CF-Connecting-IP: 1.2.3.4` or crafted `X-Forwarded-For` headers.
2. Because the origin has `TRUST_PROXY=true`, it will trust the header and attribute the traffic to `1.2.3.4`.

### Required Production Actions
1. **Firewall / Security Group Rules:**
   - In AWS EC2 / DigitalOcean / Hetzner firewall, allow TCP ports 80/443 **ONLY** from Cloudflare IP ranges:
     - IPv4: https://www.cloudflare.com/ips-v4
     - IPv6: https://www.cloudflare.com/ips-v6
   - Drop/reject all other incoming connections on public web ports.
2. **Cloudflare Authenticated Origin Pulls (AOP) or Cloudflare Tunnel (cloudflared):**
   - Alternatively, deploy `cloudflared` (Cloudflare Tunnel). With a tunnel, no inbound ports are open to the public internet, completely preventing origin bypass.
3. **Environment Configuration:**
   ```bash
   TRUST_PROXY=true
   TRUST_PROXY_HOPS=1
   ```

---

## Verification
- Unit test suite: `tests/unit/client-ip-trust-proxy.test.ts` (15 test cases covering normalization, spoof rejection, hop parsing, and malformed header safety).
- 5x consecutive verification passes recorded in `docs/evidence/raw/client-ip-5x.txt`.
