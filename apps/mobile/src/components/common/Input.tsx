import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { COLORS } from "@/lib/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.errorBorder : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={18} color="#64748B" />
            ) : (
              <Eye size={18} color="#64748B" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  errorBorder: {
    borderColor: "#EF4444",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 4,
  },
});
