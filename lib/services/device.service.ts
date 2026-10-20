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
  await prisma.devicePushToken.deleteMany({
    where: {
      token,
      ...(viewer.userId ? { userId: viewer.userId } : {}),
    },
  });

  return true;
}
