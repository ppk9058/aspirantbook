import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { formatActiveGoalLabel } from "@/lib/goals/active-goal-label"

describe("formatActiveGoalLabel", () => {
    it("returns the empty-state label when there are no goals", () => {
        assert.equal(formatActiveGoalLabel([]), "No goal selected")
    })

    it("returns the goal name for one goal", () => {
        assert.equal(formatActiveGoalLabel([{ name: "UPSC" }]), "UPSC")
    })

    it("returns the first name and +1 for two goals", () => {
        assert.equal(
            formatActiveGoalLabel([{ name: "UPSC" }, { name: "SSC" }]),
            "UPSC +1"
        )
    })

    it("returns the first name and +2 for three goals", () => {
        assert.equal(
            formatActiveGoalLabel([{ name: "UPSC" }, { name: "SSC" }, { name: "BPSC" }]),
            "UPSC +2"
        )
    })
})
