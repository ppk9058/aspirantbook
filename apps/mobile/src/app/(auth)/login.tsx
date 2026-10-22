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
import { Mail, Lock, Phone, Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, KeyRound, MessageSquare } from "lucide-react-native";
import { Button } from "../../components/primitives/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { Storage } from "../../lib/storage";
import { registerForPushNotificationsAsync } from "../../lib/push";

export default function LoginScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();

  // Mode: password vs OTP
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // Email / Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone / OTP state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePasswordLogin = async () => {
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

  const handleRequestOtp = async () => {
    setErrorMessage(null);
    setOtpNotice(null);
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      setErrorMessage("Please enter your mobile phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.requestOtp({ phoneNumber: cleanPhone });
      if (!res.ok) {
        setErrorMessage(res.error?.message || "Failed to request OTP. Please try again.");
        return;
      }

      setOtpSent(true);
      if (res.data?.devBypass || res.data?.message?.includes("code")) {
        setOtpNotice(res.data.message);
      }
    } catch {
      setErrorMessage("Network error requesting verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (!otp.trim()) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp({
        phoneNumber: phoneNumber.trim(),
        otp: otp.trim(),
      });

      if (!res.ok || !res.data) {
        setErrorMessage(res.error?.message || "Invalid or expired verification code.");
        return;
      }

      await Storage.setAccessToken(res.data.tokens.accessToken);
      await Storage.setRefreshToken(res.data.tokens.refreshToken);
      await Storage.setUser(res.data.user);

      registerForPushNotificationsAsync().catch(() => {});
      router.replace("/(tabs)/home");
    } catch {
      setErrorMessage("Network connection error verifying OTP.");
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

        {/* Tab Toggle: Email/Password vs Phone OTP */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAuthMode("password");
              setErrorMessage(null);
            }}
            style={[
              styles.toggleTab,
              authMode === "password" && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Mail size={16} color={authMode === "password" ? colors.primary : colors.textMuted} />
            <Text style={[styles.toggleTabText, { color: authMode === "password" ? colors.textPrimary : colors.textMuted }]}>
              Email & Password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setAuthMode("otp");
              setErrorMessage(null);
            }}
            style={[
              styles.toggleTab,
              authMode === "otp" && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Phone size={16} color={authMode === "otp" ? colors.primary : colors.textMuted} />
            <Text style={[styles.toggleTabText, { color: authMode === "otp" ? colors.textPrimary : colors.textMuted }]}>
              Phone (OTP)
            </Text>
          </TouchableOpacity>
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

          {/* OTP Dev Hint Notice */}
          {otpNotice ? (
            <View style={styles.noticeBanner}>
              <MessageSquare size={16} color="#0284c7" style={styles.errorIcon} />
              <Text style={styles.noticeText}>{otpNotice}</Text>
            </View>
          ) : null}

          {authMode === "password" ? (
            <>
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
                testID="login-submit-btn"
                onPress={handlePasswordLogin}
                style={styles.submitBtn}
              />
            </>
          ) : (
            <>
              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Mobile Number
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
                  <Phone size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="+91 9876543210"
                    placeholderTextColor={colors.textMuted}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    editable={!otpSent}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                  {otpSent && (
                    <TouchableOpacity
                      onPress={() => {
                        setOtpSent(false);
                        setOtp("");
                        setOtpNotice(null);
                      }}
                    >
                      <Text style={[styles.forgotText, { color: colors.primary }]}>Change</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* OTP Input (Shown after OTP requested) */}
              {otpSent && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Verification Code
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
                    <KeyRound size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      placeholder="6-digit code"
                      placeholderTextColor={colors.textMuted}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.textInput, { color: colors.textPrimary, letterSpacing: 4 }]}
                    />
                  </View>
                </View>
              )}

              {/* OTP Submit Button */}
              <Button
                title={
                  loading
                    ? "Please wait..."
                    : otpSent
                    ? "Verify & Sign In"
                    : "Send Verification Code"
                }
                variant="primary"
                size="lg"
                loading={loading}
                onPress={otpSent ? handleVerifyOtp : handleRequestOtp}
                style={styles.submitBtn}
              />
            </>
          )}

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
            Explore as Guest
          </Text>
          <ArrowRight size={16} color={colors.textMuted} />
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
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
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  toggleTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  formCard: {
    padding: 20,
    borderWidth: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 132, 199, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  noticeText: {
    color: "#0369a1",
    fontSize: 13,
    flex: 1,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "600",
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
  submitBtn: {
    marginTop: 8,
    marginBottom: 16,
  },
  registerLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  registerText: {
    fontSize: 14,
  },
  registerHighlight: {
    fontWeight: "700",
  },
  guestLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 6,
  },
  guestText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
