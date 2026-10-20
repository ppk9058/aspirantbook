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
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  User,
  Smartphone,
  LogOut,
  Shield,
  ExternalLink,
  Trash2,
} from "lucide-react-native";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { api } from "@/lib/api";
import { Storage } from "@/lib/storage";
import { clearPersistedQueryCache } from "@/lib/query-persistence";
import { COLORS } from "@/lib/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile-me"],
    queryFn: async () => {
      const res = await api.getMe();
      return res.ok ? res.data : null;
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const res = await api.getSessions();
      return res.ok ? res.data || [] : [];
    },
    enabled: Boolean(profileQuery.data?.id),
  });

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const refreshToken = await Storage.getRefreshToken();
          if (refreshToken) {
            await api.logout(refreshToken).catch(() => {});
          }
          await Storage.clearAllAuthTokens();
          await clearPersistedQueryCache(queryClient);
          router.replace("/(auth)/login");
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
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  const isGuest = !profileQuery.data?.id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <User size={32} color={COLORS.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {profileQuery.data?.name || "Guest Aspirant"}
            </Text>
            <Text style={styles.userEmail}>
              {profileQuery.data?.email || "Browsing in Guest Mode"}
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.roleBadge}>
                {profileQuery.data?.role || "GUEST"}
              </Text>
              {profileQuery.data?.goal ? (
                <Text style={styles.goalBadge}>{profileQuery.data.goal}</Text>
              ) : null}
            </View>
          </View>
        </Card>

        {isGuest ? (
          <Card style={styles.guestActionCard}>
            <Text style={styles.guestPromptTitle}>
              Sign in to save progress & sync devices
            </Text>
            <Button
              title="Sign In / Register"
              onPress={() => router.push("/(auth)/login")}
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : (
          <>
            {/* Active Sessions Card */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Smartphone size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Active Devices & Sessions</Text>
              </View>

              {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
                sessionsQuery.data.map((s) => (
                  <View key={s.id} style={styles.sessionItem}>
                    <View style={styles.sessionDetails}>
                      <Text style={styles.deviceName}>
                        {s.deviceName || "Mobile Device"} {s.isCurrent ? "(This device)" : ""}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        Platform: {s.platform} • Active:{" "}
                        {new Date(s.lastUsedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {!s.isCurrent && (
                      <TouchableOpacity
                        style={styles.revokeBtn}
                        onPress={async () => {
                          await api.revokeSession(s.id);
                          sessionsQuery.refetch();
                        }}
                      >
                        <Text style={styles.revokeText}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptySessionText}>1 active device</Text>
              )}

              <TouchableOpacity
                style={styles.revokeAllBtn}
                onPress={handleLogoutAll}
              >
                <Text style={styles.revokeAllText}>
                  Revoke all other device sessions
                </Text>
              </TouchableOpacity>
            </Card>

            {/* Logout Buttons */}
            <View style={styles.buttonGroup}>
              <Button
                title="Sign Out"
                variant="outline"
                onPress={handleLogout}
                style={{ marginBottom: 12 }}
              />
            </View>
          </>
        )}

        {/* Legal & Compliance Section */}
        <Card style={styles.legalCard}>
          <Text style={styles.legalHeading}>ABOUT & LEGAL</Text>

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => WebBrowser.openBrowserAsync("https://aspirantbook.com/privacy")}
          >
            <Shield size={16} color="#64748B" />
            <Text style={styles.legalLink}>Privacy Policy</Text>
            <ExternalLink size={14} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.legalRow}
            onPress={() => WebBrowser.openBrowserAsync("https://aspirantbook.com/terms")}
          >
            <Shield size={16} color="#64748B" />
            <Text style={styles.legalLink}>Terms of Service</Text>
            <ExternalLink size={14} color="#94A3B8" />
          </TouchableOpacity>

          {!isGuest && (
            <TouchableOpacity
              style={[styles.legalRow, { borderBottomWidth: 0 }]}
              onPress={() =>
                WebBrowser.openBrowserAsync("https://aspirantbook.com/settings")
              }
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={[styles.legalLink, { color: "#EF4444" }]}>
                Delete Account & Data (Web Portal)
              </Text>
              <ExternalLink size={14} color="#EF4444" />
            </TouchableOpacity>
          )}
        </Card>

        <Text style={styles.versionText}>AspirantBook Mobile v1.0.0 (SDK 52)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  scroll: {
    padding: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  userEmail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  goalBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  guestActionCard: {
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  guestPromptTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 8,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sessionDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  sessionMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  revokeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  revokeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF4444",
  },
  emptySessionText: {
    fontSize: 12,
    color: "#94A3B8",
    paddingVertical: 8,
  },
  revokeAllBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 6,
  },
  revokeAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  buttonGroup: {
    marginBottom: 16,
  },
  legalCard: {
    padding: 16,
    marginBottom: 24,
  },
  legalHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  legalLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    marginLeft: 10,
  },
  versionText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
});
