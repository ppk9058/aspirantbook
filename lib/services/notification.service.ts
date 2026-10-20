import { prisma } from "@/lib/prisma";
import { Viewer } from "@/lib/api/v1/viewer";
import { NotificationItemDto } from "@aspirantbook/shared";

export async function getNotifications(viewer: Viewer): Promise<NotificationItemDto[]> {
  if (!viewer.userId) {
    return [];
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: viewer.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      read: true,
      createdAt: true,
      link: true,
    },
  });

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.read,
    createdAt: n.createdAt.toISOString(),
    linkUrl: n.link,
  }));
}

export async function markNotificationsRead(
  viewer: Viewer,
  notificationIds: string[]
): Promise<boolean> {
  if (!viewer.userId || notificationIds.length === 0) {
    return false;
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId: viewer.userId,
    },
    data: { read: true },
  });

  return true;
}
