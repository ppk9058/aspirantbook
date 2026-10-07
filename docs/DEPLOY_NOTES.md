# Deployment & Reverse Proxy Notes

## Reverse Proxy Configuration & TRUST_PROXY

When deploying TrillionSkill behind a reverse proxy (such as Cloudflare, AWS Application Load Balancer, Nginx, or Caddy):

1. **Client IP Resolution (`lib/rate-limit.ts`)**:
   - By default, `getClientIp` returns `"127.0.0.1"` unless `TRUST_PROXY=true` is explicitly set in environment variables.
   - If `TRUST_PROXY` is NOT enabled in production, a warning will be logged to console:
     `[RateLimit] TRUST_PROXY is not set to 'true'. Client IP will default to 127.0.0.1.`
   - To enable rate limiting based on client IP behind a trusted proxy, set in `.env.production`:
     ```bash
     TRUST_PROXY=true
     ```

2. **Security Precaution**:
   - Ensure the reverse proxy strips or overwrites inbound `X-Forwarded-For` and `X-Real-IP` headers from untrusted clients to prevent header spoofing attacks.
