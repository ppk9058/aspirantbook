import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface OutboxProcessOptions {
  batchSize?: number;
  baseBackoffSec?: number;
  maxAttempts?: number;
}

export interface OutboxProcessStats {
  processed: number;
  sent: number;
  failed: number;
  deadLettered: number;
}

export function calculateBackoffMs(attempts: number, baseSec = 60): number {
  const exponent = Math.min(attempts, 6);
  const backoffSec = baseSec * Math.pow(2, exponent);
  // Add 0-20% random jitter
  const jitterSec = Math.floor(Math.random() * (backoffSec * 0.2));
  return (backoffSec + jitterSec) * 1000;
}

function parseFromAddress(): { name: string; email: string } {
  const fromRaw = process.env.EMAIL_FROM || "AspirantBook <no-reply@aspirantbook.com>";
  const match = fromRaw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "AspirantBook", email: fromRaw.trim() };
}

async function sendBrevo(
  to: string,
  subject: string,
  html: string,
  text?: string | null,
  idempotencyKey?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { success: false, error: "BREVO_API_KEY is not configured" };
  }

  const { name, email } = parseFromAddress();
  const endpoint = process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sender: { name, email },
        to: [{ email }],
        subject,
        htmlContent: html,
        textContent: text || html.replace(/<[^>]+>/g, " ").trim(),
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Brevo HTTP ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as any;
    return { success: true, id: data.messageId || data.id || "brevo_sent" };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

async function sendResend(
  to: string,
  subject: string,
  html: string,
  text?: string | null,
  idempotencyKey?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  const { name, email } = parseFromAddress();
  const fromFormatted = `${name} <${email}>`;
  const endpoint = process.env.RESEND_API_URL || "https://api.resend.com/emails";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: fromFormatted,
        to,
        subject,
        html,
        text: text || undefined,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Resend HTTP ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as any;
    return { success: true, id: data.id || "resend_sent" };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function processEmailOutbox(
  options: OutboxProcessOptions = {}
): Promise<OutboxProcessStats> {
  const batchSize = Math.max(1, Math.min(options.batchSize || 20, 100));
  const maxAttempts =
    options.maxAttempts ||
    Number.parseInt(process.env.EMAIL_OUTBOX_MAX_ATTEMPTS || "5", 10) ||
    5;
  const baseBackoffSec =
    options.baseBackoffSec ||
    Number.parseInt(process.env.EMAIL_OUTBOX_BACKOFF_BASE_SEC || "60", 10) ||
    60;

  const stats: OutboxProcessStats = {
    processed: 0,
    sent: 0,
    failed: 0,
    deadLettered: 0,
  };

  // 1. Concurrently claim rows with FOR UPDATE SKIP LOCKED
  const claimedRows: any[] = await prisma.$transaction(async (tx) => {
    const rows: any[] = await tx.$queryRaw`
      SELECT id, "to", subject, html, text, link, token, status, provider, error, attempts
      FROM "EmailOutbox"
      WHERE status = 'PENDING'
        AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
      ORDER BY "createdAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED;
    `;

    if (!rows || rows.length === 0) {
      return [];
    }

    const ids = rows.map((r) => r.id);
    await tx.$executeRaw`
      UPDATE "EmailOutbox"
      SET status = 'PROCESSING', "updatedAt" = NOW()
      WHERE id = ANY(${ids}::text[]);
    `;

    return rows;
  });

  if (claimedRows.length === 0) {
    return stats;
  }

  stats.processed = claimedRows.length;

  // 2. Process each claimed row
  for (const row of claimedRows) {
    const currentAttempts = Number(row.attempts || 0);
    const nextAttemptNumber = currentAttempts + 1;
    // Idempotency key binds this specific delivery attempt to avoid double-sends
    const idempotencyKey = `email_outbox_${row.id}_attempt_${nextAttemptNumber}`;

    let sentSuccessfully = false;
    let successfulProvider = "";
    let lastError = "";

    // Step A: Primary provider (Brevo)
    if (process.env.BREVO_API_KEY) {
      const brevoResult = await sendBrevo(
        row.to,
        row.subject,
        row.html || "",
        row.text,
        idempotencyKey
      );
      if (brevoResult.success) {
        sentSuccessfully = true;
        successfulProvider = "brevo";
      } else {
        lastError = `Brevo: ${brevoResult.error}`;
      }
    } else {
      lastError = "Brevo: Not configured";
    }

    // Step B: Fallback provider (Resend)
    if (!sentSuccessfully && process.env.RESEND_API_KEY) {
      const resendResult = await sendResend(
        row.to,
        row.subject,
        row.html || "",
        row.text,
        idempotencyKey
      );
      if (resendResult.success) {
        sentSuccessfully = true;
        successfulProvider = "resend";
      } else {
        lastError = `${lastError}; Resend: ${resendResult.error}`;
      }
    }

    // Step C: Update row state
    if (sentSuccessfully) {
      await prisma.emailOutbox.update({
        where: { id: row.id },
        data: {
          status: "SENT",
          provider: successfulProvider,
          sentAt: new Date(),
          attempts: nextAttemptNumber,
          error: null,
          nextRetryAt: null,
        },
      });
      stats.sent++;
    } else {
      // Both failed
      if (nextAttemptNumber >= maxAttempts) {
        // Transition to DEAD_LETTER
        await prisma.emailOutbox.update({
          where: { id: row.id },
          data: {
            status: "DEAD_LETTER",
            attempts: nextAttemptNumber,
            error: `Max delivery attempts (${maxAttempts}) exceeded. Last error: ${lastError}`,
            nextRetryAt: null,
          },
        });
        stats.deadLettered++;
      } else {
        // Re-queue with exponential backoff and jitter
        const backoffMs = calculateBackoffMs(nextAttemptNumber, baseBackoffSec);
        const nextRetryAt = new Date(Date.now() + backoffMs);

        await prisma.emailOutbox.update({
          where: { id: row.id },
          data: {
            status: "PENDING",
            attempts: nextAttemptNumber,
            error: lastError,
            nextRetryAt,
          },
        });
        stats.failed++;
      }
    }
  }

  return stats;
}
