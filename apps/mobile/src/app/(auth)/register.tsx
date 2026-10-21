import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import {
  User,
  Mail,
  Lock,
  Phone,
  CheckSquare,
  Square,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { Button } from "../../components/primitives/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { Storage } from "../../lib/storage";
import { registerForPushNotificationsAsync } from "../../lib/push";

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing Fields", "Please fill in your name, email, and password.");
      return;
    }

    if (!consent) {
      Alert.alert(
        "Consent Required",
        "You must confirm you are 13+ and agree to the Terms of Service and Privacy Policy."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        phoneNumber: phone.trim() || undefined,
        selectedGoal: "UPSC",
        consent: true,
        platform: "android",
        deviceName: "Mobile App",
      });

      if (!res.ok || !res.data) {
        Alert.alert(
          "Registration Failed",
          res.error?.message || "Could not complete registration. Please try again."
        );
        return;
      }

      await Storage.setAccessToken(res.data.tokens.accessToken);
      await Storage.setRefreshToken(res.data.tokens.refreshToken);
      await Storage.setUser(res.data.user);

      registerForPushNotificationsAsync().catch(() => {});
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("Error", "Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openLegal = async (path: string) => {
    try {
      await WebBrowser.openBrowserAsync(`https://trillionskill.com/${path}`);
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.brandBadgeText, { color: colors.primary }]}>
              TrillionSkill
            </Text>
          </View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
            Create Account
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Join thousands of serious aspirants preparing with high-yield mock tests and video courses.
          </Text>
        </View>

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
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Full Name *
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
              <User size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="Aarav Sharma"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                style={[styles.textInput, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Email Address *
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

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Password (min 8 chars) *
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
                placeholder="Create strong password"
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

          {/* Optional Phone */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Mobile Number (Optional)
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
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={[styles.textInput, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* 13+ Consent Checkbox */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsent(!consent)}
            activeOpacity={0.8}
            accessibilityLabel="Consent checkbox"
          >
            {consent ? (
              <CheckSquare size={20} color={colors.primary} />
            ) : (
              <Square size={20} color={colors.textMuted} />
            )}
            <Text style={[styles.consentText, { color: colors.textSecondary }]}>
              I confirm I am 13+ and agree to the{" "}
              <Text
                style={[styles.linkText, { color: colors.primary }]}
                onPress={() => openLegal("terms")}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={[styles.linkText, { color: colors.primary }]}
                onPress={() => openLegal("privacy")}
              >
                Privacy Policy
              </Text>.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <Button
            title={loading ? "Creating Account..." : "Create Account"}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!consent}
            onPress={handleRegister}
            style={styles.submitBtn}
          />

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account?{" "}
              <Text style={[styles.loginHighlight, { color: colors.primary }]}>
                Sign In
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 20,
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
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 14,
    gap: 10,
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  linkText: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  submitBtn: {
    width: "100%",
    marginBottom: 14,
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  loginText: {
    fontSize: 13,
  },
  loginHighlight: {
    fontWeight: "700",
  },
});
