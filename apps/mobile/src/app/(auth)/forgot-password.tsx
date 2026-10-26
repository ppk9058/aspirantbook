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
import { Mail, ArrowLeft, CheckCircle2, Sparkles, AlertCircle } from "lucide-react-native";
import { Button } from "../../components/primitives/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage("Please enter your account email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());
      if (!res.ok && res.error?.message) {
        setErrorMessage(res.error.message);
      } else {
        setSent(true);
      }
    } catch {
      setErrorMessage("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Reset Password
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {sent ? (
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
            <CheckCircle2 size={40} color={colors.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              Check Your Inbox
            </Text>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
              If an account is associated with {email}, a secure password reset link has been dispatched.
            </Text>
            <Button
              title="Back to Sign In"
              variant="primary"
              size="md"
              style={{ width: "100%", marginTop: 16 }}
              onPress={() => router.replace("/(auth)/login")}
            />
          </View>
        ) : (
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
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#ef4444" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Text style={[styles.formDesc, { color: colors.textSecondary }]}>
              Enter your registered email address below. We'll send you instructions to safely reset your password.
            </Text>

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

            <Button
              title={loading ? "Sending..." : "Send Reset Instructions"}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              style={{ width: "100%", marginTop: 8 }}
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
  headerBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  scroll: {
    padding: 20,
    justifyContent: "center",
    flexGrow: 1,
  },
  formCard: {
    padding: 20,
    borderWidth: 1,
  },
  formDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
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
  successCard: {
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
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
