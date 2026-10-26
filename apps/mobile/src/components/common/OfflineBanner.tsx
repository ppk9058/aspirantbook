import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Network from "expo-network";
import { WifiOff } from "lucide-react-native";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function checkNetwork() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsOffline(!state.isConnected || state.isInternetReachable === false);
        }
      } catch {
        // Assume online if network check fails
        if (mounted) setIsOffline(false);
      }
    }

    checkNetwork();
    const interval = setInterval(checkNetwork, 10_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={14} color="#ffffff" style={styles.icon} />
      <Text style={styles.text}>Offline Mode — Showing cached content</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#d97706",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
