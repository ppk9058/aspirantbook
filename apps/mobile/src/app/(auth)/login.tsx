import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, AlertCircle } from "lucide-react-native";
import { Button } from "../../components/primitives/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { Storage } from "../../lib/storage";
import { registerForPushNotificationsAsync } from "../../lib/push";

export default function LoginScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        email: email.trim(),
        password,
        platform: "android",
        deviceName: "Mobile App",
      });

      if (!res.ok || !res.data) {
        setErrorMessage(
          res.error?.message || "Invalid email or password. Please try again."
        );
        return;
      }

      await Storage.setAccessToken(res.data.tokens.accessToken);
      await Storage.setRefreshToken(res.data.tokens.refreshToken);
      await Storage.setUser(res.data.user);

      registerForPushNotificationsAsync().catch(() => {});
      router.replace("/(tabs)/home");
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
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.brandBadgeText, { color: colors.primary }]}>
              TrillionSkill
            </Text>
          </View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
            Sign In
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Welcome back! Enter your details to continue your mock tests and courses.
          </Text>
        </View>

        {/* Login Form Card */}
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
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#ef4444" style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Email Address
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
              <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.textInput, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Password
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>
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
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.textInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <Button
            title={loading ? "Signing In..." : "Sign In"}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleLogin}
            style={styles.submitBtn}
          />

          {/* Register Link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              Don't have an account?{" "}
              <Text style={[styles.registerHighlight, { color: colors.primary }]}>
                Create Account
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Continue as Guest */}
        <TouchableOpacity
          style={styles.guestLink}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <Text style={[styles.guestText, { color: colors.textMuted }]}>
            Continue as Guest Learner →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    justifyContent: "center",
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  brandBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  eyeIcon: {
    padding: 4,
  },
  submitBtn: {
    width: "100%",
    marginTop: 8,
    marginBottom: 14,
  },
  registerLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  registerText: {
    fontSize: 13,
  },
  registerHighlight: {
    fontWeight: "700",
  },
  guestLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  guestText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    flex: 1,
  },
});
