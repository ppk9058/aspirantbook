export const GREEK_MAP: Record<string, string> = {
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\epsilon": "ε",
  "\\zeta": "ζ",
  "\\eta": "η",
  "\\theta": "θ",
  "\\iota": "ι",
  "\\kappa": "κ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\nu": "ν",
  "\\xi": "ξ",
  "\\pi": "π",
  "\\rho": "ρ",
  "\\sigma": "σ",
  "\\tau": "τ",
  "\\upsilon": "υ",
  "\\phi": "φ",
  "\\chi": "χ",
  "\\psi": "ψ",
  "\\omega": "ω",
  "\\Gamma": "Γ",
  "\\Delta": "Δ",
  "\\Theta": "Θ",
  "\\Lambda": "Λ",
  "\\Xi": "Ξ",
  "\\Pi": "Π",
  "\\Sigma": "Σ",
  "\\Upsilon": "Υ",
  "\\Phi": "Φ",
  "\\Psi": "Ψ",
  "\\Omega": "Ω",
};

export const SYMBOL_MAP: Record<string, string> = {
  "\\times": "×",
  "\\div": "÷",
  "\\pm": "±",
  "\\mp": "∓",
  "\\le": "≤",
  "\\leq": "≤",
  "\\ge": "≥",
  "\\geq": "≥",
  "\\neq": "≠",
  "\\approx": "≈",
  "\\equiv": "≡",
  "\\propto": "∝",
  "\\infty": "∞",
  "\\cdot": "·",
  "\\sum": "∑",
  "\\prod": "∏",
  "\\int": "∫",
  "\\partial": "∂",
  "\\nabla": "∇",
  "\\forall": "∀",
  "\\exists": "∃",
  "\\in": "∈",
  "\\notin": "∉",
  "\\subset": "⊂",
  "\\subseteq": "⊆",
  "\\cap": "∩",
  "\\cup": "∪",
  "\\land": "∧",
  "\\lor": "∨",
  "\\neg": "¬",
  "\\to": "→",
  "\\rightarrow": "→",
  "\\leftarrow": "←",
  "\\Rightarrow": "⇒",
  "\\Leftrightarrow": "⇔",
  "\\degree": "°",
  "\\circ": "°",
  "\\lim": "lim",
  "\\sin": "sin",
  "\\cos": "cos",
  "\\tan": "tan",
  "\\log": "log",
  "\\ln": "ln",
  "\\max": "max",
  "\\min": "min",
  "\\quad": "  ",
  "\\qquad": "    ",
  "\\,": " ",
  "\\;": " ",
  "\\:": " ",
};

export const BLACKBOARD_MAP: Record<string, string> = {
  "\\mathbb{R}": "ℝ",
  "\\mathbb{N}": "ℕ",
  "\\mathbb{Z}": "ℤ",
  "\\mathbb{Q}": "ℚ",
  "\\mathbb{C}": "ℂ",
};

export const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  "n": "ⁿ",
  "i": "ⁱ",
  "x": "ˣ",
  "y": "ʸ",
};

export const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  "a": "ₐ",
  "e": "ₑ",
  "o": "ₒ",
  "x": "ₓ",
  "n": "ₙ",
  "i": "ᵢ",
  "j": "ⱼ",
  "k": "ₖ",
  "m": "ₘ",
  "p": "ₚ",
  "s": "ₛ",
  "t": "ₜ",
};

export interface MathSegment {
  content: string;
  isMath: boolean;
  isDisplay?: boolean;
  raw: string;
}

/**
 * Tokenizes text into math ($...$ or $$...$$) and normal segments.
 * Protects against malformed unclosed single/double dollars so sentences never drop text.
 */
export function parseMathSegments(text: string): MathSegment[] {
  if (!text) return [];

  const segments: MathSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    // Check for display math $$
    const displayStart = text.indexOf("$$", cursor);
    const inlineStart = text.indexOf("$", cursor);

    if (displayStart !== -1 && (inlineStart === -1 || displayStart <= inlineStart)) {
      // Normal text before $$
      if (displayStart > cursor) {
        segments.push({
          content: text.slice(cursor, displayStart),
          isMath: false,
          raw: text.slice(cursor, displayStart),
        });
      }
      const displayEnd = text.indexOf("$$", displayStart + 2);
      if (displayEnd !== -1) {
        const rawMath = text.slice(displayStart + 2, displayEnd);
        segments.push({
          content: rawMath,
          isMath: true,
          isDisplay: true,
          raw: rawMath,
        });
        cursor = displayEnd + 2;
      } else {
        // Malformed unclosed $$: treat remainder as normal text
        segments.push({
          content: text.slice(displayStart),
          isMath: false,
          raw: text.slice(displayStart),
        });
        break;
      }
    } else if (inlineStart !== -1) {
      // Normal text before $
      if (inlineStart > cursor) {
        segments.push({
          content: text.slice(cursor, inlineStart),
          isMath: false,
          raw: text.slice(cursor, inlineStart),
        });
      }
      const inlineEnd = text.indexOf("$", inlineStart + 1);
      // Ensure closing dollar is not immediately followed by another dollar and not on another paragraph
      if (inlineEnd !== -1 && !text.slice(inlineStart + 1, inlineEnd).includes("\n\n")) {
        const rawMath = text.slice(inlineStart + 1, inlineEnd);
        segments.push({
          content: rawMath,
          isMath: true,
          isDisplay: false,
          raw: rawMath,
        });
        cursor = inlineEnd + 1;
      } else {
        // Malformed unclosed $: treat as text
        segments.push({
          content: text.slice(inlineStart),
          isMath: false,
          raw: text.slice(inlineStart),
        });
        break;
      }
    } else {
      // Remainder of string
      segments.push({
        content: text.slice(cursor),
        isMath: false,
        raw: text.slice(cursor),
      });
      break;
    }
  }

  return segments;
}

/**
 * Checks whether math has complex environments (matrices, multiline align) requiring monospace fallback.
 */
export function isComplexMath(math: string): boolean {
  if (!math) return false;
  return (
    math.includes("\\begin{pmatrix}") ||
    math.includes("\\begin{vmatrix}") ||
    math.includes("\\begin{matrix}") ||
    math.includes("\\begin{cases}") ||
    math.includes("\\begin{align}") ||
    math.includes("\\begin{array}") ||
    math.includes("\\det(")
  );
}

/**
 * Translates LaTeX math into clean readable Unicode representation.
 * Handles nested fractions, roots, Greek symbols, superscripts, subscripts,
 * vectors, blackboard bold, and matrices.
 */
export function parseLatexToUnicode(math: string): string {
  if (!math || !math.trim()) return "";
  let s = math.trim();

  // Blackboard bold (ℝ, ℕ, etc.)
  for (const [tex, uni] of Object.entries(BLACKBOARD_MAP)) {
    s = s.split(tex).join(uni);
  }

  // Vectors \vec{F} -> F
  s = s.replace(/\\vec\{([^{}]+)\}/g, "$1⃗");

  // Nth Root \sqrt[3]{27} -> ³√(27)
  s = s.replace(/\\sqrt\[([0-9a-z]+)\]\{([^{}]+)\}/g, (_, deg, val) => {
    const supDeg = deg
      .split("")
      .map((c: string) => SUPERSCRIPT_MAP[c] || c)
      .join("");
    return `${supDeg}√(${val})`;
  });

  // Square roots \sqrt{x} -> √(x)
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");

  // Handle fractions, including nested ones
  let prev = "";
  let iterations = 0;
  while (s.includes("\\frac") && prev !== s && iterations < 5) {
    prev = s;
    iterations++;
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 / $2)");
  }

  // Replace Greek characters
  for (const [tex, uni] of Object.entries(GREEK_MAP)) {
    s = s.split(tex).join(uni);
  }

  // Replace math symbols
  for (const [tex, uni] of Object.entries(SYMBOL_MAP)) {
    s = s.split(tex).join(uni);
  }

  // Text commands
  s = s.replace(/\\text\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathit\{([^{}]+)\}/g, "$1");

  // Matrix and Cases environments format
  s = s.replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_, content) => {
    const rows = content.trim().split("\\\\").map((r: string) => r.trim().split("&").map((c: string) => c.trim()).join(" "));
    return `[ ${rows.join(" ; ")} ]`;
  });
  s = s.replace(/\\begin\{vmatrix\}([\s\S]*?)\\end\{vmatrix\}/g, (_, content) => {
    const rows = content.trim().split("\\\\").map((r: string) => r.trim().split("&").map((c: string) => c.trim()).join(" "));
    return `| ${rows.join(" ; ")} |`;
  });
  s = s.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, content) => {
    const rows = content.trim().split("\\\\").map((r: string) => r.trim().split("&").map((c: string) => c.trim()).join(" "));
    return `{ ${rows.join(" , ")} }`;
  });

  // Convert superscripts: ^{abc} or ^2 or ^\circ
  s = s.replace(/\^\\circ/g, "°");
  s = s.replace(/\^\{([^{}]+)\}/g, (_, chars) =>
    chars
      .split("")
      .map((c: string) => SUPERSCRIPT_MAP[c] || c)
      .join("")
  );
  s = s.replace(/\^([0-9a-z+-])/gi, (_, c) => SUPERSCRIPT_MAP[c] || `^${c}`);

  // Convert subscripts: _{abc} or _1
  s = s.replace(/_\{([^{}]+)\}/g, (_, chars) =>
    chars
      .split("")
      .map((c: string) => SUBSCRIPT_MAP[c] || c)
      .join("")
  );
  s = s.replace(/_([0-9a-z+-])/gi, (_, c) => SUBSCRIPT_MAP[c] || `_${c}`);

  // Clean remaining braces
  s = s.replace(/[{}]/g, "");

  return s.trim();
}
