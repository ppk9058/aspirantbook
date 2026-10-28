import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Home, ClipboardList, BookOpen, Zap } from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { isBottomBarHidden, isTabActive } from "../../lib/shell-navigation";

export { isBottomBarHidden };

export interface MobileBottomBarProps {
  testID?: string;
}

export function MobileBottomBar({ testID }: MobileBottomBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useTheme();
  const { hasActivePass } = useAuth();

  if (isBottomBarHidden(pathname)) {
    return null;
  }

  // Active highlights matching web MobileNativeBottomBar.tsx#L40-L65
  const isHomeActive = Boolean(
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname === "/(tabs)/home" ||
    pathname === "/home"
  );

  const isTestsActive = Boolean(
    pathname && (
      pathname.startsWith("/tests") ||
      pathname.startsWith("/test-series") ||
      pathname.startsWith("/my-tests") ||
      pathname.startsWith("/assessments") ||
      pathname.startsWith("/pyqs") ||
      pathname.startsWith("/current-affairs") ||
      pathname === "/(tabs)/tests"
    )
  );

  const isCoursesActive = Boolean(
    pathname && (
      (pathname.startsWith("/courses") && !isHomeActive) ||
      pathname.startsWith("/tutorials") ||
      pathname.startsWith("/tracks") ||
      pathname.startsWith("/batches") ||
      pathname.startsWith("/my-learning") ||
      pathname === "/(tabs)/courses"
    )
  );

  const isPassActive = Boolean(
    pathname && (
      pathname.startsWith("/subscription") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/pass") ||
      pathname === "/(tabs)/pass"
    )
  );

  const tabs = [
    {
      name: "Home",
      route: "/(tabs)/home",
      icon: Home,
      isActive: isHomeActive,
      testId: "mobile-bottom-tab-home",
    },
    {
      name: "Tests",
      route: "/(tabs)/tests",
      icon: ClipboardList,
      isActive: isTestsActive,
      testId: "mobile-bottom-tab-tests",
    },
    {
      name: "Courses",
      route: "/(tabs)/courses",
      icon: BookOpen,
      isActive: isCoursesActive,
      testId: "mobile-bottom-tab-courses",
    },
    {
      name: "Pass",
      route: "/(tabs)/pass",
      icon: Zap,
      isActive: isPassActive,
      badge: hasActivePass ? "ACTIVE" : undefined,
      testId: "mobile-bottom-tab-pass",
    },
  ];

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View
      testID={testID || "mobile-bottom-bar"}
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          height: tokens.dimensions.bottomBarHeight + insets.bottom,
          paddingBottom: Math.max(6, insets.bottom),
          backgroundColor: colors.bottomBarBackground,
          borderTopColor: colors.bottomBarBorder,
        },
      ]}
    >
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab.route)}
              testID={tab.testId}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.name}
              activeOpacity={0.8}
              style={styles.tabButton}
            >
              <View style={styles.iconContainer}>
                <Icon
                  size={20}
                  color={
                    active
                      ? colors.bottomBarActive
                      : colors.bottomBarInactive
                  }
                  strokeWidth={active ? 2.5 : 1.75}
                />
                {tab.badge ? (
                  <View
                    style={[
                      styles.badgeContainer,
                      { backgroundColor: colors.passBadgeBg },
                    ]}
                  >
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                ) : null}
                {active ? (
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: colors.bottomBarDot },
                    ]}
                  />
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active
                      ? colors.bottomBarActive
                      : colors.bottomBarInactive,
                    fontWeight: active ? "800" : "500",
                  },
                ]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    zIndex: 40,
    width: "100%",
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44, // 44px min touch target
    paddingVertical: 4,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 24,
  },
  activeDot: {
    position: "absolute",
    bottom: -6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeContainer: {
    position: "absolute",
    top: -4,
    right: -10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "900",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 6,
    letterSpacing: -0.2,
  },
});
