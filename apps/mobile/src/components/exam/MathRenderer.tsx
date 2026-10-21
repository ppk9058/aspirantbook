import React, { useMemo } from "react";
import { Text, TextStyle, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import {
  parseMathSegments,
  parseLatexToUnicode,
  isComplexMath,
  MathSegment,
} from "../../lib/latex-parser";

interface MathRendererProps {
  text: string;
  style?: TextStyle;
  fontSize?: number;
}

export function MathRenderer({ text, style, fontSize }: MathRendererProps) {
  const { colors, isDark } = useTheme();

  const segments = useMemo(() => {
    return parseMathSegments(text || "");
  }, [text]);

  if (!text) return null;

  return (
    <Text
      style={[
        {
          color: colors.textPrimary,
          fontSize: fontSize || 16,
          lineHeight: (fontSize || 16) * 1.5,
        },
        style,
      ]}
    >
      {segments.map((seg, index) => {
        if (!seg.content) return null;

        if (!seg.isMath) {
          return <Text key={index}>{seg.content}</Text>;
        }

        const isComplex = isComplexMath(seg.raw);
        const parsed = parseLatexToUnicode(seg.raw);

        // Fallback to monospace styling for complex environments or unparseable raw math
        const isFallback = isComplex || parsed.includes("\\");

        if (seg.isDisplay) {
          return (
            <Text
              key={index}
              style={[
                styles.displayMathText,
                {
                  color: isFallback ? colors.textPrimary : colors.primary,
                  fontFamily: isFallback ? "monospace" : undefined,
                  backgroundColor: isFallback
                    ? isDark
                      ? "#1e293b"
                      : "#f1f5f9"
                    : "transparent",
                },
              ]}
            >
              {`\n  ${parsed}  \n`}
            </Text>
          );
        }

        return (
          <Text
            key={index}
            style={[
              styles.inlineMathText,
              {
                color: isFallback ? colors.textPrimary : colors.primary,
                fontFamily: isFallback ? "monospace" : undefined,
                backgroundColor: isFallback
                  ? isDark
                    ? "#1e293b"
                    : "#f1f5f9"
                  : "transparent",
              },
            ]}
          >
            {` ${parsed} `}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  inlineMathText: {
    fontStyle: "italic",
    fontWeight: "600",
  },
  displayMathText: {
    fontStyle: "normal",
    fontWeight: "600",
    textAlign: "center",
  },
});
