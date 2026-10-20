import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
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
