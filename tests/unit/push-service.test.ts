import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  isExpoPushToken,
  chunkArray,
  sendExpoPushNotifications,
  sendToUser,
  sendToBatch,
} from "../../lib/services/push.service";
import { prisma } from "../../lib/prisma";

describe("Expo Push Notification Service", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset any global mocks
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("validates Expo push tokens correctly", () => {
    assert.equal(isExpoPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"), true);
    assert.equal(isExpoPushToken("ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]"), true);
    assert.equal(isExpoPushToken("12345678-1234-1234-1234"), false);
    assert.equal(isExpoPushToken(""), false);
    assert.equal(isExpoPushToken(null as any), false);
  });

  it("splits large message arrays into chunks of 100", () => {
    const items = Array.from({ length: 250 }, (_, i) => ({ id: i }));
    const chunks = chunkArray(items, 100);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 100);
    assert.equal(chunks[1].length, 100);
    assert.equal(chunks[2].length, 50);
  });

  it("sends push chunk and purges DeviceNotRegistered tokens", async () => {
    const deletedTokens: string[] = [];
    const originalDeleteMany = prisma.devicePushToken.deleteMany;

    // Mock prisma deleteMany
    (prisma.devicePushToken as any).deleteMany = async ({ where }: any) => {
      if (where?.token?.in) {
        deletedTokens.push(...where.token.in);
      }
      return { count: deletedTokens.length };
    };

    try {
      global.fetch = async (url: any, init: any) => {
        const body = JSON.parse(init.body);
        assert.equal(body.length, 2);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { status: "ok", id: "ticket-1" },
              {
                status: "error",
                message: '"ExponentPushToken[invalid]" is not registered',
                details: { error: "DeviceNotRegistered" },
              },
            ],
          }),
        } as any;
      };

      const messages = [
        { to: "ExponentPushToken[valid-token]", title: "New Test Available", body: "Check your test" },
        { to: "ExponentPushToken[invalid]", title: "New Test Available", body: "Check your test" },
      ];

      const result = await sendExpoPushNotifications(messages, "https://mock.expo/push/send");

      assert.equal(result.tickets.length, 2);
      assert.equal(result.tickets[0].status, "ok");
      assert.equal(result.tickets[1].status, "error");
      assert.deepEqual(result.deregisteredTokens, ["ExponentPushToken[invalid]"]);
      assert.deepEqual(deletedTokens, ["ExponentPushToken[invalid]"]);
    } finally {
      (prisma.devicePushToken as any).deleteMany = originalDeleteMany;
    }
  });

  it("sends push to user with valid registered tokens", async () => {
    const originalFindMany = prisma.devicePushToken.findMany;

    (prisma.devicePushToken as any).findMany = async ({ where }: any) => {
      if (where.userId === "user-push-test") {
        return [
          { token: "ExponentPushToken[user-phone-1]" },
          { token: "ExponentPushToken[user-tablet-1]" },
        ];
      }
      return [];
    };

    try {
      let callCount = 0;
      global.fetch = async (url: any, init: any) => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { status: "ok", id: "ticket-101" },
              { status: "ok", id: "ticket-102" },
            ],
          }),
        } as any;
      };

      const result = await sendToUser(
        "user-push-test",
        {
          title: "Exam Tomorrow",
          body: "Don't forget your UPSC prelims mock",
          data: { testId: "test-42" },
        },
        "https://mock.expo/push/send"
      );

      assert.equal(callCount, 1);
      assert.equal(result.totalTokens, 2);
      assert.equal(result.successCount, 2);
      assert.equal(result.failureCount, 0);
    } finally {
      (prisma.devicePushToken as any).findMany = originalFindMany;
    }
  });

  it("sends batched pushes across multiple users, deduplicating tokens", async () => {
    const originalFindMany = prisma.devicePushToken.findMany;

    (prisma.devicePushToken as any).findMany = async () => {
      return [
        { token: "ExponentPushToken[token-a]" },
        { token: "ExponentPushToken[token-b]" },
        { token: "ExponentPushToken[token-a]" }, // Duplicate token across devices
      ];
    };

    try {
      global.fetch = async (url: any, init: any) => {
        const body = JSON.parse(init.body);
        assert.equal(body.length, 2); // Deduplicated from 3 to 2
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              { status: "ok", id: "ticket-a" },
              { status: "ok", id: "ticket-b" },
            ],
          }),
        } as any;
      };

      const result = await sendToBatch(
        ["user-1", "user-2"],
        { title: "Weekly Leaderboard", body: "Rankings updated" },
        "https://mock.expo/push/send"
      );

      assert.equal(result.totalTokens, 2);
      assert.equal(result.successCount, 2);
    } finally {
      (prisma.devicePushToken as any).findMany = originalFindMany;
    }
  });
});
