import { prisma } from "@/lib/prisma";

export interface ExpoPushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  badge?: number;
}

export interface PushDispatchResult {
  sent: boolean;
  count: number;
  status: "DISABLED" | "SENT" | "ERROR";
  reason?: string;
  tickets?: any[];
}

export function isMobilePushEnabled(): boolean {
  return process.env.ENABLE_MOBILE_PUSH === "true";
}

/**
 * Dispatches a batch of push notifications to Expo Push service.
 * Respects the ENABLE_MOBILE_PUSH feature flag (default false) to ensure
 * Hard Rule 6 compliance: no real sends during tests or unflagged runs.
 */
export async function sendPushNotificationBatch(
  messages: ExpoPushMessage[],
  fetchFn: typeof fetch = fetch
): Promise<PushDispatchResult> {
  if (messages.length === 0) {
    return { sent: false, count: 0, status: "SENT", tickets: [] };
  }

  // Feature Flag Guard: Safety First
  if (!isMobilePushEnabled()) {
    console.info(
      `[PushDispatcher] Push disabled (ENABLE_MOBILE_PUSH=false). Simulated/logged ${messages.length} message(s).`
    );
    return {
      sent: false,
      count: messages.length,
      status: "DISABLED",
      reason: "ENABLE_MOBILE_PUSH feature flag is disabled",
      tickets: messages.map((m, i) => ({
        id: `mock-ticket-${i}-${Date.now()}`,
        status: "ok",
        simulated: true,
      })),
    };
  }

  const endpoint = process.env.EXPO_PUSH_ENDPOINT || "https://exp.host/--/api/v2/push/send";

  try {
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PushDispatcher] Expo server error (${response.status}):`, errText);
      return {
        sent: false,
        count: messages.length,
        status: "ERROR",
        reason: `Expo push HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    const tickets = result.data || [];

    // Check for immediate DeviceNotRegistered errors in tickets
    const unregisteredTokens: string[] = [];
    tickets.forEach((ticket: any, idx: number) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        const target = messages[idx]?.to;
        if (typeof target === "string") {
          unregisteredTokens.push(target);
        } else if (Array.isArray(target)) {
          unregisteredTokens.push(...target);
        }
      }
    });

    if (unregisteredTokens.length > 0) {
      await pruneUnregisteredTokens(unregisteredTokens);
    }

    return {
      sent: true,
      count: messages.length,
      status: "SENT",
      tickets,
    };
  } catch (err: any) {
    console.error("[PushDispatcher] Network or unexpected dispatch error:", err);
    return {
      sent: false,
      count: messages.length,
      status: "ERROR",
      reason: err?.message || "Dispatch failed",
    };
  }
}

/**
 * Prunes expired or unregistered push tokens from the database.
 */
export async function pruneUnregisteredTokens(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;

  const res = await prisma.devicePushToken.deleteMany({
    where: {
      token: { in: tokens },
    },
  });

  console.info(`[PushDispatcher] Pruned ${res.count} unregistered device push token(s) from database.`);
  return res.count;
}

/**
 * Handles receipt responses from Expo Receipts API.
 * Identifies DeviceNotRegistered errors and prunes tokens.
 */
export async function processExpoReceipts(
  receiptsMap: Record<string, { status: string; details?: { error?: string }; message?: string }>,
  tokenMap?: Record<string, string> // receiptId -> token
): Promise<{ processed: number; prunedTokens: string[] }> {
  const prunedTokens: string[] = [];

  for (const [receiptId, receipt] of Object.entries(receiptsMap)) {
    if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
      const token = tokenMap?.[receiptId];
      if (token) {
        prunedTokens.push(token);
      }
    }
  }

  if (prunedTokens.length > 0) {
    await pruneUnregisteredTokens(prunedTokens);
  }

  return {
    processed: Object.keys(receiptsMap).length,
    prunedTokens,
  };
}
