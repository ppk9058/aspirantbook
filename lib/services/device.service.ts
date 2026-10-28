import { prisma } from "@/lib/prisma";
import { Viewer } from "@/lib/api/v1/viewer";
import { RegisterPushTokenRequest } from "@aspirantbook/shared";

export async function registerDeviceToken(
  viewer: Viewer,
  data: RegisterPushTokenRequest
): Promise<boolean> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to register push notification device");
  }

  await prisma.devicePushToken.upsert({
    where: { token: data.token },
    update: {
      userId: viewer.userId,
      platform: data.platform,
      deviceModel: data.deviceModel || null,
      appVersion: data.appVersion || null,
    },
    create: {
      userId: viewer.userId,
      token: data.token,
      platform: data.platform,
      deviceModel: data.deviceModel || null,
      appVersion: data.appVersion || null,
    },
  });

  return true;
}

export async function unregisterDeviceToken(
  viewer: Viewer,
  token: string
): Promise<boolean> {
  // A13: a token may only be removed by the account that owns it. A guest can
  // never delete anybody's push registration.
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Authentication required to unregister a device token");
  }

  const result = await prisma.devicePushToken.deleteMany({
    where: { token, userId: viewer.userId },
  });

  return result.count > 0;
}
