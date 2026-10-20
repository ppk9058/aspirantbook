import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OfflineBanner } from "../components/common/OfflineBanner";
import { persistQueryClient, restoreQueryClient } from "../lib/query-persistence";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    // 1. Restore persisted cache from disk on launch
    restoreQueryClient(queryClient);

    // 2. Subscribe to query cache updates to persist on changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === "updated" && event.query.state.status === "success") {
        persistQueryClient(queryClient);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="tests/[id]/index" />
          <Stack.Screen
            name="tests/[id]/runner"
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="tests/[id]/result" />
          <Stack.Screen name="tests/[id]/solutions" />
          <Stack.Screen name="tutorials/[slug]/index" />
          <Stack.Screen name="tutorials/[slug]/[lessonId]" />
          <Stack.Screen name="reader/[id]" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
