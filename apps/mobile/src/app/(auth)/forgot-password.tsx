import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/components/common/Header";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { api } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your account email address.");
      return;
    }

    setLoading(true);
    try {
      await fetch(`${api.getConfig ? "http://10.0.2.2:3045" : ""}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Reset Password" showBack />
      <View style={styles.content}>
        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Check Your Inbox</Text>
            <Text style={styles.successDesc}>
              If an account is associated with {email}, a secure password reset link has been dispatched.
            </Text>
            <Button
              title="Back to Sign In"
              onPress={() => router.replace("/(auth)/login")}
              style={styles.backBtn}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.desc}>
              Enter your registered email address below. We'll send you instructions to safely reset your password.
            </Text>
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Button
              title="Send Reset Instructions"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  desc: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  submitBtn: {
    marginTop: 8,
  },
  successBox: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  backBtn: {
    width: "100%",
  },
});
