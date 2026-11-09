import { ExpoConfig, ConfigContext } from "expo/config";

const isDevMode = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const configuredApiPort = process.env.EXPO_PUBLIC_API_PORT || "3045";
const apiUrlSource = configuredApiUrl
  ? (process.env.EXPO_PUBLIC_API_URL_SOURCE || "env")
  : (isDevMode ? "derived" : "unconfigured");
const startupDisplayUrl = configuredApiUrl || (isDevMode ? `http://<metro-host>:${configuredApiPort}` : "UNCONFIGURED");

const isProductionBuild =
  process.env.EXPO_PUBLIC_APP_ENV === "production" ||
  process.env.EAS_BUILD_PROFILE === "production";

if (isProductionBuild) {
  if (!configuredApiUrl || !configuredApiUrl.startsWith("https://")) {
    throw new Error(
      `[Mobile Release Guard] Production builds must use HTTPS for EXPO_PUBLIC_API_URL. Received: "${configuredApiUrl || "EMPTY"}". Insecure HTTP or localhost is strictly disallowed.`
    );
  }
  if (/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i.test(configuredApiUrl)) {
    throw new Error(
      `[Mobile Release Guard] Production builds cannot point to local or emulator IP: "${configuredApiUrl}".`
    );
  }
}

if (isDevMode) {
  console.log(`[API] Resolved Base URL: ${startupDisplayUrl} (source: ${apiUrlSource})`);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "AspirantBook",
  slug: "aspirantbook",
  scheme: "aspirantbook",
  version: "1.0.0",
  platforms: ["ios", "android"],
  orientation: "portrait",
  icon: "../../assets/brand/icon-512.png",
  userInterfaceStyle: "automatic",
  // In Expo SDK 57, newArchEnabled is standard in RN 0.86 and splash moved to plugin/web
  // We keep them in runtime config for backwards compatibility while satisfying ExpoConfig type
  ...({
    newArchEnabled: true,
    splash: {
      image: "../../assets/brand/splash-image.png",
      resizeMode: "contain",
      backgroundColor: "#05192D",
    },
  } as any),
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
    "expo-asset",
    "expo-video",
    // "@config-plugins/react-native-blob-util",
    // "@config-plugins/react-native-pdf",
    [
      "expo-notifications",
      {
        icon: "../../assets/brand/icon-192.png",
        color: "#1448d8",
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "",
    eas: {
      projectId: "aspirantbook-mobile",
    },
  },
});
