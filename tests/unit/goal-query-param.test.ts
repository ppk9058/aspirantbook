import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { getQueryGoal, stripGoalParam } from "@/lib/goals/query-goal"

describe("getQueryGoal", () => {
    it("returns null when there is no goal param", () => {
        assert.equal(getQueryGoal(""), null)
        assert.equal(getQueryGoal(null), null)
        assert.equal(getQueryGoal("?foo=bar"), null)
    })

    it("parses a single goal id", () => {
        assert.deepEqual(getQueryGoal("?goal=upsc"), {
            raw: "upsc",
            ids: ["upsc"],
            serialized: "upsc",
        })
    })

    it("parses a comma-separated goal list and serializes it canonically", () => {
        assert.deepEqual(getQueryGoal("?goal=UPSC,bpsc"), {
            raw: "UPSC,bpsc",
            ids: ["upsc", "bpsc"],
            serialized: "upsc,bpsc",
        })
    })

    it("accepts an encoded comma list", () => {
        assert.equal(getQueryGoal("?goal=upsc%2Cbpsc")?.serialized, "upsc,bpsc")
    })

    it("rejects ids that are not in the goals config", () => {
        assert.equal(getQueryGoal("?goal=not-a-real-goal"), null)
        assert.equal(getQueryGoal("?goal=upsc,not-a-real-goal")?.serialized, "upsc")
    })
})

describe("stripGoalParam", () => {
    it("removes only the goal param", () => {
        assert.equal(stripGoalParam("?goal=upsc&foo=bar"), "?foo=bar")
        assert.equal(stripGoalParam("?foo=bar&goal=upsc"), "?foo=bar")
    })

    it("returns an empty string when goal is the only param", () => {
        assert.equal(stripGoalParam("?goal=upsc"), "")
        assert.equal(stripGoalParam(""), "")
    })

    it("keeps unrelated params in their original order", () => {
        assert.equal(stripGoalParam("?a=1&goal=upsc&b=2"), "?a=1&b=2")
    })
})
