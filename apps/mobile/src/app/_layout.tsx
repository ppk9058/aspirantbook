import React, { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OfflineBanner } from "../components/common/OfflineBanner";
import {
  flushPersistedQueryClient,
  restoreQueryClient,
  schedulePersistQueryClient,
  createDefaultQueryClient,
} from "../lib/query-persistence";
import { cbtSyncQueue } from "../lib/cbt-sync";
import { ThemeProvider } from "../theme/ThemeProvider";
import { AuthProvider } from "../context/AuthContext";
import { GoalProvider } from "../context/GoalContext";
import { ContentLanguageProvider } from "../context/ContentLanguageContext";
import { CbtRecoveryManager } from "../components/cbt/CbtRecoveryManager";

export const queryClient = createDefaultQueryClient();

export default function RootLayout() {
  useEffect(() => {
    // 1. Restore persisted cache from disk on launch
    restoreQueryClient(queryClient);

    // 2. Subscribe to query cache updates to persist on changes.
    //    Writes are debounced (one SQLite write per quiet window instead of one
    //    per query update) and flushed immediately when the app leaves the
    //    foreground, so the cache restored on the next launch is unchanged.
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === "updated" && event.query.state.status === "success") {
        schedulePersistQueryClient(queryClient);
      }
    });
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        void flushPersistedQueryClient(queryClient);
      }
    });

    // 3. CBT answer recovery is managed by CbtRecoveryManager inside AuthProvider:
    // cbtSyncQueue.recoverUnsentAnswers() triggers only after tokens resolve and on AppState resume.

    return () => {
      unsubscribe();
      appStateSubscription.remove();
      // Flush the tail of the debounce window so nothing is lost on unmount.
      void flushPersistedQueryClient(queryClient);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider queryClient={queryClient}>
            <CbtRecoveryManager />
            <GoalProvider>
              <ContentLanguageProvider>
                <StatusBar style="auto" />
                <OfflineBanner />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="practice" />
                  <Stack.Screen name="library" />
                  <Stack.Screen name="profile" />
                  <Stack.Screen name="my-tests" />
                  <Stack.Screen name="my-learning" />
                  <Stack.Screen name="pyqs/index" />
                  <Stack.Screen name="current-affairs/index" />
                  <Stack.Screen name="subscription" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="search" />
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
              </ContentLanguageProvider>
            </GoalProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
