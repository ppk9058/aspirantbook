import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Text, View } from "react-native";
import { Button } from "../src/components/common/Button";
import { GoalProvider, useGoal } from "../src/context/GoalContext";
import SettingsScreen from "../src/app/settings";
import ProfileScreen from "../src/app/(tabs)/profile";
import { api } from "../src/lib/api";
import { Storage } from "../src/lib/storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerForPushNotificationsAsync, getLastPushRegistrationError } from "../src/lib/push";
import * as Haptics from "expo-haptics";

jest.mock("../src/lib/api");
const mockedApi = api as jest.Mocked<typeof api>;

jest.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Test User", email: "test@example.com", role: "STUDENT" },
    isAuthenticated: true,
    logout: jest.fn(),
  }),
}));

describe("U2: P4 Debt Clean Up (Catches, Unmocked Natives, State Error Visibility)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("Button triggers onPress and fires haptics behind platform capability check", () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPressMock} />
    );

    fireEvent.press(getByText("Test Button"));
    expect(onPressMock).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it("GoalContext updates goal locally and sets couldNotSyncGoal=true when server sync fails", async () => {
    mockedApi.updateMe.mockResolvedValueOnce({
      ok: false,
      error: { code: "SERVER_ERROR", message: "Failed to persist goal" },
    } as any);

    function TestGoalConsumer() {
      const { selectedGoal, selectGoal, couldNotSyncGoal } = useGoal();
      return (
        <View>
          <Text testID="goal-name">{selectedGoal.name}</Text>
          <Text testID="goal-sync-status">{couldNotSyncGoal ? "SYNC_FAILED" : "SYNCED"}</Text>
          <Button
            title="Switch to BPSC"
            onPress={() =>
              selectGoal({
                id: "bpsc",
                name: "BPSC",
                fullName: "Bihar Public Service Commission",
                category: "State PSC",
                iconName: "Building",
              })
            }
          />
        </View>
      );
    }

    const { getByText, getByTestId } = render(
      <GoalProvider>
        <TestGoalConsumer />
      </GoalProvider>
    );

    fireEvent.press(getByText("Switch to BPSC"));

    await waitFor(() => {
      expect(getByTestId("goal-name").props.children).toBe("BPSC");
      expect(getByTestId("goal-sync-status").props.children).toBe("SYNC_FAILED");
    });
  });

  it("settings screen displays visible error when sign out of all other devices fails", async () => {
    mockedApi.logoutAll.mockResolvedValueOnce({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Database connection failed during revocation" },
    } as any);

    const { getByText, findByText } = render(
      <QueryClientProvider client={queryClient}>
        <SettingsScreen />
      </QueryClientProvider>
    );

    // Switch to Security tab
    fireEvent.press(getByText("Security"));

    // Press Sign out of all other devices
    fireEvent.press(getByText("Sign out of all other devices"));

    const errorNotice = await findByText("Database connection failed during revocation");
    expect(errorNotice).toBeTruthy();
  });

  it("profile screen displays visible error when revoke all sessions fails", async () => {
    mockedApi.getMe.mockResolvedValueOnce({
      ok: true,
      data: { id: "u1", name: "Test User", email: "test@example.com", role: "STUDENT" },
    } as any);
    mockedApi.getSessions.mockResolvedValueOnce({
      ok: true,
      data: [{ id: "s1", deviceName: "Mobile", platform: "android", isCurrent: true, lastUsedAt: new Date().toISOString() }],
    } as any);
    mockedApi.logoutAll.mockResolvedValueOnce({
      ok: false,
      error: { code: "SERVER_UNAVAILABLE", message: "Session revocation service offline" },
    } as any);

    // Spy on Alert.alert to auto-trigger the destructive action
    const originalAlert = require("react-native").Alert.alert;
    jest.spyOn(require("react-native").Alert, "alert").mockImplementation((title, msg, buttons: any) => {
      const revokeBtn = buttons?.find((b: any) => b.text === "Revoke All");
      if (revokeBtn?.onPress) {
        revokeBtn.onPress();
      }
    });

    const { getByText, findByText } = render(
      <QueryClientProvider client={queryClient}>
        <ProfileScreen />
      </QueryClientProvider>
    );

    fireEvent.press(getByText("Sign out of all other devices"));

    const errorNotice = await findByText("Session revocation service offline");
    expect(errorNotice).toBeTruthy();

    (require("react-native").Alert.alert as any).mockRestore?.();
  });

  it("push registration stores error in state when device registration fails", async () => {
    mockedApi.registerDevice.mockResolvedValueOnce({
      ok: false,
      error: { code: "DEVICE_TOKEN_INVALID", message: "Token expired or unregistered" },
    } as any);

    await registerForPushNotificationsAsync();
    expect(getLastPushRegistrationError()).toContain("Token expired or unregistered");
  });
});
