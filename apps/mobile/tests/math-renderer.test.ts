import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseLatexToUnicode, parseMathSegments, isComplexMath } from "../src/lib/latex-parser";

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

  it("translates calculus, infinity, and advanced math symbols", () => {
    assert.equal(parseLatexToUnicode("\\int f(x) dx"), "∫ f(x) dx");
    assert.equal(parseLatexToUnicode("\\lim_{x \\to \\infty} f(x)"), "limₓ → ∞ f(x)");
    assert.equal(parseLatexToUnicode("\\partial y / \\partial x"), "∂ y / ∂ x");
    assert.equal(parseLatexToUnicode("\\sum a_i"), "∑ aᵢ");
  });

  it("translates set theory, logic, and blackboard notation", () => {
    assert.equal(parseLatexToUnicode("x \\in \\mathbb{R}"), "x ∈ ℝ");
    assert.equal(parseLatexToUnicode("A \\subset B \\land C \\cup D"), "A ⊂ B ∧ C ∪ D");
    assert.equal(parseLatexToUnicode("\\forall x \\exists y"), "∀ x ∃ y");
  });

  it("correctly identifies complex environments requiring fallback", () => {
    assert.equal(isComplexMath("\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}"), true);
    assert.equal(isComplexMath("\\begin{align} x &= 1 \\\\ y &= 2 \\end{align}"), true);
    assert.equal(isComplexMath("\\det(A) = 0"), true);
    assert.equal(isComplexMath("x + y = 10"), false);
  });

  it("tokenizes mixed inline, display, and normal text segments properly", () => {
    const text = "Solve for $x$: $$x^2 - 4 = 0$$ where $x \\in \\mathbb{R}$.";
    const segments = parseMathSegments(text);
    assert.equal(segments.length, 7);
    assert.equal(segments[0].content, "Solve for ");
    assert.equal(segments[0].isMath, false);
    assert.equal(segments[1].content, "x");
    assert.equal(segments[1].isMath, true);
    assert.equal(segments[2].content, ": ");
    assert.equal(segments[3].content, "x^2 - 4 = 0");
    assert.equal(segments[3].isDisplay, true);
    assert.equal(segments[4].content, " where ");
    assert.equal(segments[5].content, "x \\in \\mathbb{R}");
    assert.equal(segments[6].content, ".");
  });
});
