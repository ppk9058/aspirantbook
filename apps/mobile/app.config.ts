import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "aspirantbook",
  slug: "aspirantbook",
  scheme: "aspirantbook",
  version: "1.0.0",
  orientation: "portrait",
  icon: "../../assets/brand/icon-512.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "../../assets/brand/splash-image.png",
    resizeMode: "contain",
    backgroundColor: "#05192D",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.aspirantbook.app",
    buildNumber: "1",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "../../assets/brand/icon-512.png",
      backgroundColor: "#05192D",
    },
    package: "com.aspirantbook.app",
    versionCode: 1,
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "VIBRATE",
      "WAKE_LOCK",
      "RECEIVE_BOOT_COMPLETED",
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-sqlite",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        icon: "../../assets/brand/icon-192.png",
        color: "#1448d8",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    EXPO_PUBLIC_API_URL:
      process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3045",
    eas: {
      projectId: "aspirantbook-mobile",
    },
  },
});
