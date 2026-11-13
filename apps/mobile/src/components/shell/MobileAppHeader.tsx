import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from "react-native";
import { Menu, Search } from "lucide-react-native";
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
          accessibilityLabel="AspirantBook Home"
          testID="mobile-header-logo"
          style={styles.brandRow}
        >
          {/* Brand Logo Image */}
          <Image
            source={require("../../../../assets/brand/icon-192.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          {/* The full wordmark must never be clipped: the bell that used to sit
              here now lives in the profile sheet, and the text is not allowed to
              shrink, so "AspirantBook" always renders in full at 320–390px. */}
          <Text testID="mobile-header-brand-name" style={styles.brandText}>
            AspirantBook
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right Controls: Search, Profile Avatar / Login CTA (notifications moved
          into the profile sheet so the brand wordmark is never clipped) */}
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    flexShrink: 0,
  },
  logoBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
  },
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
  },
  brandText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.4,
    color: "#ff0031",
    flexShrink: 0,
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
