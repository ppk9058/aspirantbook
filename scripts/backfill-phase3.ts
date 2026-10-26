/**
 * Phase 3 backfill: data/*.json -> Postgres.
 *
 * Reads the JSON stores that the app used before B-005/B-006/S5 and upserts them
 * into Book / BookOrder / BookCoupon / PlatformSetting. Idempotent: running it
 * twice produces no duplicates. Never deletes anything, never writes to disk.
 *
 * Test DB only: the shared guard aborts unless DATABASE_URL is
 * 127.0.0.1:54329/trillionskill_test and APP_ENV=test.
 *
 * Usage:
 *   set -a; source .env.test; set +a
 *   APP_ENV=test DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="${TEST_DIRECT_URL:-$TEST_DATABASE_URL}" \
 *     npx tsx scripts/backfill-phase3.ts [--dry-run] [--only=homepage-cards,books,orders,coupons]
 */
import fs from "node:fs"
import path from "node:path"

import { assertTestDatabase } from "../lib/test-db-guard"
import { prisma } from "../lib/prisma"
import { normalizeBook } from "../lib/books/bookService"
import { PLATFORM_SETTING_KEYS } from "../lib/platform-settings"

const DATA_DIR = path.join(process.cwd(), "data")
const BOOKS_FILE = path.join(DATA_DIR, "books.json")
const ORDERS_FILE = path.join(DATA_DIR, "book-orders.json")
const COUPONS_FILE = path.join(DATA_DIR, "book-coupons.json")
const HOMEPAGE_CARDS_FILE = path.join(DATA_DIR, "homepage-cards.json")

const ALL_SECTIONS = ["homepage-cards", "books", "orders", "coupons"] as const
type Section = (typeof ALL_SECTIONS)[number]

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const onlyArg = args.find((arg) => arg.startsWith("--only="))
const sections: Section[] = onlyArg
  ? (onlyArg.replace("--only=", "").split(",").filter(Boolean) as Section[])
  : [...ALL_SECTIONS]

for (const section of sections) {
  if (!ALL_SECTIONS.includes(section)) {
    console.error(`Unknown section "${section}". Known: ${ALL_SECTIONS.join(", ")}`)
    process.exit(1)
  }
}

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) {
    console.log(`[backfill] ${path.basename(file)} not found, skipping`)
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T
  } catch (error) {
    console.error(`[backfill] ${path.basename(file)} is not valid JSON:`, error)
    return null
  }
}

async function backfillHomepageCards() {
  const cards = readJson<Record<string, unknown>>(HOMEPAGE_CARDS_FILE)
  if (!cards) return { section: "homepage-cards", written: 0 }

  if (dryRun) {
    console.log(`[backfill] dry-run: would upsert PlatformSetting "${PLATFORM_SETTING_KEYS.homepageCards}"`)
    return { section: "homepage-cards", written: 1 }
  }

  await prisma.platformSetting.upsert({
    where: { key: PLATFORM_SETTING_KEYS.homepageCards },
    create: { key: PLATFORM_SETTING_KEYS.homepageCards, value: cards as any },
    update: { value: cards as any },
  })
  console.log(`[backfill] homepage-cards: 1 setting upserted`)
  return { section: "homepage-cards", written: 1 }
}

async function backfillBooks() {
  const raw = readJson<any[]>(BOOKS_FILE)
  if (!raw) return { section: "books", written: 0 }

  let written = 0
  for (const entry of raw) {
    const book = normalizeBook(entry)
    const data = {
      id: book.id,
      slug: book.slug,
      title: book.title,
      status: book.status || "published",
      price: book.price,
      salesCount: book.salesCount || 0,
      data: book as any,
    }
    if (dryRun) {
      written += 1
      continue
    }
    // `slug` is unique too: if a row with this slug exists under another id,
    // update that row instead of creating a duplicate.
    const bySlug = await prisma.book.findUnique({ where: { slug: book.slug } })
    if (bySlug && bySlug.id !== book.id) {
      await prisma.book.update({ where: { id: bySlug.id }, data })
    } else {
      await prisma.book.upsert({
        where: { id: book.id },
        create: data,
        update: data,
      })
    }
    written += 1
  }
  console.log(`[backfill] books: ${written} ${dryRun ? "would be " : ""}upserted`)
  return { section: "books", written }
}

async function backfillOrders() {
  const raw = readJson<any[]>(ORDERS_FILE)
  if (!raw) return { section: "orders", written: 0 }

  let written = 0
  for (const order of raw) {
    const data = {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId ?? null,
      userEmail: order.userEmail ?? null,
      status: order.status || "pending_payment",
      finalTotal: Number(order.finalTotal) || 0,
      razorpayOrderId: order.razorpayOrderId ?? null,
      razorpayPaymentId: order.razorpayPaymentId ?? null,
      data: order as any,
    }
    if (dryRun) {
      written += 1
      continue
    }
    const byNumber = await prisma.bookOrder.findUnique({ where: { orderNumber: order.orderNumber } })
    if (byNumber && byNumber.id !== order.id) {
      await prisma.bookOrder.update({ where: { id: byNumber.id }, data })
    } else {
      await prisma.bookOrder.upsert({ where: { id: order.id }, create: data, update: data })
    }
    written += 1
  }
  console.log(`[backfill] orders: ${written} ${dryRun ? "would be " : ""}upserted`)
  return { section: "orders", written }
}

async function backfillCoupons() {
  const raw = readJson<any[]>(COUPONS_FILE)
  if (!raw) return { section: "coupons", written: 0 }

  let written = 0
  for (const coupon of raw) {
    const code = String(coupon.code || "").toUpperCase().trim()
    if (!code) continue
    const data = {
      code,
      title: coupon.title ?? "",
      discountType: coupon.discountType ?? "PERCENT",
      value: Number(coupon.value) || 0,
      minCartValue: Number(coupon.minCartValue) || 0,
      usageLimit: typeof coupon.usageLimit === "number" ? coupon.usageLimit : null,
      redemptions: Number(coupon.redemptions) || 0,
      isActive: coupon.isActive !== false,
      data: { ...coupon, code } as any,
    }
    if (dryRun) {
      written += 1
      continue
    }
    await prisma.bookCoupon.upsert({ where: { code }, create: data, update: data })
    written += 1
  }
  console.log(`[backfill] coupons: ${written} ${dryRun ? "would be " : ""}upserted`)
  return { section: "coupons", written }
}

async function main() {
  assertTestDatabase({ context: "scripts/backfill-phase3.ts" })

  const results: Array<{ section: string; written: number }> = []
  if (sections.includes("homepage-cards")) results.push(await backfillHomepageCards())
  if (sections.includes("books")) results.push(await backfillBooks())
  if (sections.includes("orders")) results.push(await backfillOrders())
  if (sections.includes("coupons")) results.push(await backfillCoupons())

  console.log(`[backfill] done${dryRun ? " (dry run, nothing written)" : ""}:`, JSON.stringify(results))
}

main()
  .catch((error) => {
    console.error("[backfill] failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
