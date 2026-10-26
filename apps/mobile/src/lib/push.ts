import { api } from "./api";

let lastPushRegistrationError: string | null = null;

function getPlatform(): { OS: string; select: <T>(opts: { android?: T; ios?: T; default?: T }) => T | undefined } {
  try {
    const RN = require("react-native");
    return RN.Platform || { OS: "node", select: (opts: any) => opts.default };
  } catch {
    return { OS: "node", select: (opts: any) => opts.default };
  }
}

function getExpoConstants(): any {
  try {
    const c = require("expo-constants");
    return c?.default || c;
  } catch {
    return null;
  }
}

export function getLastPushRegistrationError(): string | null {
  return lastPushRegistrationError;
}

export function setLastPushRegistrationError(err: string | null): void {
  lastPushRegistrationError = err;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  examReminders: boolean;
  courseUpdates: boolean;
  dailyStreak: boolean;
}

const NOTIFICATION_PREFS_KEY = "ts_notification_prefs";

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { Storage } = require("./storage");
  try {
    const raw = await Storage.getItem(NOTIFICATION_PREFS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    pushEnabled: true,
    examReminders: true,
    courseUpdates: true,
    dailyStreak: true,
  };
}

export async function saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  const { Storage } = require("./storage");
  await Storage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
}

export function resolveNotificationRoute(data: any): string | null {
  if (!data) return null;
  if (typeof data.route === "string" && data.route.startsWith("/")) {
    return data.route;
  }
  if (typeof data.url === "string") {
    const path = data.url.replace(/^[a-zA-Z0-9+-.]+:\/\/[^/]+/, "");
    if (path.startsWith("/")) return path;
  }
  if (data.type === "course" && data.id) {
    return `/courses/${data.id}`;
  }
  if (data.type === "test" && data.id) {
    return `/tests/${data.id}`;
  }
  return null;
}

export function handleNotificationDeepLink(data: any, router: any): boolean {
  const targetRoute = resolveNotificationRoute(data);
  if (targetRoute && router && typeof router.push === "function") {
    router.push(targetRoute as any);
    return true;
  }
  return false;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Platform = getPlatform();

  // Push tokens only available on physical mobile devices
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    lastPushRegistrationError = "Push tokens only supported on Android and iOS devices";
    return null;
  }

  const Constants = getExpoConstants();
  // Remote push notifications are not supported inside Expo Go (SDK 52+); requires development build
  const isExpoGo =
    Constants?.appOwnership === "expo" ||
    Constants?.executionEnvironment === "storeClient";
  if (isExpoGo) {
    lastPushRegistrationError = "Push notifications require a development build";
    return null;
  }

  try {
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      lastPushRegistrationError = "Push notification permissions not granted";
      return null;
    }

    let tokenData: { data: string } | null = null;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync();
    } catch (err: unknown) {
      lastPushRegistrationError = err instanceof Error ? err.message : "Failed to obtain Expo push token";
      return null;
    }

    if (!tokenData?.data) {
      lastPushRegistrationError = "Missing Expo push token data";
      return null;
    }

    const token = tokenData.data;

    // Register token with the server
    const regRes = await api.registerDevice({
      token,
      platform: Platform.OS as "android" | "ios",
      deviceModel: Platform.select({ android: "Android Device", ios: "iOS Device" }) || "Mobile Device",
      appVersion: "1.0.0",
    });

    if (!regRes.ok) {
      lastPushRegistrationError = regRes.error?.message || "Server rejected push device registration";
    } else {
      lastPushRegistrationError = null;
    }

    return token;
  } catch (err: unknown) {
    lastPushRegistrationError = err instanceof Error ? err.message : "Push registration error";
    return null;
  }
}
