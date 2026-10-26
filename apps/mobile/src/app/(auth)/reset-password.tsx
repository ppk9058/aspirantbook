import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react-native";
import { Button } from "../../components/primitives/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { colors, tokens } = useTheme();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Simple password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: "", score: 0, color: "#94a3b8" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: "Weak", score: 1, color: "#ef4444" };
    if (score <= 3) return { label: "Medium", score: 2, color: "#f59e0b" };
    return { label: "Strong", score: 3, color: "#10b981" };
  };

  const strength = getPasswordStrength(password);

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!token) {
      setErrorMessage("Missing reset token. Please request a new password reset link.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        token,
        password,
      });

      if (!res.ok) {
        setErrorMessage(res.error?.message || "Failed to reset password. The link may be expired.");
        return;
      }

      setSuccessMessage("Your password has been reset successfully! You can now sign in with your new password.");
    } catch {
      setErrorMessage("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.brandBadgeText, { color: colors.primary }]}>
              TrillionSkill
            </Text>
          </View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
            Reset Password
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Enter your new secure password to restore access to your account.
          </Text>
        </View>

        {/* Missing Token Banner */}
        {!token && (
          <View style={styles.warningCard}>
            <AlertCircle size={20} color="#dc2626" />
            <Text style={styles.warningCardText}>
              No password reset token detected. Please open the link received in your email or request a new one.
            </Text>
            <Button
              title="Request Reset Link"
              onPress={() => router.push("/(auth)/forgot-password")}
              variant="outline"
              size="sm"
            />
          </View>
        )}

        {/* Reset Form Card */}
        {token && !successMessage && (
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: tokens.radius.xl,
              },
            ]}
          >
            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#dc2626" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* New Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                New Password
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: tokens.radius.md,
                  },
                ]}
              >
                <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textMuted} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Password Strength Meter */}
              {Boolean(password) && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBars}>
                    <View
                      style={[
                        styles.strengthBar,
                        { backgroundColor: strength.score >= 1 ? strength.color : colors.border },
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        { backgroundColor: strength.score >= 2 ? strength.color : colors.border },
                      ]}
                    />
                    <View
                      style={[
                        styles.strengthBar,
                        { backgroundColor: strength.score >= 3 ? strength.color : colors.border },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Confirm New Password
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: tokens.radius.md,
                  },
                ]}
              >
                <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="Re-enter your new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Submit Button */}
            <Button
              title="Update Password"
              testID="reset-submit-btn"
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </View>
        )}

        {/* Success Card */}
        {successMessage && (
          <View
            style={[
              styles.successCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: tokens.radius.xl,
              },
            ]}
          >
            <CheckCircle2 size={44} color="#10b981" />
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              Password Updated
            </Text>
            <Text style={[styles.successBody, { color: colors.textSecondary }]}>
              {successMessage}
            </Text>
            <Button
              title="Sign In Now"
              onPress={() => router.replace("/(auth)/login")}
              size="lg"
              style={styles.submitBtn}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topNav: {
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginTop: 8,
    marginBottom: 24,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    marginBottom: 12,
    gap: 6,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    padding: 20,
    borderWidth: 1,
  },
  warningCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    alignItems: "center",
    gap: 12,
  },
  warningCardText: {
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  eyeIcon: {
    padding: 6,
  },
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
    marginRight: 12,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  submitBtn: {
    marginTop: 8,
  },
  successCard: {
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  successBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
});
