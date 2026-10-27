import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"

import {
  createBatch,
  deleteBatch,
  getAllBatches,
  updateBatch,
} from "@/lib/batches-service"
import { prisma } from "@/lib/prisma"
import { PLATFORM_SETTING_KEYS } from "@/lib/platform-settings"

/**
 * B1: the batches setting is one JSON row, and every mutation used to be a
 * read-modify-write of the whole array. Two defects are covered:
 *  1. a read error was swallowed into `[]`, so the next write persisted an
 *     empty list and erased every batch;
 *  2. concurrent creates read the same snapshot and the last write won, losing
 *     every other batch.
 */

const KEY = PLATFORM_SETTING_KEYS.batches
const originalQuery = prisma.platformSetting.findUnique.bind(prisma.platformSetting)
const originalRaw: any = prisma.$queryRawUnsafe
let originalValue: unknown = null
let originalHadRow = false

type Stored = { id: string; title: string }

async function storedBatches(): Promise<Stored[]> {
  const row = await prisma.platformSetting.findUnique({ where: { key: KEY } })
  return Array.isArray(row?.value) ? (row!.value as Stored[]) : []
}

describe("B1 batches storage is atomic and read errors are fatal", () => {
  before(async () => {
    await prisma.$connect()
    const row = await prisma.platformSetting.findUnique({ where: { key: KEY } })
    originalHadRow = Boolean(row)
    originalValue = row?.value ?? null
  })

  after(async () => {
    ;(prisma.platformSetting as any).findUnique = originalQuery
    ;(prisma as any).$queryRawUnsafe = originalRaw
    if (originalHadRow) {
      await prisma.platformSetting.update({
        where: { key: KEY },
        data: { value: originalValue as any },
      })
    } else {
      await prisma.platformSetting.deleteMany({ where: { key: KEY } })
    }
    await prisma.$disconnect()
  })

  it("keeps every batch when 10 creates run in parallel", async () => {
    const prefix = `b1-${Date.now()}`
    await prisma.platformSetting.deleteMany({ where: { key: KEY } })

    const created = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createBatch({ id: `${prefix}-${i}`, slug: `${prefix}-${i}`, title: `Parallel ${prefix} ${i}` })
      )
    )

    assert.equal(created.length, 10)
    const stored = await storedBatches()
    assert.equal(stored.length, 10, `expected 10 stored batches, got ${stored.length}`)
    assert.deepEqual(
      stored.map((b) => b.id).sort(),
      Array.from({ length: 10 }, (_, i) => `${prefix}-${i}`).sort()
    )

    // The public read path agrees with the row.
    const read = (await getAllBatches()).filter((b) => b.id.startsWith(prefix))
    assert.equal(read.length, 10)

    for (let i = 0; i < 10; i++) await deleteBatch(`${prefix}-${i}`)
  })

  it("a read error aborts the mutation and never wipes stored batches", async () => {
    const prefix = `b1-keep-${Date.now()}`
    await prisma.platformSetting.deleteMany({ where: { key: KEY } })
    await createBatch({ id: `${prefix}-a`, slug: `${prefix}-a`, title: "Keep me" })
    const before = await storedBatches()
    assert.equal(before.length, 1)

    ;(prisma.platformSetting as any).findUnique = async () => {
      throw new Error("simulated read failure")
    }

    await assert.rejects(
      () => createBatch({ id: `${prefix}-b`, slug: `${prefix}-b`, title: "Must not persist" }),
      /simulated read failure/
    )

    ;(prisma.platformSetting as any).findUnique = originalQuery

    const afterFailure = await storedBatches()
    assert.deepEqual(afterFailure.map((b) => b.id), before.map((b) => b.id))
    assert.equal(afterFailure.length, 1)

    await deleteBatch(`${prefix}-a`)
  })

  it("concurrent updates to different batches do not overwrite each other", async () => {
    const prefix = `b1-upd-${Date.now()}`
    await prisma.platformSetting.deleteMany({ where: { key: KEY } })
    await createBatch({ id: `${prefix}-1`, slug: `${prefix}-1`, title: "One" })
    await createBatch({ id: `${prefix}-2`, slug: `${prefix}-2`, title: "Two" })

    await Promise.all([
      updateBatch(`${prefix}-1`, { title: "One updated" }),
      updateBatch(`${prefix}-2`, { title: "Two updated" }),
    ])

    const stored = await storedBatches() as any[]
    const one = stored.find((b) => b.id === `${prefix}-1`)
    const two = stored.find((b) => b.id === `${prefix}-2`)
    assert.equal(one?.title, "One updated")
    assert.equal(two?.title, "Two updated")

    await deleteBatch(`${prefix}-1`)
    await deleteBatch(`${prefix}-2`)
  })
})
