import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
    doesCategoryMatchGoal,
    resolveTokenToCanonicalGoals,
    validateOrMapCanonicalGoals,
} from "../../lib/tutorials-goal-categories";

describe("Step 1 Unit Tests: Exact Goal Matching & No Substring Leaks", () => {
    test("UPSC, BPSC, SSC must NOT match skills", () => {
        // Critical regression test: single letter "c" in UPSC/BPSC/SSC must NOT trigger skills
        assert.equal(
            doesCategoryMatchGoal("UPSC", "skills"),
            false,
            "UPSC must NOT match skills"
        );
        assert.equal(
            doesCategoryMatchGoal("BPSC", "skills"),
            false,
            "BPSC must NOT match skills"
        );
        assert.equal(
            doesCategoryMatchGoal("SSC", "skills"),
            false,
            "SSC must NOT match skills"
        );
        assert.equal(
            doesCategoryMatchGoal("BPSC TRE", "skills"),
            false,
            "BPSC TRE must NOT match skills"
        );
        assert.equal(
            doesCategoryMatchGoal("Civil Services", "skills"),
            false,
            "Civil Services must NOT match skills"
        );
    });

    test("C matches skills ONLY as an exact token", () => {
        // Exact token "C" or "c"
        assert.equal(
            doesCategoryMatchGoal("C", "skills"),
            true,
            "'C' must match skills as exact token"
        );
        assert.equal(
            doesCategoryMatchGoal("c", "skills"),
            true,
            "'c' must match skills as exact token"
        );
        assert.equal(
            doesCategoryMatchGoal("C, Python", "skills"),
            true,
            "'C, Python' must match skills"
        );

        // Substring check: words containing 'c' must NOT match skills unless alias matches
        assert.equal(
            doesCategoryMatchGoal("Economics", "skills"),
            false,
            "'Economics' contains 'c' but must NOT match skills"
        );
        assert.equal(
            doesCategoryMatchGoal("Calculus", "skills"),
            false,
            "'Calculus' contains 'c' but must NOT match skills"
        );
        assert.equal(
            doesCategoryMatchGoal("Civics", "skills"),
            false,
            "'Civics' contains 'c' but must NOT match skills"
        );
    });

    test("Target goal exact matching works as expected", () => {
        // UPSC
        assert.equal(doesCategoryMatchGoal("UPSC", "upsc"), true);
        assert.equal(doesCategoryMatchGoal("upsc", "upsc"), true);
        assert.equal(doesCategoryMatchGoal("Civil Services", "upsc"), true);
        assert.equal(doesCategoryMatchGoal("BPSC", "upsc"), false);

        // BPSC
        assert.equal(doesCategoryMatchGoal("BPSC", "bpsc"), true);
        assert.equal(doesCategoryMatchGoal("bpsc", "bpsc"), true);
        assert.equal(doesCategoryMatchGoal("Bihar Special", "bpsc"), true);
        assert.equal(doesCategoryMatchGoal("UPSC", "bpsc"), false);

        // SSC
        assert.equal(doesCategoryMatchGoal("SSC", "ssc"), true);
        assert.equal(doesCategoryMatchGoal("ssc", "ssc"), true);
        assert.equal(doesCategoryMatchGoal("SSC CGL", "ssc"), true);
        assert.equal(doesCategoryMatchGoal("UPSC", "ssc"), false);

        // Multi-category CSV
        assert.equal(doesCategoryMatchGoal("upsc, skills", "upsc"), true);
        assert.equal(doesCategoryMatchGoal("upsc, skills", "skills"), true);
        assert.equal(doesCategoryMatchGoal("upsc, skills", "bpsc"), false);
    });

    test("Explicit alias mapping resolves properly", () => {
        // AI / ML / GenAI
        assert.equal(doesCategoryMatchGoal("ai", "skills"), true);
        assert.equal(doesCategoryMatchGoal("ai", "data-science"), true);
        assert.equal(doesCategoryMatchGoal("Generative AI", "skills"), true);
        assert.equal(doesCategoryMatchGoal("Python", "skills"), true);
        assert.equal(doesCategoryMatchGoal("Python", "upsc"), false);
        assert.equal(doesCategoryMatchGoal("Prompt Engineering", "skills"), true);
        assert.equal(doesCategoryMatchGoal("Autonomous Agents", "skills"), true);

        // Resolving token to canonical goals
        assert.deepEqual(resolveTokenToCanonicalGoals("ai"), ["skills", "data-science"]);
        assert.deepEqual(resolveTokenToCanonicalGoals("c"), ["skills"]);
        assert.deepEqual(resolveTokenToCanonicalGoals("upsc"), ["upsc"]);
        assert.deepEqual(resolveTokenToCanonicalGoals("unknown-gibberish"), []);
    });

    test("validateOrMapCanonicalGoals validates properly", () => {
        const valid = validateOrMapCanonicalGoals("UPSC, Python");
        assert.equal(valid.isValid, true);
        assert.ok(valid.validSlugs.includes("upsc"));
        assert.ok(valid.validSlugs.includes("skills"));

        const invalid = validateOrMapCanonicalGoals("some-completely-invalid-category");
        assert.equal(invalid.isValid, false);
        assert.ok(invalid.error?.includes("Category required"));

        const empty = validateOrMapCanonicalGoals("");
        assert.equal(empty.isValid, false);
    });
});
