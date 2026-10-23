import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Menu, Search, Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../context/AuthContext";

export interface MobileAppHeaderProps {
  onOpenDrawer: () => void;
  onOpenProfile: () => void;
  testID?: string;
}

export function MobileAppHeader({
  onOpenDrawer,
  onOpenProfile,
  testID,
}: MobileAppHeaderProps) {
  const router = useRouter();
  const { colors, tokens, isDark } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleLogoPress = () => {
    router.push("/" as any);
  };

  const handleSearchPress = () => {
    router.push("/search" as any);
  };

  const handleNotificationsPress = () => {
    router.push("/notifications/preferences" as any);
  };

  const handleLoginPress = () => {
    router.push("/(auth)/login" as any);
  };

  const avatarInitial = (
    user?.name?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <View
      testID={testID || "mobile-header"}
      style={[
        styles.header,
        {
          height: tokens.dimensions.headerHeight,
          backgroundColor: colors.headerBackground,
          borderBottomColor: colors.headerBorder,
        },
      ]}
    >
      {/* Left: Hamburger + Brand Logo & Text */}
      <View style={styles.leftGroup}>
        <TouchableOpacity
          onPress={onOpenDrawer}
          accessibilityLabel="Open navigation menu"
          testID="mobile-header-hamburger"
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Menu size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogoPress}
          activeOpacity={0.8}
          accessibilityLabel="Aspirantbook Home"
          testID="mobile-header-logo"
          style={styles.brandRow}
        >
          {/* Brand "T" Logo Box */}
          <View
            style={[
              styles.logoBox,
              {
                backgroundColor: colors.brandFrom,
                borderRadius: tokens.radius.lg,
              },
            ]}
          >
            <Text style={styles.logoLetter}>T</Text>
          </View>
          <Text testID="mobile-header-brand-name" style={styles.brandText}>
            <Text style={{ color: colors.brandTextPrimary }}>aspirant</Text>
            <Text style={{ color: colors.brandTextAccent }}>book</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right Controls: Search, Bell with Rose Dot, Profile Avatar / Login CTA */}
      <View style={styles.rightGroup}>
        {/* Search */}
        <TouchableOpacity
          onPress={handleSearchPress}
          accessibilityLabel="Search courses, test series, notes"
          testID="mobile-header-search"
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Search size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Bell with rose dot (shown only for authenticated users) */}
        <TouchableOpacity
          onPress={handleNotificationsPress}
          accessibilityLabel="Notifications"
          testID="mobile-header-bell"
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Bell size={20} color={colors.textSecondary} />
          {isAuthenticated ? (
            <View
              testID="mobile-header-notification-dot"
              style={[
                styles.notificationDot,
                {
                  backgroundColor: colors.notificationDot,
                  borderColor: colors.surface,
                },
              ]}
            />
          ) : null}
        </TouchableOpacity>

        {/* Profile Avatar if logged-in, Login CTA if guest */}
        {isLoading ? (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          />
        ) : isAuthenticated && user ? (
          <TouchableOpacity
            onPress={onOpenProfile}
            accessibilityLabel="Account profile"
            testID="mobile-header-avatar"
            style={[
              styles.avatarButton,
              {
                backgroundColor: isDark ? "rgba(6, 22, 64, 0.7)" : "#dbeafe",
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: isDark ? "#93c5fd" : "#0b297c" },
              ]}
            >
              {avatarInitial}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleLoginPress}
            accessibilityLabel="Login"
            testID="mobile-header-login-btn"
            style={[
              styles.loginButton,
              {
                backgroundColor: colors.primary,
                borderRadius: tokens.radius.md,
              },
            ]}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 50,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  logoBox: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  logoLetter: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  brandText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 6,
    marginLeft: 4,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  avatarButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  loginButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
    minHeight: 30,
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
