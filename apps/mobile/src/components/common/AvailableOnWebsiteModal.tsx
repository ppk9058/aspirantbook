import React, { useState } from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity } from "react-native";
import { Globe, X } from "lucide-react-native";
import { Button } from "./Button";
import { COLORS } from "@/lib/theme";
import { openWebUrl } from "@/lib/web-links";

interface AvailableOnWebsiteModalProps {
  visible: boolean;
  onClose: () => void;
  itemTitle?: string;
  title?: string;
  webUrl?: string;
  reason?: string;
}

export function AvailableOnWebsiteModal({
  visible,
  onClose,
  itemTitle,
  title,
  webUrl,
  reason,
}: AvailableOnWebsiteModalProps) {
  const displayTitle = itemTitle || title || "Item";
  const [browserError, setBrowserError] = useState<string | null>(null);

  const handleOpenWebsite = async () => {
    setBrowserError(null);
    const target = webUrl || "/";
    const res = await openWebUrl(target, "website_modal");
    if (!res.success && res.error) {
      setBrowserError(res.error);
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Globe size={32} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Available on Web</Text>
          <Text style={styles.description}>
            {reason ||
              `"${displayTitle}" provides an optimal learning experience on a larger screen and is available directly on our website.`}
          </Text>

          {browserError && (
            <Text style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
              {browserError}
            </Text>
          )}

          <View style={styles.actions}>
            <Button
              title="Open Website"
              onPress={handleOpenWebsite}
              variant="primary"
            />
            <Button
              title="Maybe Later"
              onPress={onClose}
              variant="outline"
              style={styles.cancelBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 4,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    width: "100%",
    gap: 8,
  },
  cancelBtn: {
    marginTop: 4,
  },
});
