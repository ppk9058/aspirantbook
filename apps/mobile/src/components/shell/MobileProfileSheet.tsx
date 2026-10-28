import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import {
  X,
  User,
  CreditCard,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../primitives/Button";

export interface MobileProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  testID?: string;
}

export function MobileProfileSheet({
  isOpen,
  onClose,
  testID,
}: MobileProfileSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, tokens, isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, hasActivePass, logout } = useAuth();

  if (!isOpen) return null;

  const sheetWidth = Math.min(
    Dimensions.get("window").width * 0.8,
    tokens.dimensions.drawerMaxWidth
  );

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const avatarInitial = (
    user?.name?.[0] ||
    user?.email?.[0] ||
    "A"
  ).toUpperCase();

  const links = [
    {
      name: "My Profile & Learning Stats",
      route: "/profile",
      icon: User,
      testId: "profile-sheet-link-profile",
    },
    {
      name: "Subscription & Payments",
      route: "/subscription",
      icon: CreditCard,
      testId: "profile-sheet-link-subscription",
    },
    {
      name: "Account Settings",
      route: "/settings",
      icon: Settings,
      testId: "profile-sheet-link-settings",
    },
  ];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID || "mobile-profile-sheet"}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View
            testID="profile-sheet-backdrop"
            style={[
              styles.backdrop,
              { backgroundColor: colors.drawerBackdrop },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Slide-out Sheet Panel from Right */}
        <View
          style={[
            styles.panel,
            {
              width: sheetWidth,
              backgroundColor: colors.drawerBackground,
              borderColor: colors.drawerBorder,
              paddingTop: Math.max(tokens.spacing.md, insets.top),
              paddingBottom: Math.max(tokens.spacing.md, insets.bottom),
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.borderLight },
            ]}
          >
            <Text
              style={[
                styles.headerTitle,
                { color: colors.textPrimary },
              ]}
            >
              ACCOUNT & PROFILE
            </Text>
            <TouchableOpacity
              onPress={onClose}
              testID="profile-sheet-close"
              accessibilityLabel="Close profile menu"
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* User Profile Card / Guest State */}
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderBottomColor: colors.borderLight,
              },
            ]}
          >
            {isAuthenticated && user ? (
              <View>
                <View style={styles.userRow}>
                  <View
                    style={[
                      styles.avatarLarge,
                      {
                        backgroundColor: isDark ? "rgba(6, 22, 64, 0.7)" : "#dbeafe",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarLargeText,
                        { color: isDark ? "#93c5fd" : "#0b297c" },
                      ]}
                    >
                      {avatarInitial}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text
                      style={[
                        styles.userName,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {user.name || "Aspirant"}
                    </Text>
                    <Text
                      style={[
                        styles.userEmail,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {user.email || "learner@aspirantbook.com"}
                    </Text>
                    {user.phoneNumber ? (
                      <Text
                        style={[
                          styles.userPhone,
                          { color: colors.textMuted },
                        ]}
                      >
                        +91 {user.phoneNumber}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Pass Upgrade / Active Banner */}
                <TouchableOpacity
                  onPress={() => handleNavigate("/subscription")}
                  testID="profile-sheet-pass-banner"
                  activeOpacity={0.85}
                  style={[
                    styles.passBanner,
                    {
                      backgroundColor: hasActivePass
                        ? colors.passActiveBg
                        : colors.passUpgradeBg,
                      borderColor: hasActivePass
                        ? colors.passActiveBorder
                        : "transparent",
                    },
                  ]}
                >
                  <View style={styles.passBannerLeft}>
                    <Zap
                      size={14}
                      color={hasActivePass ? colors.passActiveText : "#FFFFFF"}
                      fill={hasActivePass ? colors.passActiveText : "#FFFFFF"}
                    />
                    <Text
                      style={[
                        styles.passBannerText,
                        {
                          color: hasActivePass
                            ? colors.passActiveText
                            : "#FFFFFF",
                        },
                      ]}
                    >
                      {hasActivePass
                        ? "Pass Active (Pro Access)"
                        : "Upgrade with Pass"}
                    </Text>
                  </View>
                  <ChevronRight
                    size={14}
                    color={hasActivePass ? colors.passActiveText : "#FFFFFF"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.guestContainer}>
                <Text
                  style={[
                    styles.guestTitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  You are exploring as a guest learner
                </Text>
                <Button
                  title="Sign In / Register →"
                  onPress={() => handleNavigate("/(auth)/login")}
                  variant="primary"
                  size="sm"
                  testID="profile-sheet-login-btn"
                />
              </View>
            )}
          </View>

          {/* Account Navigation Links */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.linksContent}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.textMuted },
              ]}
            >
              MY ACCOUNT
            </Text>

            {links.map((link) => {
              const Icon = link.icon;
              return (
                <TouchableOpacity
                  key={link.route}
                  onPress={() => handleNavigate(link.route)}
                  testID={link.testId}
                  accessibilityRole="button"
                  accessibilityLabel={link.name}
                  style={[
                    styles.linkItem,
                    { borderRadius: tokens.radius.xl },
                  ]}
                >
                  <View style={styles.linkLeft}>
                    <Icon size={18} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.linkText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {link.name}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer: Theme Toggle & Logout */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.borderLight },
            ]}
          >
            <TouchableOpacity
              onPress={toggleTheme}
              testID="profile-sheet-theme-toggle"
              style={[
                styles.themeBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: tokens.radius.xl,
                },
              ]}
            >
              {isDark ? (
                <Sun size={18} color="#fbbf24" />
              ) : (
                <Moon size={18} color={colors.textSecondary} />
              )}
              <Text
                style={[
                  styles.themeBtnText,
                  { color: colors.textPrimary },
                ]}
              >
                {isDark ? "Light Mode" : "Dark Mode"}
              </Text>
            </TouchableOpacity>

            {isAuthenticated && (
              <TouchableOpacity
                onPress={handleLogout}
                testID="profile-sheet-logout"
                accessibilityLabel="Logout"
                style={[
                  styles.logoutBtn,
                  { borderRadius: tokens.radius.xl },
                ]}
              >
                <LogOut size={16} color={colors.danger} />
                <Text
                  style={[
                    styles.logoutText,
                    { color: colors.danger },
                  ]}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  panel: {
    height: "100%",
    borderLeftWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  closeButton: {
    padding: 4,
  },
  profileCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 12,
  },
  avatarLargeText: {
    fontSize: 18,
    fontWeight: "900",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 11,
    fontWeight: "600",
  },
  passBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
  },
  passBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  passBannerText: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  guestContainer: {
    paddingVertical: 4,
  },
  guestTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  linksContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginVertical: 1,
    minHeight: 44,
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  themeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
});
