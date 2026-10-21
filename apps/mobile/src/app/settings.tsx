import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { User, Moon, Shield, Target, ChevronRight, LogOut } from "lucide-react-native";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Chip } from "../components/primitives/Chip";
import { Button } from "../components/primitives/Button";
import { useTheme } from "../theme/ThemeProvider";
import { useGoal } from "../context/GoalContext";
import { useAuth } from "../context/AuthContext";

type SettingsTab = "goal" | "profile" | "appearance" | "security";

export default function SettingsScreen() {
  const { colors, tokens, isDark, toggleTheme } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const { user, isAuthenticated, logout } = useAuth();
  const [tab, setTab] = useState<SettingsTab>("goal");

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

        {/* Tab Switcher */}
        <View style={styles.chipRow}>
          <Chip
            label="Target Goal"
            selected={tab === "goal"}
            onPress={() => setTab("goal")}
          />
          <Chip
            label="Appearance"
            selected={tab === "appearance"}
            onPress={() => setTab("appearance")}
          />
          <Chip
            label="Profile"
            selected={tab === "profile"}
            onPress={() => setTab("profile")}
          />
          <Chip
            label="Security"
            selected={tab === "security"}
            onPress={() => setTab("security")}
          />
        </View>

        {/* Tab 1: Goal */}
        {tab === "goal" && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Target size={20} color={colors.primary} />
                <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                  Current Target Goal
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={openGoalModal}
              style={[
                styles.goalSelectorBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View>
                <Text style={[styles.goalSelectedName, { color: colors.primary }]}>
                  {selectedGoal.name}
                </Text>
                <Text style={[styles.goalSelectedFull, { color: colors.textSecondary }]}>
                  {selectedGoal.fullName}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.helpText, { color: colors.textMuted }]}>
              Your target goal tailors recommended mock tests, practice papers, and syllabus updates.
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
              <Button
                title="Log out of this device"
                onPress={logout}
                variant="danger"
                size="md"
                icon={<LogOut size={16} color="#FFFFFF" />}
              />
            ) : (
              <Text style={[styles.helpText, { color: colors.textMuted }]}>
                Sign in to manage password and authenticated sessions.
              </Text>
            )}
          </Card>
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },
  goalSelectorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  goalSelectedName: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  goalSelectedFull: {
    fontSize: 12,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
  },
  profileFields: {
    marginTop: 4,
  },
  fieldRow: {
    marginVertical: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});
