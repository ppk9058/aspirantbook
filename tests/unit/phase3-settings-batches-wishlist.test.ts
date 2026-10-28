import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

import { assertTestDatabase } from "@/lib/test-db-guard"
import { prisma } from "@/lib/prisma"
import {
  getPlatformSetting,
  setPlatformSetting,
  PLATFORM_SETTING_KEYS,
} from "@/lib/platform-settings"
import { createBatch, deleteBatch, getAllBatches, getBatchById } from "@/lib/batches-service"

/**
 * S5 regression: batches, admin settings and the book wishlist no longer touch
 * data/*.json. Writes are visible to a second read (the database is the source
 * of truth) and the JSON files on disk do not change.
 */

const DATA_FILES = ["batches.json", "platform-settings.json", "book-wishlist.json"].map((file) =>
  path.join(process.cwd(), "data", file)
)

function snapshot() {
  const out: Record<string, string> = {}
  for (const file of DATA_FILES) {
    out[path.basename(file)] = fs.existsSync(file)
      ? crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
      : "(missing)"
  }
  return out
}

const runId = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`
const createdBatchIds: string[] = []
const createdUserIds: string[] = []

describe("S5: settings, batches and wishlist persist in the database", () => {
  let beforeSnapshot: Record<string, string>
  let previousBatches: unknown = null

  before(async () => {
    assertTestDatabase({ context: "tests/unit/phase3-settings-batches-wishlist.test.ts" })
    beforeSnapshot = snapshot()

    const row = await prisma.platformSetting.findUnique({
      where: { key: PLATFORM_SETTING_KEYS.batches },
    })
    previousBatches = row?.value ?? null
    if (previousBatches === null) {
      // Give createBatch a list to append to; restored (deleted) in after().
      await setPlatformSetting(PLATFORM_SETTING_KEYS.batches, [])
    }
  })

  after(async () => {
    await prisma.platformSetting
      .deleteMany({ where: { key: `s5-test-${runId}` } })
      .catch(() => {})
    for (const id of createdBatchIds) await deleteBatch(id).catch(() => {})
    if (createdUserIds.length > 0) {
      await prisma.bookWishlistItem
        .deleteMany({ where: { userId: { in: createdUserIds } } })
        .catch(() => {})
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {})
    }
    if (previousBatches !== null) {
      await setPlatformSetting(PLATFORM_SETTING_KEYS.batches, previousBatches).catch(() => {})
    } else {
      await prisma.platformSetting
        .deleteMany({ where: { key: PLATFORM_SETTING_KEYS.batches } })
        .catch(() => {})
    }
  })

  it("platform settings round trip through PlatformSetting", async () => {
    const key = `s5-test-${runId}`
    assert.equal(await getPlatformSetting(key), null)
    await setPlatformSetting(key, { announcement: { enabled: true, text: "S5" } }, "test")
    const stored = await getPlatformSetting<{ announcement: { text: string } }>(key)
    assert.equal(stored?.announcement.text, "S5")
  })

  it("batches are written to the database and read back", async () => {
    const id = `batch-s5-${runId}`
    const batch = await createBatch({ id, title: `S5 batch ${runId}`, slug: `s5-batch-${runId}` })
    createdBatchIds.push(id)
    assert.equal(batch.id, id)

    const row = await prisma.platformSetting.findUnique({
      where: { key: PLATFORM_SETTING_KEYS.batches },
    })
    const stored = row?.value as Array<{ id: string }>
    assert.ok(Array.isArray(stored))
    assert.ok(stored.some((b) => b.id === id), "the new batch must be in the batches setting")

    const readBack = await getBatchById(id)
    assert.equal(readBack?.title, `S5 batch ${runId}`)

    const all = await getAllBatches()
    assert.ok(Array.isArray(all) && all.some((b) => b.id === id))
  })

  it("two parallel wishlist adds from different users keep both rows", async () => {
    const users = await Promise.all(
      [0, 1].map(async (index) => {
        const user = await prisma.user.create({
          data: { email: `s5-wish-${index}-${runId}@aspirantbook.test`, role: "FREE" },
          select: { id: true },
        })
        createdUserIds.push(user.id)
        return user.id
      })
    )

    const bookId = `s5-book-${runId}`
    await Promise.all(
      users.map((userId) =>
        prisma.bookWishlistItem.createMany({ data: [{ userId, bookId }], skipDuplicates: true })
      )
    )

    const rows = await prisma.bookWishlistItem.findMany({ where: { bookId }, select: { userId: true } })
    assert.equal(rows.length, 2, "neither user may lose their wishlist row")

    // Re-adding the same pair is a no-op (unique constraint + skipDuplicates).
    await Promise.all(
      users.map((userId) =>
        prisma.bookWishlistItem.createMany({ data: [{ userId, bookId }], skipDuplicates: true })
      )
    )
    assert.equal(await prisma.bookWishlistItem.count({ where: { bookId } }), 2)
  })

  it("never writes the legacy data/*.json files", () => {
    assert.deepEqual(snapshot(), beforeSnapshot)
  })
})
