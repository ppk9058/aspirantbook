import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { COLORS } from "@/lib/theme";

interface AuthwallGateProps {
  isLocked?: boolean;
  totalBlocks?: number;
  previewBlocks?: number;
  totalCount?: number;
  previewCount?: number;
  title?: string;
  gateTitle?: string | null;
  gateSubtitle?: string | null;
  onUnlock?: () => void;
  children?: React.ReactNode;
}

export function AuthwallGate({
  isLocked = true,
  totalBlocks,
  previewBlocks,
  totalCount,
  previewCount,
  title,
  gateTitle,
  gateSubtitle,
  onUnlock,
  children,
}: AuthwallGateProps) {
  const router = useRouter();

  if (!isLocked) {
    return <>{children}</>;
  }

  const total = totalBlocks ?? totalCount ?? 0;
  const preview = previewBlocks ?? previewCount ?? 0;
  const remaining = Math.max(0, total - preview);

  return (
    <View style={styles.container}>
      {/* 1. Allowed Preview Content */}
      {children}

      {/* 2. Dummy Blurred Placeholder (Zero sensitive data inside) */}
      <View style={styles.blurredPlaceholder} pointerEvents="none">
        <View style={styles.placeholderLineLarge} />
        <View style={styles.placeholderLineMedium} />
        <View style={styles.placeholderLineSmall} />
        <View style={styles.placeholderLineMedium} />
      </View>

      {/* 3. Non-blocking Unlock CTA Card */}
      <Card style={styles.ctaCard}>
        <View style={styles.iconCircle}>
          <Lock size={22} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>
          {gateTitle || "Sign in to Unlock Complete Lesson"}
        </Text>
        <Text style={styles.subtitle}>
          {gateSubtitle ||
            `You are viewing a free ${previewBlocks}-block preview. Sign in to access all ${totalBlocks} sections.`}
        </Text>
        <Button
          title="Sign In with AspirantBook"
          onPress={() => router.push("/(auth)/login")}
          style={styles.btn}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  blurredPlaceholder: {
    marginTop: 16,
    padding: 16,
    opacity: 0.15,
  },
  placeholderLineLarge: {
    height: 18,
    width: "90%",
    backgroundColor: "#0F172A",
    borderRadius: 6,
    marginBottom: 10,
  },
  placeholderLineMedium: {
    height: 14,
    width: "75%",
    backgroundColor: "#0F172A",
    borderRadius: 6,
    marginBottom: 10,
  },
  placeholderLineSmall: {
    height: 14,
    width: "50%",
    backgroundColor: "#0F172A",
    borderRadius: 6,
    marginBottom: 10,
  },
  ctaCard: {
    alignItems: "center",
    padding: 24,
    marginTop: -40,
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  btn: {
    width: "100%",
  },
});
