import { prisma } from "@/lib/prisma";

export interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: "DeviceNotRegistered" | "InvalidCredentials" | "MessageTooBig" | "MessageRateExceeded" | string;
    [key: string]: unknown;
  };
}

export interface PushSendResult {
  totalTokens: number;
  tickets: ExpoPushTicket[];
  successCount: number;
  failureCount: number;
  deregisteredTokens: string[];
}

/**
 * Validates whether a token string is a valid Expo push notification token.
 */
export function isExpoPushToken(token: string): boolean {
  if (typeof token !== "string") return false;
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[") ||
    /^[a-z0-9-_]{22}$/i.test(token)
  );
}

/**
 * Splits an array into chunks of the given size (default 100 per Expo API specification).
 */
export function chunkArray<T>(items: T[], chunkSize = 100): T[][] {
  if (!items || items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Sends push notification chunks to the Expo Push API.
 */
export async function sendExpoPushNotifications(
  messages: Array<{ to: string; title: string; body: string; [key: string]: unknown }>,
  expoApiUrl = "https://exp.host/--/api/v2/push/send"
): Promise<{ tickets: ExpoPushTicket[]; deregisteredTokens: string[] }> {
  const allTickets: ExpoPushTicket[] = [];
  const deregisteredTokens: string[] = [];
  const chunks = chunkArray(messages, 100);

  for (const chunk of chunks) {
    try {
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      };
      if (process.env.EXPO_ACCESS_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      }

      const res = await fetch(expoApiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        throw new Error(`Expo push service HTTP error: ${res.status} ${res.statusText}`);
      }

      const body = (await res.json()) as { data?: ExpoPushTicket[] };
      const tickets = body.data || [];

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const token = chunk[i]?.to;
        allTickets.push(ticket);

        if (ticket?.status === "error") {
          if (ticket.details?.error === "DeviceNotRegistered" && token) {
            deregisteredTokens.push(token);
          }
        }
      }
    } catch (err) {
      console.error("Failed to send push chunk to Expo:", err);
      // Generate synthetic error tickets for this chunk to notify caller
      for (const _msg of chunk) {
        allTickets.push({
          status: "error",
          message: err instanceof Error ? err.message : "Network error sending push",
        });
      }
    }
  }

  // Handle DB purging of DeviceNotRegistered tokens
  if (deregisteredTokens.length > 0) {
    try {
      await prisma.devicePushToken.deleteMany({
        where: { token: { in: deregisteredTokens } },
      });
    } catch (dbErr) {
      console.warn("Failed to delete deregistered push tokens from DB:", dbErr);
    }
  }

  return { tickets: allTickets, deregisteredTokens };
}

/**
 * Sends a push notification to all registered devices belonging to a single user.
 */
export async function sendToUser(
  userId: string,
  payload: PushMessagePayload,
  expoApiUrl?: string
): Promise<PushSendResult> {
  const tokens = await prisma.devicePushToken.findMany({
    where: { userId },
    select: { token: true },
  });

  const validTokens = tokens
    .map((t) => t.token)
    .filter((token) => isExpoPushToken(token));

  if (validTokens.length === 0) {
    return {
      totalTokens: 0,
      tickets: [],
      successCount: 0,
      failureCount: 0,
      deregisteredTokens: [],
    };
  }

  const messages = validTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: payload.sound ?? "default",
    badge: payload.badge,
    channelId: payload.channelId,
    priority: payload.priority ?? "high",
  }));

  const { tickets, deregisteredTokens } = await sendExpoPushNotifications(messages, expoApiUrl);
  const successCount = tickets.filter((t) => t.status === "ok").length;
  const failureCount = tickets.length - successCount;

  return {
    totalTokens: validTokens.length,
    tickets,
    successCount,
    failureCount,
    deregisteredTokens,
  };
}

/**
 * Sends a push notification to all registered devices across multiple users.
 * Automatically chunks requests into batches of 100.
 */
export async function sendToBatch(
  userIds: string[],
  payload: PushMessagePayload,
  expoApiUrl?: string
): Promise<PushSendResult> {
  if (userIds.length === 0) {
    return {
      totalTokens: 0,
      tickets: [],
      successCount: 0,
      failureCount: 0,
      deregisteredTokens: [],
    };
  }

  const tokens = await prisma.devicePushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  const validTokens = Array.from(
    new Set(
      tokens
        .map((t) => t.token)
        .filter((token) => isExpoPushToken(token))
    )
  );

  if (validTokens.length === 0) {
    return {
      totalTokens: 0,
      tickets: [],
      successCount: 0,
      failureCount: 0,
      deregisteredTokens: [],
    };
  }

  const messages = validTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: payload.sound ?? "default",
    badge: payload.badge,
    channelId: payload.channelId,
    priority: payload.priority ?? "high",
  }));

  const { tickets, deregisteredTokens } = await sendExpoPushNotifications(messages, expoApiUrl);
  const successCount = tickets.filter((t) => t.status === "ok").length;
  const failureCount = tickets.length - successCount;

  return {
    totalTokens: validTokens.length,
    tickets,
    successCount,
    failureCount,
    deregisteredTokens,
  };
}

/**
 * Fetches push notification delivery receipts from the Expo receipts service.
 */
export async function getPushReceipts(
  receiptIds: string[],
  receiptUrl = "https://exp.host/--/api/v2/push/getReceipts"
): Promise<Record<string, { status: "ok" | "error"; message?: string; details?: Record<string, unknown> }>> {
  if (receiptIds.length === 0) return {};

  const chunks = chunkArray(receiptIds, 1000);
  const allReceipts: Record<string, any> = {};

  for (const chunk of chunks) {
    try {
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      };
      if (process.env.EXPO_ACCESS_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      }

      const res = await fetch(receiptUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: chunk }),
      });

      if (res.ok) {
        const body = (await res.json()) as { data?: Record<string, any> };
        Object.assign(allReceipts, body.data || {});
      }
    } catch (err) {
      console.warn("Failed to retrieve Expo push receipts:", err);
    }
  }

  return allReceipts;
}
