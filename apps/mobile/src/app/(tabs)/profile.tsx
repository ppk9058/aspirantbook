import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  User,
  Smartphone,
  LogOut,
  Shield,
  Trash2,
  BookOpen,
  Award,
  Crown,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../../src/components/primitives/Card";
import { Badge } from "../../../src/components/primitives/Badge";
import { Button } from "../../../src/components/primitives/Button";
import { Skeleton } from "../../../src/components/primitives/Skeleton";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { useGoal } from "../../context/GoalContext";
import { api } from "../../lib/api";
import { Storage } from "../../lib/storage";
import { clearPersistedQueryCache } from "../../lib/query-persistence";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, tokens } = useTheme();
  const { user, isAuthenticated, hasActivePass, logout } = useAuth();
  const { selectedGoal, openGoalModal } = useGoal();

  const profileQuery = useQuery({
    queryKey: ["profile-me"],
    queryFn: async () => {
      const res = await api.getMe();
      return res.ok ? res.data : null;
    },
    enabled: isAuthenticated,
  });

  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const res = await api.getSessions();
      return res.ok ? res.data || [] : [];
    },
    enabled: isAuthenticated,
  });

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          await clearPersistedQueryCache(queryClient);
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  const handleLogoutAll = async () => {
    Alert.alert(
      "Revoke All Sessions",
      "This will sign you out of all other mobile phones, tablets, and web browsers.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke All",
          style: "destructive",
          onPress: async () => {
            await api.logoutAll().catch(() => {});
            await Storage.clearAllAuthTokens();
            await clearPersistedQueryCache(queryClient);
            router.replace("/(auth)/login" as any);
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account Permanently",
      "This will immediately sign you out, revoke all device sessions, and anonymize your personal data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.deleteMe({});
              if (!res.ok) {
                Alert.alert("Re-Authentication Required", res.error?.message || "Please re-authenticate to confirm deletion.");
                return;
              }
              await Storage.clearAllAuthTokens();
              await clearPersistedQueryCache(queryClient);
              Alert.alert("Account Deleted", "Your account and data have been anonymized.");
              router.replace("/(auth)/login" as any);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "An unexpected error occurred");
            }
          },
        },
      ]
    );
  };

  const profile = profileQuery.data;

  return (
    <AppShell testID="profile-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.userCardContent}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <User size={30} color={colors.primary} />
            </View>

            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>
                {profile?.name || user?.name || (isAuthenticated ? "Learner" : "Guest Aspirant")}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {profile?.email || user?.email || "Browsing in Guest Mode"}
              </Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={profile?.role || (isAuthenticated ? "STUDENT" : "GUEST")}
                  variant={isAuthenticated ? "primary" : "neutral"}
                  size="sm"
                />
                {hasActivePass && (
                  <Badge label="PRO PASS" variant="pass" size="sm" />
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Guest Sign In CTA */}
        {!isAuthenticated && (
          <Card
            style={[
              styles.guestCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.primary },
            ]}
          >
            <Sparkles size={20} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>
              Sign in to sync your progress
            </Text>
            <Text style={[styles.guestDesc, { color: colors.textSecondary }]}>
              Keep your test scores, course bookmarks, and exam analytics safe across all your devices.
            </Text>
            <Button
              title="Sign In / Register"
              variant="primary"
              size="md"
              style={{ width: "100%", marginTop: 12 }}
              onPress={() => router.push("/(auth)/login" as any)}
            />
          </Card>
        )}

        {/* Account Shortcuts */}
        <View style={styles.shortcutsSection}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            My Learning & Exams
          </Text>

          <Card style={styles.menuCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/my-tests" as any)}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuItemLeft}>
                <Award size={18} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                  My Test Attempts & CBT History
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/my-learning" as any)}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuItemLeft}>
                <BookOpen size={18} color="#10b981" />
                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                  My Batches & Course Progress
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/subscription" as any)}
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.menuItemLeft}>
                <Crown size={18} color="#f59e0b" />
                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                  Pass & Subscription Tier
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/settings" as any)}
              style={styles.menuItem}
            >
              <View style={styles.menuItemLeft}>
                <Settings size={18} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
                  Settings & Appearance
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Active Sessions (When Authenticated) */}
        {isAuthenticated && (
          <View style={styles.sessionsSection}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
              Active Device Sessions
            </Text>

            <Card style={styles.sessionCard}>
              <View style={styles.sessionTitleRow}>
                <Smartphone size={16} color={colors.primary} />
                <Text style={[styles.sessionSub, { color: colors.textSecondary }]}>
                  Logged in devices
                </Text>
              </View>

              {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
                sessionsQuery.data.map((s) => (
                  <View key={s.id} style={[styles.sessionRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
                        {s.deviceName || "Mobile Phone"} {s.isCurrent ? "(This Device)" : ""}
                      </Text>
                      <Text style={[styles.deviceMeta, { color: colors.textMuted }]}>
                        {s.platform} • Active: {new Date(s.lastUsedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {!s.isCurrent && (
                      <TouchableOpacity
                        onPress={async () => {
                          await api.revokeSession(s.id);
                          sessionsQuery.refetch();
                        }}
                      >
                        <Text style={[styles.revokeText, { color: colors.danger }]}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={[styles.deviceMeta, { color: colors.textMuted, marginVertical: 8 }]}>
                  1 active session
                </Text>
              )}

              <TouchableOpacity
                onPress={handleLogoutAll}
                activeOpacity={0.7}
                style={[styles.revokeAllBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.revokeAllText, { color: colors.textPrimary }]}>
                  Sign out of all other devices
                </Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Sign Out & Delete Account Actions */}
        {isAuthenticated && (
          <View style={styles.dangerSection}>
            <Button
              title="Sign Out"
              variant="secondary"
              size="md"
              style={{ width: "100%", marginBottom: 12 }}
              onPress={handleLogout}
              icon={<LogOut size={16} color={colors.textPrimary} />}
            />

            <TouchableOpacity
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              style={styles.deleteBtn}
            >
              <Trash2 size={14} color={colors.danger} />
              <Text style={[styles.deleteBtnText, { color: colors.danger }]}>
                Permanently Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    padding: 16,
    marginBottom: 16,
  },
  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  guestCard: {
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  guestTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  guestDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  shortcutsSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuCard: {
    padding: 0,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sessionsSection: {
    marginBottom: 24,
  },
  sessionCard: {
    padding: 16,
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sessionSub: {
    fontSize: 13,
    fontWeight: "600",
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "600",
  },
  deviceMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  revokeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  revokeAllBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  revokeAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dangerSection: {
    alignItems: "center",
    marginTop: 8,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
