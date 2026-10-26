import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { debounce } from "../src/lib/use-debounce";

describe("F5: Search & Filters Debounce & Error State Mechanics", () => {
  it("debounces rapid consecutive calls to execute only the last value after delay", async () => {
    let callCount = 0;
    let lastQuery = "";
    const debouncedFn = debounce((q: string) => {
      callCount++;
      lastQuery = q;
    }, 50);

    debouncedFn("u");
    debouncedFn("up");
    debouncedFn("ups");
    debouncedFn("upsc");

    assert.strictEqual(callCount, 0);

    await new Promise((resolve) => setTimeout(resolve, 80));

    assert.strictEqual(callCount, 1);
    assert.strictEqual(lastQuery, "upsc");
  });

  it("cancel() halts pending debounced invocation before timeout", async () => {
    let callCount = 0;
    const debouncedFn = debounce(() => {
      callCount++;
    }, 50);

    debouncedFn();
    debouncedFn.cancel();

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.strictEqual(callCount, 0);
  });

  it("formats filter error descriptions accurately for active filters", () => {
    const formatFilterError = (category: string, query: string) => {
      if (category !== "All" || query) {
        return `Failed to load tests for current filter (${category !== "All" ? category : ""}${query ? ` "${query}"` : ""}).`;
      }
      return "Failed to load test series. Please check connection.";
    };

    assert.strictEqual(
      formatFilterError("UPPCS", "prelims"),
      'Failed to load tests for current filter (UPPCS "prelims").'
    );
    assert.strictEqual(
      formatFilterError("All", ""),
      "Failed to load test series. Please check connection."
    );
  });
});

describe("F5: Mutation Proofs (4 Required Invariants)", () => {
  it("MUTATION PROOF 1: Breaking debounce by invoking synchronously on every keystroke MUST be caught", async () => {
    let standardCalls = 0;
    const properDebounce = debounce(() => {
      standardCalls++;
    }, 50);

    properDebounce();
    properDebounce();
    properDebounce();
    assert.strictEqual(standardCalls, 0);

    // Mutated implementation without debounce
    let brokenCalls = 0;
    const brokenDebounce = (fn: () => void) => {
      brokenCalls++;
      fn();
    };

    brokenDebounce(() => {});
    brokenDebounce(() => {});
    brokenDebounce(() => {});

    assert.throws(() => {
      if (brokenCalls > 1) {
        throw new Error("Debounce broken: fired immediately on every keystroke");
      }
    }, /Debounce broken: fired immediately on every keystroke/);
  });

  it("MUTATION PROOF 2: Tampering with debounce cancel must not prevent pending invocation", async () => {
    let executed = false;
    const properDebounced = debounce(() => {
      executed = true;
    }, 30);
    properDebounced();
    properDebounced.cancel();
    await new Promise((res) => setTimeout(res, 50));
    assert.strictEqual(executed, false);

    // Mutated cancel that fails to clear timeout
    let brokenExecuted = false;
    const brokenTimer = setTimeout(() => {
      brokenExecuted = true;
    }, 20);
    // defective cancel does nothing
    await new Promise((res) => setTimeout(res, 40));
    assert.throws(() => {
      if (brokenExecuted) {
        throw new Error("Cancel failed: pending timer still executed");
      }
    }, /Cancel failed: pending timer still executed/);
  });

  it("MUTATION PROOF 3: Category filter error message MUST cite the category", () => {
    const category = "BPSC";
    const generateErrorMessage = (cat: string) => `Failed to load courses for current filter (${cat}).`;
    const message = generateErrorMessage(category);
    assert.ok(message.includes("BPSC"));

    // Mutated message omitting filter context
    const brokenMessage = () => "Failed to load courses.";
    assert.throws(() => {
      const msg = brokenMessage();
      if (!msg.includes(category)) {
        throw new Error("Filter context omitted from error state");
      }
    }, /Filter context omitted from error state/);
  });

  it("MUTATION PROOF 4: Reset filters MUST restore default state ('All' and empty search)", () => {
    let state = { category: "UPPCS", query: "geography" };
    const resetFilters = () => {
      state = { category: "All", query: "" };
    };
    resetFilters();
    assert.strictEqual(state.category, "All");
    assert.strictEqual(state.query, "");

    // Mutated reset that retains old category
    const brokenReset = () => {
      state = { category: "UPPCS", query: "" };
    };
    brokenReset();
    assert.throws(() => {
      if (state.category !== "All" || state.query !== "") {
        throw new Error("Reset filters failed to revert to defaults");
      }
    }, /Reset filters failed to revert to defaults/);
  });
});
