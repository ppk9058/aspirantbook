import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity } from "react-native";
import { Bell, ArrowLeft, BookOpen, Clock, Flame, ShieldAlert } from "lucide-react-native";
import { useRouter } from "expo-router";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../components/primitives/Card";
import { useTheme } from "../../theme/ThemeProvider";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  registerForPushNotificationsAsync,
  NotificationPreferences,
  getLastPushRegistrationError,
} from "../../lib/push";

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    pushEnabled: true,
    examReminders: true,
    courseUpdates: true,
    dailyStreak: true,
  });
  const [infoNote, setInfoNote] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getNotificationPreferences().then((saved) => {
      if (mounted) setPrefs(saved);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await saveNotificationPreferences(updated);

    if (key === "pushEnabled" && value) {
      // User turned notifications ON contextually
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        const err = getLastPushRegistrationError();
        setInfoNote(err || "Push notifications require device permission or development build.");
      } else {
        setInfoNote("Push notifications registered successfully.");
      }
    }
  };

  return (
    <AppShell testID="notification-preferences-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="notifications-back-button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>
            Notification Settings
          </Text>
        </View>

        {/* Info or Notice Box */}
        {infoNote ? (
          <View style={styles.infoBox} testID="notification-info-box">
            <ShieldAlert size={16} color="#b45309" />
            <Text style={styles.infoText}>{infoNote}</Text>
          </View>
        ) : null}

        {/* Master Switch */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Bell size={20} color={colors.primary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Allow Notifications
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Receive alerts, test series updates, and study reminders
              </Text>
            </View>
            <Switch
              testID="toggle-master-push"
              value={prefs.pushEnabled}
              onValueChange={(val) => handleToggle("pushEnabled", val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>

        {/* Granular Subscription Toggles */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          PREFERENCES
        </Text>

        <Card style={styles.card}>
          {/* Exam Reminders */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Clock size={18} color="#0284c7" />
            </View>
            <View style={styles.textGroup}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Live Test Reminders
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Notifications 30 minutes before all-India live mock exams
              </Text>
            </View>
            <Switch
              testID="toggle-exam-reminders"
              disabled={!prefs.pushEnabled}
              value={prefs.examReminders && prefs.pushEnabled}
              onValueChange={(val) => handleToggle("examReminders", val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Course Content Updates */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <BookOpen size={18} color="#16a34a" />
            </View>
            <View style={styles.textGroup}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Course Curriculum Updates
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Alerts when new video lessons, chapters or notes are added
              </Text>
            </View>
            <Switch
              testID="toggle-course-updates"
              disabled={!prefs.pushEnabled}
              value={prefs.courseUpdates && prefs.pushEnabled}
              onValueChange={(val) => handleToggle("courseUpdates", val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Daily Streak */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Flame size={18} color="#ea580c" />
            </View>
            <View style={styles.textGroup}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Daily Streak & Goal Reminders
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Gentle evening nudges to maintain study consistency
              </Text>
            </View>
            <Switch
              testID="toggle-daily-streak"
              disabled={!prefs.pushEnabled}
              value={prefs.dailyStreak && prefs.pushEnabled}
              onValueChange={(val) => handleToggle("dailyStreak", val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>
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
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(150, 150, 150, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: "#92400e",
    flex: 1,
    lineHeight: 16,
  },
});
