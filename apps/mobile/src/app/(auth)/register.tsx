import React, { useState } from "react";
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
import { CheckSquare, Square } from "lucide-react-native";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { api } from "@/lib/api";
import { Storage } from "@/lib/storage";
import { registerForPushNotificationsAsync } from "@/lib/push";
import { COLORS } from "@/lib/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("UPSC");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    if (!consent) {
      Alert.alert(
        "Consent Required",
        "You must confirm you are 13+ and agree to our Terms and Privacy Policy."
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
        selectedGoal: goal,
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
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>Create Account</Text>
          <Text style={styles.brandSubtitle}>
            Join thousands of serious aspirants preparing with AspirantBook.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name *"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Email Address *"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <Input
            label="Phone Number (Optional)"
            placeholder="+91 98765 43210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Input
            label="Password (min 8 chars) *"
            placeholder="Create a strong password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          {/* 13+ Consent Checkbox */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsent(!consent)}
            activeOpacity={0.8}
            accessibilityLabel="Consent checkbox"
          >
            {consent ? (
              <CheckSquare size={20} color={COLORS.accent} />
            ) : (
              <Square size={20} color="#94A3B8" />
            )}
            <Text style={styles.consentText}>
              I am 13+ and agree to the{" "}
              <Text style={styles.linkText}>Terms</Text> and{" "}
              <Text style={styles.linkText}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          <Button
            title="Create Free Account"
            onPress={handleRegister}
            loading={loading}
            disabled={!consent}
            variant="accent"
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginHighlight}>Sign In</Text>
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
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    padding: 24,
  },
  header: {
    marginTop: 10,
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  consentText: {
    fontSize: 12,
    color: "#475569",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  submitBtn: {
    marginBottom: 16,
  },
  loginLink: {
    alignItems: "center",
    padding: 6,
  },
  loginText: {
    fontSize: 13,
    color: "#64748B",
  },
  loginHighlight: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
