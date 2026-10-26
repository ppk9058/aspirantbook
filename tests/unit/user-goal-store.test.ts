import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import { assertTestDatabase } from "@/lib/test-db-guard"
import { prisma } from "@/lib/prisma"
import {
  createGoalGetHandler,
  readUserGoal,
  writeUserGoal,
  type GoalStoreClient,
} from "@/lib/goals/user-goal-store"

/**
 * B-007 regression: the user goal is stored in the database only. The old
 * in-memory fallback map is deleted, so a failing DB read must surface as a 503
 * instead of a cached value.
 */

const failingClient: GoalStoreClient = {
  user: {
    findUnique: async () => {
      throw new Error("database is down")
    },
    update: async () => {
      throw new Error("database is down")
    },
  },
}

const rowClient = (selectedGoal: string | null, selectedSubGoal: string | null): GoalStoreClient => ({
  user: {
    findUnique: async () => ({ selectedGoal, selectedSubGoal, updatedAt: new Date("2026-10-27T10:00:00.000Z") }),
    update: async ({ data }: any) => ({ ...data, updatedAt: new Date("2026-10-27T10:00:00.000Z") }),
  },
})

describe("B-007: goal storage is the database only", () => {
  it("reads a stored goal through the DB client", async () => {
    const goal = await readUserGoal("user-1", rowClient("upsc,ssc", "ias"))
    assert.deepEqual(goal, {
      goalId: "upsc,ssc",
      goalIds: ["upsc", "ssc"],
      subGoalId: "ias",
      updatedAt: "2026-10-27T10:00:00.000Z",
    })
  })

  it("returns null when the user has no goal (no memory fallback)", async () => {
    assert.equal(await readUserGoal("user-1", rowClient(null, null)), null)
  })

  it("propagates DB read failures instead of using a cached value", async () => {
    await assert.rejects(() => readUserGoal("user-1", failingClient), /database is down/)
  })

  it("propagates DB write failures instead of claiming success", async () => {
    await assert.rejects(() => writeUserGoal("user-1", ["upsc"], null, failingClient), /database is down/)
  })

  it("serialises and de-duplicates goals on write", async () => {
    const stored = await writeUserGoal("user-1", ["UPSC", " upsc ", "ssc"], "ias", rowClient(null, null))
    assert.equal(stored.goalId, "upsc,ssc")
    assert.deepEqual(stored.goalIds, ["upsc", "ssc"])
    assert.equal(stored.subGoalId, "ias")
  })

  it("GET returns 503 when the DB read throws", async () => {
    const GET = createGoalGetHandler({
      getUserId: async () => "user-1",
      getGoal: async () => {
        throw new Error("database is down")
      },
    })
    const res = await GET()
    assert.equal(res.status, 503)
    assert.deepEqual(await res.json(), { success: false, error: "Goal storage unavailable" })
  })

  it("GET returns the stored goal for a signed-in user", async () => {
    const GET = createGoalGetHandler({
      getUserId: async () => "user-1",
      getGoal: () => readUserGoal("user-1", rowClient("upsc", null)),
    })
    const res = await GET()
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.equal(body.goal.goalId, "upsc")
  })

  it("GET returns an empty goal for a guest", async () => {
    const GET = createGoalGetHandler({
      getUserId: async () => null,
      getGoal: async () => {
        throw new Error("must not be called")
      },
    })
    const res = await GET()
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { success: true, goal: null, goalIds: [] })
  })
})

describe("B-007: goal round trip through the real test database", () => {
  let userId = ""

  before(() => {
    // Fail closed if this file is run without the pinned test-DB environment.
    assertTestDatabase({ context: "tests/unit/user-goal-store.test.ts" })
  })

  after(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  })

  it("writes a goal and reads it back through the DB path", async () => {
    const user = await prisma.user.create({
      data: { email: `b007-goal-${Date.now()}@aspirantbook.test`, role: "FREE" },
      select: { id: true },
    })
    userId = user.id

    await writeUserGoal(userId, ["upsc", "ssc"], "ias")
    const goal = await readUserGoal(userId)

    assert.equal(goal?.goalId, "upsc,ssc")
    assert.deepEqual(goal?.goalIds, ["upsc", "ssc"])
    assert.equal(goal?.subGoalId, "ias")

    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { selectedGoal: true, selectedSubGoal: true },
    })
    assert.deepEqual(row, { selectedGoal: "upsc,ssc", selectedSubGoal: "ias" })
  })
})
