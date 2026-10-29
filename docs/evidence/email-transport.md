# Architectural Decision Record: Email Transport (Brevo REST API vs. SMTP)

**Task:** G6  
**Status:** Decided / Accepted  
**Date:** 2026-10-29  
**Decision:** Maintain Brevo HTTPS REST API; do NOT rewrite to or implement SMTP.

---

## 1. Context and Problem Statement

Earlier design notes or plans suggested using Brevo (formerly Sendinblue) via standard SMTP transport (`smtp-relay.brevo.com` over port 587/465). However, the implementation in `lib/email.ts` utilizes Brevo's v3 HTTPS REST API (`https://api.brevo.com/v3/smtp/email`).

This document records the architectural decision to retain the REST API implementation as-is, detailing why it is acceptable, robust, and preferred for our deployment architecture, enumerating required environment variables, and explicitly confirming that SMTP transport is not implemented.

---

## 2. What Is Implemented

The application implements transactional email dispatch via `sendEmail()` in [lib/email.ts](file:///Users/praveenkumar/ws-launch/lib/email.ts) with the following characteristics:

1. **Primary Provider (Brevo REST API):**
   - **Method:** `POST` via native `fetch` with an `AbortController` (10-second timeout).
   - **Endpoint:** `process.env.BREVO_API_URL` (defaults to `https://api.brevo.com/v3/smtp/email`).
   - **Authentication:** `api-key: process.env.BREVO_API_KEY` header.
   - **Payload:** JSON body containing `{ sender: { name, email }, to: [{ email }], subject, htmlContent, textContent }`.
   - **Response Handling:** Inspects HTTP status and parses JSON message ID (`messageId` or `id`).

2. **Secondary Provider Fallback (Resend REST API):**
   - If Brevo is unconfigured or returns an error, the system automatically falls back to Resend REST API (`https://api.resend.com/emails`) using Bearer token authentication (`RESEND_API_KEY`).

3. **Reliability & Retry Guarantee (EmailOutbox):**
   - If both providers fail in production, or if no live provider is configured in dev/test, the email is persisted in the PostgreSQL `EmailOutbox` table.
   - Retries are handled asynchronously by the outbox worker (`lib/email/outbox-worker.ts`) using exponential backoff with jitter and row-level locking (`FOR UPDATE SKIP LOCKED`).

---

## 3. Why the REST API Is Acceptable & Preferred

The REST API approach is superior to SMTP for this platform for several operational reasons:

1. **Port Filtering & Network Reliability:**
   - Standard outbound SMTP ports (`25`, `465`, `587`) are routinely blocked or rate-limited by major cloud and serverless hosting providers (AWS EC2, Google Cloud, Fly.io, Railway, DigitalOcean) to combat spam.
   - In contrast, outbound HTTPS (port `443`) is universally open, inspectable by enterprise egress proxies, and immune to cloud provider SMTP filtering.

2. **Serverless & Container Architecture:**
   - SMTP was engineered for long-lived TCP connections and stateful SMTP handshakes (`HELO`, `AUTH`, `MAIL FROM`, `RCPT TO`, `DATA`, `QUIT`).
   - In containerized web environments and serverless edge functions, opening a new TCP TLS connection per request adds 200–500ms latency overhead. HTTPS REST benefits from HTTP/1.1 and HTTP/2 connection pooling.

3. **Zero Heavyweight Dependencies:**
   - SMTP in Node.js requires external dependencies such as `nodemailer` and low-level socket stream handlers.
   - The REST API relies exclusively on Node.js built-in `fetch`, reducing bundle size, build duration, and dependency supply-chain vulnerability attack surfaces.

4. **Structured Error Diagnostics:**
   - Brevo's REST API returns explicit JSON error bodies and standard HTTP status codes (`400 Bad Request`, `401 Unauthorized`, `402 Payment Required / Quota Exceeded`, `429 Rate Limited`).
   - These are directly parsed and logged by `lib/email.ts` and `lib/email/outbox-worker.ts`, allowing intelligent fallback and backoff calculations, unlike opaque single-line SMTP numeric reply codes.

5. **Simpler Credential Management:**
   - A single Brevo API key (`BREVO_API_KEY`) is easier to rotate and validate via standard secret managers than managing paired SMTP usernames and passwords.

---

## 4. Required Environment Variables

To operate the Brevo email provider in staging or production, the following environment variables are required:

| Variable | Required | Default / Format | Description |
| :--- | :---: | :--- | :--- |
| `BREVO_API_KEY` | **Yes** | `xkeysib-...` | Brevo v3 API key. When present, enables Brevo as the primary provider. |
| `EMAIL_FROM` | No | `AspirantBook <no-reply@aspirantbook.com>` | Sender address. Supports `"Name <email@domain>"` or plain `"email@domain"`. |
| `BREVO_API_URL` | No | `https://api.brevo.com/v3/smtp/email` | API endpoint URL (allows mocking or private proxies). |

### Secondary Provider Variables (Optional Fallback):
| Variable | Required | Default / Format | Description |
| :--- | :---: | :--- | :--- |
| `RESEND_API_KEY` | No | `re_...` | Resend API key for automatic failover if Brevo fails. |
| `RESEND_API_URL` | No | `https://api.resend.com/emails` | Resend API endpoint override. |

---

## 5. Explicit Confirmation: SMTP Is Not Implemented

- **No SMTP client library:** Neither `nodemailer` nor any other SMTP transport library is present or imported in the codebase.
- **No SMTP credentials accepted:** Environment variables such as `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, or `BREVO_SMTP_KEY` are **not read**, parsed, or supported by any application code.
- **Decision:** As instructed in Task G6, supporting both transports is unnecessary maintenance overhead. The REST API is fully functional, covered by unit and integration tests, and remains the sole supported Brevo transport mechanism.
