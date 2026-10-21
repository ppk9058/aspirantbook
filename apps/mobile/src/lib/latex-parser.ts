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
  "\\leftarrow": "←",
  "\\Rightarrow": "⇒",
  "\\Leftrightarrow": "⇔",
  "\\degree": "°",
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

export function parseLatexToUnicode(math: string): string {
  let s = math.trim();

  // Convert \frac{a}{b} -> (a / b)
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 / $2)");

  // Convert \sqrt{x} -> √(x)
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");

  // Replace Greek characters
  for (const [tex, uni] of Object.entries(GREEK_MAP)) {
    s = s.split(tex).join(uni);
  }

  // Replace math symbols
  for (const [tex, uni] of Object.entries(SYMBOL_MAP)) {
    s = s.split(tex).join(uni);
  }

  // Convert superscripts: ^{abc} or ^2
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

  // Remove leftover curly braces or LaTeX commands
  s = s.replace(/\\mathrm\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\text\{([^{}]+)\}/g, "$1");

  return s;
}
