export interface ParsedRoseraBlock {
  isValid: boolean;
  type: string;
  level?: number;
  text?: string;
  items?: string[];
  code?: string;
  isFallback: boolean;
}

export function parseRoseraBlock(block: any): ParsedRoseraBlock {
  if (!block || typeof block !== "object") {
    return { isValid: false, type: "malformed", isFallback: true, text: "" };
  }

  const type = typeof block.type === "string" ? block.type.toLowerCase() : "unknown";

  switch (type) {
    case "heading": {
      const level =
        typeof block.level === "number" && block.level >= 1 && block.level <= 6
          ? block.level
          : 2;
      return {
        isValid: true,
        type: "heading",
        level,
        text: typeof block.text === "string" ? block.text : "",
        isFallback: false,
      };
    }

    case "paragraph": {
      return {
        isValid: true,
        type: "paragraph",
        text: typeof block.text === "string" ? block.text : "",
        isFallback: false,
      };
    }

    case "list": {
      const items = Array.isArray(block.items) ? block.items : [];
      return {
        isValid: true,
        type: "list",
        items,
        isFallback: false,
      };
    }

    case "callout": {
      return {
        isValid: true,
        type: "callout",
        text: typeof block.text === "string" ? block.text : "",
        isFallback: false,
      };
    }

    case "code": {
      return {
        isValid: true,
        type: "code",
        code: typeof block.code === "string" ? block.code : "",
        isFallback: false,
      };
    }

    default: {
      return {
        isValid: false,
        type,
        text: typeof block.text === "string" ? block.text : "",
        isFallback: true,
      };
    }
  }
}
