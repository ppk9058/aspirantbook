import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { parseRoseraBlock, ParsedRoseraBlock } from "../../lib/rosera-parser";

export { parseRoseraBlock };
export type { ParsedRoseraBlock };

export interface RoseraBlock {
  type: string;
  text?: string;
  level?: number;
  items?: string[];
  language?: string;
  code?: string;
  calloutType?: "info" | "warning" | "tip";
  url?: string;
  caption?: string;
  headers?: string[];
  rows?: string[][];
  question?: string;
  options?: string[];
  correctOptionIndex?: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class RoseraErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error internally without crashing the UI
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <View style={styles.fallbackContainer} testID="rosera-error-fallback">
            <Text style={styles.fallbackText}>[Content block could not be displayed]</Text>
          </View>
        )
      );
    }
    return this.props.children;
  }
}

interface RoseraBlockRendererProps {
  block: any;
  index: number;
  textColor?: string;
}

export function RoseraBlockRenderer({ block, index, textColor = "#1e293b" }: RoseraBlockRendererProps) {
  // Guard against malformed non-object or null blocks
  if (!block || typeof block !== "object") {
    return (
      <View style={styles.fallbackContainer} testID={`rosera-malformed-${index}`}>
        <Text style={styles.fallbackText}>[Invalid block data]</Text>
      </View>
    );
  }

  const blockType = typeof block.type === "string" ? block.type.toLowerCase() : "unknown";

  switch (blockType) {
    case "heading": {
      const level = typeof block.level === "number" && block.level >= 1 && block.level <= 6 ? block.level : 2;
      const fontSize = level === 1 ? 22 : level === 2 ? 18 : 16;
      const text = typeof block.text === "string" ? block.text : "";
      return (
        <Text key={index} style={[styles.heading, { fontSize, color: textColor }]}>
          {text}
        </Text>
      );
    }

    case "paragraph": {
      const text = typeof block.text === "string" ? block.text : "";
      return (
        <Text key={index} style={[styles.paragraph, { color: textColor }]}>
          {text}
        </Text>
      );
    }

    case "list": {
      const items = Array.isArray(block.items) ? block.items : [];
      return (
        <View key={index} style={styles.listContainer}>
          {items.map((item: any, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.bullet, { color: textColor }]}>• </Text>
              <Text style={[styles.listText, { color: textColor }]}>
                {typeof item === "string" ? item : ""}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    case "callout": {
      const text = typeof block.text === "string" ? block.text : "";
      return (
        <View key={index} style={styles.callout}>
          <Text style={styles.calloutText}>{text}</Text>
        </View>
      );
    }

    case "code": {
      const code = typeof block.code === "string" ? block.code : "";
      return (
        <View key={index} style={styles.codeBlock}>
          <Text style={styles.codeText}>{code}</Text>
        </View>
      );
    }

    default: {
      // Safe fallback for unknown or future block types: display readable text if present
      if (typeof block.text === "string" && block.text.trim().length > 0) {
        return (
          <Text key={index} style={[styles.paragraph, { color: textColor }]} testID={`rosera-unknown-${index}`}>
            {block.text}
          </Text>
        );
      }
      return (
        <View key={index} style={styles.unknownFallback} testID={`rosera-unknown-${index}`}>
          <Text style={styles.unknownText}>[Unsupported content block: {String(block.type)}]</Text>
        </View>
      );
    }
  }
}

export function SafeRoseraRenderer({ blocks, textColor }: { blocks: any[]; textColor?: string }) {
  if (!Array.isArray(blocks)) {
    return (
      <View style={styles.fallbackContainer} testID="rosera-empty-fallback">
        <Text style={styles.fallbackText}>[No content blocks]</Text>
      </View>
    );
  }

  return (
    <RoseraErrorBoundary>
      <View style={styles.container}>
        {blocks.map((block, idx) => (
          <RoseraBlockRenderer key={idx} block={block} index={idx} textColor={textColor} />
        ))}
      </View>
    </RoseraErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  heading: {
    fontWeight: "bold",
    marginVertical: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 6,
  },
  listContainer: {
    marginVertical: 6,
    paddingLeft: 8,
  },
  listItem: {
    flexDirection: "row",
    marginVertical: 2,
  },
  bullet: {
    fontSize: 15,
    fontWeight: "bold",
  },
  listText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  callout: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  calloutText: {
    color: "#166534",
    fontSize: 14,
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  codeText: {
    color: "#f8fafc",
    fontFamily: "monospace",
    fontSize: 13,
  },
  fallbackContainer: {
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    marginVertical: 6,
  },
  fallbackText: {
    color: "#991b1b",
    fontSize: 12,
    fontStyle: "italic",
  },
  unknownFallback: {
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    marginVertical: 4,
  },
  unknownText: {
    color: "#64748b",
    fontSize: 12,
  },
});
