import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseLatexToUnicode } from "../src/lib/latex-parser";

describe("MathRenderer: LaTeX to Unicode Math Parsing", () => {
  it("translates Greek symbols correctly", () => {
    assert.equal(parseLatexToUnicode("\\alpha + \\beta = \\theta"), "α + β = θ");
    assert.equal(parseLatexToUnicode("\\Delta E = h \\nu"), "Δ E = h ν");
  });

  it("translates fractions into readable inline representation", () => {
    assert.equal(parseLatexToUnicode("\\frac{a}{b}"), "(a / b)");
    assert.equal(parseLatexToUnicode("\\frac{1}{2} + \\frac{3}{4}"), "(1 / 2) + (3 / 4)");
  });

  it("translates square roots", () => {
    assert.equal(parseLatexToUnicode("\\sqrt{x + y}"), "√(x + y)");
  });

  it("translates superscripts and subscripts", () => {
    assert.equal(parseLatexToUnicode("x^2 + y^2 = z^2"), "x² + y² = z²");
    assert.equal(parseLatexToUnicode("a_1 + a_2 = a_n"), "a₁ + a₂ = aₙ");
  });

  it("translates math operators", () => {
    assert.equal(parseLatexToUnicode("a \\le b \\ge c \\neq d"), "a ≤ b ≥ c ≠ d");
    assert.equal(parseLatexToUnicode("x \\pm y \\times z"), "x ± y × z");
  });
});
