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
  Home,
  Layers,
  Book,
  ClipboardList,
  ClipboardCheck,
  BookOpen,
  FileText,
  Newspaper,
  GraduationCap,
  Code2,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useGoal } from "../../context/GoalContext";
import { Badge } from "../primitives/Badge";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  testID?: string;
}

export function MobileDrawer({ isOpen, onClose, testID }: MobileDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, tokens, isDark, toggleTheme } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();

  if (!isOpen) return null;

  const drawerWidth = Math.min(
    Dimensions.get("window").width * 0.8,
    tokens.dimensions.drawerMaxWidth
  );

  const navItems = [
    {
      name: "Dashboard",
      route: "/",
      icon: Home,
      testId: "mobile-drawer-dashboard",
    },
    {
      name: "My Batches & Enrollments",
      route: "/my-learning",
      icon: Layers,
      badge: "Enrolled",
      testId: "mobile-drawer-learning",
    },
    {
      name: "Online Bookstore",
      route: "/library",
      icon: Book,
      testId: "mobile-drawer-books",
    },
    {
      name: "Test Series & Mocks",
      route: "/tests",
      icon: ClipboardList,
      testId: "mobile-drawer-test-series",
    },
    {
      name: "My Test",
      route: "/my-tests",
      icon: ClipboardCheck,
      badge: "Active",
      testId: "mobile-drawer-my-tests",
    },
    {
      name: "Video Courses",
      route: "/courses",
      icon: BookOpen,
      testId: "mobile-drawer-courses",
    },
    {
      name: "Previous Year Papers (PYQs)",
      route: "/pyqs",
      icon: FileText,
      testId: "mobile-drawer-pyqs",
    },
    {
      name: "Current Affairs & Quizzes",
      route: "/current-affairs",
      icon: Newspaper,
      testId: "mobile-drawer-current-affairs",
    },
    {
      name: "Tutorials & Articles",
      route: "/tutorials",
      icon: GraduationCap,
      testId: "mobile-drawer-tutorials",
    },
    {
      name: "Coding Practice",
      route: "/practice",
      icon: Code2,
      testId: "mobile-drawer-practice",
    },
  ];

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID || "mobile-drawer"}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View
            testID="drawer-backdrop"
            style={[
              styles.backdrop,
              { backgroundColor: colors.drawerBackdrop },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Slide-out Drawer Panel */}
        <View
          style={[
            styles.panel,
            {
              width: drawerWidth,
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
            <TouchableOpacity
              onPress={() => handleNavigate("/")}
              testID="drawer-logo"
              style={styles.logoRow}
            >
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
              <Text style={styles.brandText}>
                <Text style={{ color: colors.brandTextPrimary }}>aspirant</Text>
                <Text style={{ color: colors.brandTextAccent }}>book</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              testID="drawer-close"
              accessibilityLabel="Close navigation menu"
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Goal Switcher Row */}
          <View
            style={[
              styles.goalRow,
              {
                backgroundColor: colors.surfaceSecondary,
                borderBottomColor: colors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.goalLabel,
                { color: colors.textMuted },
              ]}
            >
              TARGET GOAL
            </Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                openGoalModal();
              }}
              testID="drawer-goal-btn"
              accessibilityLabel={`Target Goal: ${selectedGoal.name}`}
              style={[
                styles.goalSelector,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.goalName,
                  { color: colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {selectedGoal.name}
              </Text>
              <ChevronDown size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Nav Items List */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.textMuted },
              ]}
            >
              PRIMARY NAVIGATION
            </Text>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.route ||
                (item.route === "/" && (pathname === "/(tabs)/home" || pathname === "/home"));

              return (
                <TouchableOpacity
                  key={item.route}
                  onPress={() => handleNavigate(item.route)}
                  testID={item.testId}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  style={[
                    styles.navItem,
                    {
                      backgroundColor: isActive
                        ? colors.drawerActiveItemBg
                        : "transparent",
                      borderRadius: tokens.radius.xl,
                    },
                  ]}
                >
                  <View style={styles.navItemLeft}>
                    <Icon
                      size={18}
                      color={
                        isActive
                          ? colors.drawerActiveItemText
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.navItemText,
                        {
                          color: isActive
                            ? colors.drawerActiveItemText
                            : colors.drawerInactiveItemText,
                          fontWeight: isActive ? "700" : "600",
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {item.badge ? (
                    <Badge
                      label={item.badge}
                      variant="primary"
                      size="sm"
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer: Theme Toggle */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.borderLight },
            ]}
          >
            <TouchableOpacity
              onPress={toggleTheme}
              testID="drawer-theme-toggle"
              style={[
                styles.themeButton,
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
                  styles.themeButtonText,
                  { color: colors.textPrimary },
                ]}
              >
                {isDark ? "Light Mode" : "Dark Mode"}
              </Text>
            </TouchableOpacity>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  panel: {
    height: "100%",
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoLetter: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  brandText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 6,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  goalSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 140,
  },
  goalName: {
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  scroll: {
    flex: 1,
  },
  navContent: {
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
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 1,
    minHeight: 44,
  },
  navItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  navItemText: {
    fontSize: 13,
    marginLeft: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  themeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    minHeight: 44,
  },
  themeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
});
