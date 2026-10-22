import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { api } from "./api";

let lastPushRegistrationError: string | null = null;

export function getLastPushRegistrationError(): string | null {
  return lastPushRegistrationError;
}

export function setLastPushRegistrationError(err: string | null): void {
  lastPushRegistrationError = err;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push tokens only available on physical mobile devices
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    lastPushRegistrationError = "Push tokens only supported on Android and iOS devices";
    return null;
  }

  // Remote push notifications are not supported inside Expo Go (SDK 52+); requires development build
  const isExpoGo =
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
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
      deviceModel: Platform.select({ android: "Android Device", ios: "iOS Device" }),
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
