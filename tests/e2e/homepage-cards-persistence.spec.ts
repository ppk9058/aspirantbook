import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

import { test, expect } from "@playwright/test"
import { createActor, loginAs, newNonce, prisma } from "./test-series-e2e-helpers"
import { PLATFORM_SETTING_KEYS } from "@/lib/platform-settings"

/**
 * B-006 regression: homepage card configuration must be persisted in the
 * database. Before the fix the route wrote data/homepage-cards.json, so a
 * second request served by another instance (or after a redeploy) saw stale or
 * empty cards while the file on disk changed.
 */
test.describe("B-006: homepage cards persist in PlatformSetting", () => {
  test.setTimeout(120_000)

  const CARDS_FILE = path.join(process.cwd(), "data", "homepage-cards.json")
  let adminEmail = ""
  let adminId = ""
  let previousValue: unknown = null

  const fixture = {
    bpsc: {
      sectionTitle: `B-006 fixture ${Date.now()}`,
      batches: [
        {
          id: "b006-fixture-card",
          slug: "b006-fixture-card",
          title: "B-006 fixture card",
          classTag: "Course",
          price: "₹1",
          image: "/batch-blue.svg",
          buttonLink: "/courses/b006-fixture-card",
          isPrimaryAction: true,
        },
      ],
    },
  }

  test.beforeAll(async () => {
    const nonce = newNonce()
    const admin = await createActor(nonce, "ADMIN", "b006-admin")
    adminEmail = admin.email
    adminId = admin.id

    const row = await prisma.platformSetting.findUnique({ where: { key: PLATFORM_SETTING_KEYS.homepageCards } })
    previousValue = row?.value ?? null
  })

  test.afterAll(async () => {
    if (previousValue === null) {
      await prisma.platformSetting.deleteMany({ where: { key: PLATFORM_SETTING_KEYS.homepageCards } }).catch(() => {})
    } else {
      await prisma.platformSetting
        .upsert({
          where: { key: PLATFORM_SETTING_KEYS.homepageCards },
          create: { key: PLATFORM_SETTING_KEYS.homepageCards, value: previousValue as any },
          update: { value: previousValue as any },
        })
        .catch(() => {})
    }
    if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => {})
  })

  test("POST stores the cards in the DB and leaves the JSON file untouched", async ({ page }) => {
    const fileBefore = fs.existsSync(CARDS_FILE)
      ? crypto.createHash("sha256").update(fs.readFileSync(CARDS_FILE)).digest("hex")
      : "(missing)"

    await loginAs(page, adminEmail)

    const post = await page.request.post("/api/admin/homepage-cards", { data: { cards: fixture } })
    expect(post.status()).toBe(200)
    expect(await post.json()).toMatchObject({ success: true })

    // A second, independent request must see the new value.
    const get = await page.request.get("/api/admin/homepage-cards")
    expect(get.status()).toBe(200)
    const payload = await get.json()
    expect(payload.cards).toEqual(fixture)

    const row = await prisma.platformSetting.findUnique({ where: { key: PLATFORM_SETTING_KEYS.homepageCards } })
    expect(row).not.toBeNull()
    expect(row?.value).toEqual(fixture)
    expect(row?.updatedBy).toBe(adminId)

    const fileAfter = fs.existsSync(CARDS_FILE)
      ? crypto.createHash("sha256").update(fs.readFileSync(CARDS_FILE)).digest("hex")
      : "(missing)"
    expect(fileAfter).toBe(fileBefore)
  })
})
