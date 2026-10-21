import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeightPercent?: number;
  scrollable?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightPercent = 85,
  scrollable = true,
  style,
  testID,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View
            style={[
              styles.backdrop,
              { backgroundColor: colors.drawerBackdrop },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet Content Panel */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: tokens.radius["2xl"],
              borderTopRightRadius: tokens.radius["2xl"],
              borderTopWidth: 1,
              borderColor: colors.border,
              paddingBottom: Math.max(tokens.spacing.lg, insets.bottom),
              maxHeight: `${maxHeightPercent}%`,
            },
            style,
          ]}
        >
          {/* Top Drag Indicator Pill */}
          <View style={styles.indicatorContainer}>
            <View
              style={[
                styles.indicator,
                { backgroundColor: colors.border },
              ]}
            />
          </View>

          {/* Header */}
          {title ? (
            <View
              style={[
                styles.header,
                { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  { color: colors.textPrimary },
                ]}
              >
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                accessibilityLabel="Close sheet"
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Body */}
          {scrollable ? (
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.bodyContent}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  indicatorContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  indicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: 16,
  },
});
