import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { api } from "./api";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push tokens only available on physical mobile devices
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData?.data) {
      return null;
    }

    const token = tokenData.data;

    // Register token with the server
    await api.registerDevice({
      token,
      platform: Platform.OS as "android" | "ios",
      deviceModel: Platform.select({ android: "Android Device", ios: "iOS Device" }),
      appVersion: "1.0.0",
    }).catch(() => {});

    return token;
  } catch (err) {
    // Graceful no-op until Google Services / Firebase credentials are provisioned
    return null;
  }
}
