import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { User, Moon, Shield, Target, ChevronRight, LogOut, AlertTriangle, X } from "lucide-react-native";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Chip } from "../components/primitives/Chip";
import { Button } from "../components/primitives/Button";
import { useTheme } from "../theme/ThemeProvider";
import { useGoal } from "../context/GoalContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Storage } from "../lib/storage";
import { clearAllCachedPdfs } from "../lib/pdf-manager";

type SettingsTab = "goal" | "profile" | "appearance" | "security";

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, tokens, isDark, toggleTheme } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const { user, isAuthenticated, logout } = useAuth();
  const [tab, setTab] = useState<SettingsTab>("goal");
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);

  // Deletion modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      setDeleteError("Please type DELETE to confirm account deletion.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.deleteMe({
        confirmation: deleteConfirmText.trim(),
        password: deletePassword.trim() || undefined,
      });

      if (!res.ok) {
        setDeleteError(res.error?.message || "Failed to delete account. Please verify your credentials.");
        return;
      }

      // Successful deletion: wipe storage and local session, redirect to guest
      await Storage.clearAllAuthTokens();
      await clearAllCachedPdfs();
      await logout();
      setDeleteModalVisible(false);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setDeleteError(err?.message || "An unexpected error occurred during account deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell testID="settings-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Account Settings
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Customize your exam goal, profile, appearance, and security
          </Text>
        </View>

        {/* Tab Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          <Chip
            label="Exam Goal"
            selected={tab === "goal"}
            onPress={() => setTab("goal")}
            testID="settings-tab-goal"
          />
          <Chip
            label="Appearance"
            selected={tab === "appearance"}
            onPress={() => setTab("appearance")}
            testID="settings-tab-appearance"
          />
          <Chip
            label="Profile"
            selected={tab === "profile"}
            onPress={() => setTab("profile")}
            testID="settings-tab-profile"
          />
          <Chip
            label="Security"
            selected={tab === "security"}
            onPress={() => setTab("security")}
            testID="settings-tab-security"
          />
        </ScrollView>

        {/* Tab 1: Goal */}
        {tab === "goal" && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderLeft}>
              <Target size={20} color={colors.primary} />
              <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                Current Target Goal
              </Text>
            </View>

            <View
              style={[
                styles.currentGoalBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.goalInfo}>
                <Text style={[styles.goalName, { color: colors.textPrimary }]}>
                  {selectedGoal.name}
                </Text>
                <Text style={[styles.goalCategory, { color: colors.textSecondary }]}>
                  {selectedGoal.category} • Category ID: {selectedGoal.id}
                </Text>
              </View>
              <Button
                title="Change Goal"
                onPress={openGoalModal}
                size="sm"
                variant="outline"
              />
            </View>

            <Text style={[styles.helpText, { color: colors.textMuted }]}>
              Switching your exam goal dynamically updates recommended tests, daily current affairs, and syllabus tracks.
            </Text>
          </Card>
        )}

        {/* Tab 2: Appearance */}
        {tab === "appearance" && (
          <Card style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Moon size={20} color={colors.textSecondary} />
                <View style={styles.settingTextGroup}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Dark Theme
                  </Text>
                  <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                    Switch between dark and light color modes
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </Card>
        )}

        {/* Tab 3: Profile */}
        {tab === "profile" && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderLeft}>
              <User size={20} color={colors.primary} />
              <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                Personal Profile
              </Text>
            </View>

            <View style={styles.profileFields}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NAME</Text>
                <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                  {user?.name || (isAuthenticated ? "Aspirant" : "Guest Learner")}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>EMAIL</Text>
                <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                  {user?.email || "Not signed in"}
                </Text>
              </View>
              {user?.phoneNumber && (
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PHONE</Text>
                  <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                    +91 {user.phoneNumber}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Tab 4: Security */}
        {tab === "security" && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderLeft}>
              <Shield size={20} color={colors.primary} />
              <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                Security & Sessions
              </Text>
            </View>

            <Text style={[styles.helpText, { color: colors.textSecondary, marginBottom: 16 }]}>
              Session versioning guarantees that all devices automatically sign out upon password changes or remote logouts.
            </Text>

            {isAuthenticated ? (
              <View style={{ gap: 12 }}>
                <Button
                  title="Log out of this device"
                  onPress={logout}
                  variant="secondary"
                  size="md"
                  icon={<LogOut size={16} color={colors.textPrimary} />}
                />

                {sessionActionError ? (
                  <View style={{ backgroundColor: "#FEE2E2", padding: 10, borderRadius: 8, marginTop: 8 }}>
                    <Text style={{ color: "#DC2626", fontSize: 13, fontWeight: "600" }}>{sessionActionError}</Text>
                  </View>
                ) : null}

                <Button
                  title="Sign out of all other devices"
                  onPress={async () => {
                    setSessionActionError(null);
                    const res = await api.logoutAll();
                    if (!res.ok) {
                      setSessionActionError(res.error?.message || "Failed to sign out of other devices. Please try again.");
                      return;
                    }
                    await logout();
                  }}
                  variant="outline"
                  size="md"
                  icon={<Shield size={16} color={colors.primary} />}
                />

                <TouchableOpacity
                  testID="settings-delete-account-button"
                  onPress={() => {
                    Alert.alert(
                      "Delete Account",
                      "Are you sure you want to delete your account? This action cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => {
                            setDeleteConfirmText("");
                            setDeletePassword("");
                            setDeleteError(null);
                            setDeleteModalVisible(true);
                          },
                        },
                      ]
                    );
                  }}
                  style={{ alignItems: "center", marginTop: 8, padding: 8 }}
                >
                  <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 13 }}>
                    Permanently Delete Account
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.helpText, { color: colors.textMuted }]}>
                Sign in to manage password and authenticated sessions.
              </Text>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Typed Confirmation Deletion Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <AlertTriangle size={20} color={colors.danger} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Delete Account
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                testID="delete-account-close-button"
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalWarningText, { color: colors.textSecondary }]}>
              This action is permanent and cannot be undone. All course enrollments, test history, bookmarks, and account data will be permanently wiped.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              To confirm, type <Text style={{ fontWeight: "700", color: colors.danger }}>DELETE</Text> below:
            </Text>
            <TextInput
              testID="delete-account-confirm-input"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={[
                styles.modalInput,
                {
                  borderColor: deleteConfirmText === "DELETE" ? colors.danger : colors.border,
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 12 }]}>
              Password (if account is password protected):
            </Text>
            <TextInput
              testID="delete-account-password-input"
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={[
                styles.modalInput,
                {
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            />

            {deleteError ? (
              <View style={styles.modalErrorBanner} testID="delete-account-error-banner">
                <Text style={styles.modalErrorText}>{deleteError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setDeleteModalVisible(false)}
                testID="delete-account-cancel-button"
                style={{ flex: 1 }}
              />
              <Button
                title={isDeleting ? "Deleting..." : "Permanently Delete"}
                variant="danger"
                size="md"
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText.trim() !== "DELETE" || isDeleting}
                testID="delete-account-confirm-button"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  tabBar: {
    gap: 8,
    paddingBottom: 16,
  },
  card: {
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  currentGoalBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 15,
    fontWeight: "700",
  },
  goalCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  profileFields: {
    gap: 12,
  },
  fieldRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalWarningText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalErrorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  modalErrorText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
});
