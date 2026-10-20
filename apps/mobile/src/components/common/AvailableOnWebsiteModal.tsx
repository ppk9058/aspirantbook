import React from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Globe, X } from "lucide-react-native";
import { Button } from "./Button";
import { COLORS } from "@/lib/theme";

interface AvailableOnWebsiteModalProps {
  visible: boolean;
  onClose: () => void;
  itemTitle: string;
  webUrl?: string;
}

export function AvailableOnWebsiteModal({
  visible,
  onClose,
  itemTitle,
  webUrl = "https://aspirantbook.com",
}: AvailableOnWebsiteModalProps) {
  const handleOpenWebsite = async () => {
    try {
      await WebBrowser.openBrowserAsync(webUrl);
    } catch {}
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

          <View style={styles.iconCircle}>
            <Globe size={26} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Available on our website</Text>
          <Text style={styles.subtitle}>
            "{itemTitle}" can be enrolled or purchased on the AspirantBook website. Once enrolled, it will automatically sync to your mobile library.
          </Text>

          <Button
            title="Open in Browser"
            onPress={handleOpenWebsite}
            style={styles.actionBtn}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Dismiss</Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  actionBtn: {
    width: "100%",
    marginBottom: 10,
  },
  cancelBtn: {
    padding: 8,
  },
  cancelText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
});
