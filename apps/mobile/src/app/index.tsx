import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { Storage } from "@/lib/storage";
import { api } from "@/lib/api";
import { registerForPushNotificationsAsync } from "@/lib/push";

export default function BootstrapScreen() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await Storage.getAccessToken();
        if (!token) {
          // Allow guest exploration matching web behavior
          router.replace("/(tabs)/home");
          return;
        }

        const meRes = await api.getMe();
        if (meRes.ok && meRes.data) {
          // Sync push notifications token in background
          registerForPushNotificationsAsync().catch(() => {});
          router.replace("/(tabs)/home");
        } else {
          // Token expired or invalid, fallback to guest mode
          await Storage.clearAllAuthTokens();
          router.replace("/(tabs)/home");
        }
      } catch {
        router.replace("/(tabs)/home");
      }
    }

    checkAuth();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1448d8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05192D",
    alignItems: "center",
    justifyContent: "center",
  },
});
