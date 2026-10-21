import React from "react";
import { Text, TextStyle, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { parseLatexToUnicode } from "../../lib/latex-parser";

interface MathRendererProps {
  text: string;
  style?: TextStyle;
  fontSize?: number;
}

export function MathRenderer({ text, style, fontSize }: MathRendererProps) {
  const { colors } = useTheme();

  if (!text) return null;

  // Split into math ($...$ or $$...$$) and normal segments
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

  return (
    <Text style={[{ color: colors.textPrimary, fontSize: fontSize || 16, lineHeight: 24 }, style]}>
      {parts.map((part, index) => {
        if (!part) return null;
        const isDisplay = part.startsWith("$$") && part.endsWith("$$");
        const isInline = part.startsWith("$") && part.endsWith("$");

        if (isDisplay || isInline) {
          const rawMath = isDisplay ? part.slice(2, -2) : part.slice(1, -1);
          const parsed = parseLatexToUnicode(rawMath);
          return (
            <Text
              key={index}
              style={[
                styles.mathText,
                {
                  fontStyle: "italic",
                  color: colors.primary,
                  fontWeight: "600",
                },
              ]}
            >
              {isDisplay ? `\n  ${parsed}  \n` : ` ${parsed} `}
            </Text>
          );
        }

        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  mathText: {
    fontFamily: undefined,
  },
});
