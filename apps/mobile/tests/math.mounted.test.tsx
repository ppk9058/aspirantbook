import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { MathRenderer } from "../src/components/exam/MathRenderer";

describe("G9: KaTeX / Math Formula Parity", () => {
  it("[katex] renders inline mathematical formulas with Greek symbols and superscripts", () => {
    const rawFormula = "Calculate $\\alpha + \\beta^2 = \\theta$";
    render(
      <ThemeProvider>
        <MathRenderer text={rawFormula} />
      </ThemeProvider>
    );

    // Expect parsed Unicode mathematical representation
    expect(screen.getByText(/α \+ β² = θ/)).toBeTruthy();
  });

  it("[katex] handles block equations and mathematical fallbacks", () => {
    const blockFormula = "Evaluate $$\\int_{0}^{1} x dx$$ in calculus";
    render(
      <ThemeProvider>
        <MathRenderer text={blockFormula} />
      </ThemeProvider>
    );

    expect(screen.getByText(/∫/)).toBeTruthy();
  });
});
