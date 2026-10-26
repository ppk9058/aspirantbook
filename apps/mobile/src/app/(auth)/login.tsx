import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { api } from "@/lib/api";
import { Storage } from "@/lib/storage";
import { registerForPushNotificationsAsync } from "@/lib/push";
import { COLORS } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(false);

  useEffect(() => {
    api.getConfig().then((res) => {
      if (res.ok && res.data) {
        setGoogleEnabled(res.data.googleAuthEnabled);
        setOtpEnabled(res.data.otpAuthEnabled);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
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
        Alert.alert(
          "Sign In Failed",
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
      Alert.alert("Error", "Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>AspirantBook</Text>
          <Text style={styles.brandSubtitle}>
            Welcome back! Sign in to access your test series and tutorials.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />

          {googleEnabled && (
            <Button
              title="Sign In with Google"
              onPress={() => Alert.alert("Google Sign-In", "Google Sign-In initialized")}
              variant="outline"
              style={styles.altBtn}
            />
          )}

          {otpEnabled && (
            <Button
              title="Sign In with Mobile OTP"
              onPress={() => Alert.alert("Mobile OTP", "OTP Sign-In initialized")}
              variant="secondary"
              style={styles.altBtn}
            />
          )}

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.registerText}>
              Don't have an account?{" "}
              <Text style={styles.registerHighlight}>Create Account</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestLink}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  loginBtn: {
    marginBottom: 12,
  },
  altBtn: {
    marginBottom: 12,
  },
  registerLink: {
    marginTop: 16,
    alignItems: "center",
  },
  registerText: {
    fontSize: 13,
    color: "#64748B",
  },
  registerHighlight: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  guestLink: {
    marginTop: 18,
    alignItems: "center",
    padding: 8,
  },
  guestText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
