import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Storage } from "@/lib/storage";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function BootstrapScreen() {
  const router = useRouter();
  const { awaitViewerProfile } = useAuth();

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await Storage.getAccessToken();
        if (!token) {
          // Allow guest exploration matching web behavior
          router.replace("/(tabs)/home");
          return;
        }

        // F3: reuse the /me request AuthProvider already started (same bearer
        // token, same response). Falls back to a direct call when no provider
        // request is available, so the decision below is unchanged.
        const sharedViewer = await awaitViewerProfile();
        const meRes = sharedViewer ?? (await api.getMe());
        if (meRes.ok && meRes.data) {
          // Push notifications permissions are requested contextually (e.g. at enrollment or via Preferences), not on cold launch
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
  }, [router, awaitViewerProfile]);

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
