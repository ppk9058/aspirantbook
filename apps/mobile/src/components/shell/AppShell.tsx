import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, BackHandler, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { MobileAppHeader } from "./MobileAppHeader";
import { MobileDrawer } from "./MobileDrawer";
import { MobileProfileSheet } from "./MobileProfileSheet";
import { MobileBottomBar, isBottomBarHidden } from "./MobileBottomBar";
import { GoalModal } from "./GoalModal";
import { useGoal } from "../../context/GoalContext";
import { useTheme } from "../../theme/ThemeProvider";

export interface AppShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showBottomBar?: boolean;
  testID?: string;
}

export function AppShell({
  children,
  showHeader = true,
  showBottomBar = true,
  testID,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isGoalModalOpen, closeGoalModal } = useGoal();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const openProfile = useCallback(() => setIsProfileOpen(true), []);
  const closeProfile = useCallback(() => setIsProfileOpen(false), []);

  // Android hardware back button priority handler (Section 5)
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBackPress = () => {
      if (isGoalModalOpen) {
        closeGoalModal();
        return true;
      }
      if (isDrawerOpen) {
        closeDrawer();
        return true;
      }
      if (isProfileOpen) {
        closeProfile();
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [
    isGoalModalOpen,
    isDrawerOpen,
    isProfileOpen,
    closeGoalModal,
    closeDrawer,
    closeProfile,
    router,
  ]);

  const hideBottomNav = !showBottomBar || isBottomBarHidden(pathname);

  return (
    <View
      testID={testID || "app-shell"}
      style={[
        styles.shellRoot,
        {
          backgroundColor: colors.background,
          paddingTop: showHeader ? insets.top : 0,
        },
      ]}
    >
      {showHeader ? (
        <MobileAppHeader
          onOpenDrawer={openDrawer}
          onOpenProfile={openProfile}
        />
      ) : null}

      <View style={styles.mainContent}>{children}</View>

      {!hideBottomNav ? <MobileBottomBar /> : null}

      {/* Overlays */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
      <MobileProfileSheet isOpen={isProfileOpen} onClose={closeProfile} />
      <GoalModal />
    </View>
  );
}

const styles = StyleSheet.create({
  shellRoot: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
});
