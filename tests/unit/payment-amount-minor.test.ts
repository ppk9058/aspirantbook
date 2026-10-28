import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"

import { prisma } from "@/lib/prisma"
import { toMinorUnits, fromMinorUnits, currencyExponent } from "@/lib/money"

/**
 * B7: money was stored only as a Float.
 *
 * Payment.amount is a Float, so `amount: 499.1` is not an exact value and every
 * sum or round-trip can drift. The additive `amountMinor` column holds the same
 * amount in the currency's smallest unit; this suite pins:
 *  1. the conversion helper (including currencies without decimals);
 *  2. that every production `payment.create`/`payment.upsert` dual-writes it,
 *     and every COMPLETED update records the captured amount;
 *  3. that amount and amountMinor agree on a real row;
 *  4. that Subscription.providerId is indexed (unique), which the webhook
 *     lookups rely on.
 */

const ROOT = process.cwd()
const SOURCE_DIRS = ["lib", "app"]

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".next-test") continue
      yield* walk(full)
    } else if (entry.isFile() && full.endsWith(".ts") && !full.endsWith(".d.ts")) {
      yield full
    }
  }
}

/** Returns the text of the call whose `(` starts at `openIndex`, balanced. */
function callBlock(source: string, openIndex: number): string {
  let depth = 0
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i]
    if (ch === "(" || ch === "{" || ch === "[") depth++
    else if (ch === ")" || ch === "}" || ch === "]") {
      depth--
      if (depth === 0) return source.slice(openIndex, i + 1)
    }
  }
  return source.slice(openIndex)
}

function findCalls(source: string, needle: string): string[] {
  const blocks: string[] = []
  let index = source.indexOf(needle)
  while (index !== -1) {
    // The needle ends with "(", which is itself the opening paren.
    blocks.push(callBlock(source, index + needle.length - 1))
    index = source.indexOf(needle, index + needle.length)
  }
  return blocks
}

describe("B7 money is dual-written in minor units", () => {
  const paymentIds: string[] = []
  let userId = ""

  before(async () => {
    await prisma.$connect()
    const user = await prisma.user.create({
      data: { email: `b7-money-${Date.now()}@aspirantbook.test`, role: "FREE" },
      select: { id: true },
    })
    userId = user.id
  })

  after(async () => {
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it("converts major units to exact minor units", () => {
    assert.equal(toMinorUnits(499, "INR"), 49900)
    assert.equal(toMinorUnits(499.5, "INR"), 49950)
    assert.equal(toMinorUnits(4999, "USD"), 499900)
    // 0.1 + 0.2 must not become 30.000000000000004
    assert.equal(toMinorUnits(0.1 + 0.2), 30)
    // currencies without a minor unit
    assert.equal(toMinorUnits(1000, "JPY"), 1000)
    assert.equal(currencyExponent("JPY"), 0)
    assert.equal(currencyExponent("inr"), 2)
    // unknown currencies fall back to 2 decimals
    assert.equal(currencyExponent("XYZ"), 2)
    assert.equal(fromMinorUnits(49950, "INR"), 499.5)
    assert.throws(() => toMinorUnits(Number.NaN), /non-finite/)
  })

  it("dual-writes amountMinor on every production payment write", async () => {
    const violations: string[] = []

    for (const dir of SOURCE_DIRS) {
      for await (const file of walk(path.join(ROOT, dir))) {
        const source = await fs.readFile(file, "utf-8")
        const relative = path.relative(ROOT, file)

        for (const needle of [".payment.create(", ".payment.upsert("]) {
          for (const block of findCalls(source, needle)) {
            if (!block.includes("amountMinor")) {
              violations.push(`${relative}: ${needle.slice(1, -1)} without amountMinor`)
            }
          }
        }

        // A payment marked COMPLETED records the captured amount as well.
        for (const block of findCalls(source, ".payment.update(")) {
          if (block.includes('status: "COMPLETED"') && !block.includes("amountMinor")) {
            violations.push(`${relative}: COMPLETED payment.update without amountMinor`)
          }
        }
      }
    }

    assert.deepEqual(violations, [], `money writes missing minor units:\n${violations.join("\n")}`)
  })

  it("stores amount and amountMinor consistently on a real row", async () => {
    const paid = 1234.5
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: paid,
        amountMinor: toMinorUnits(paid, "INR"),
        currency: "INR",
        status: "COMPLETED",
        externalId: `b7-${Date.now()}`,
      },
      select: { id: true },
    })
    paymentIds.push(payment.id)

    const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
    assert.equal(stored.amountMinor, 123450)
    assert.equal(fromMinorUnits(stored.amountMinor!, stored.currency), stored.amount)
  })

  it("indexes Subscription.providerId for the webhook lookups", async () => {
    const schema = await fs.readFile(path.join(ROOT, "prisma/schema.prisma"), "utf-8")
    const subscription = schema.slice(schema.indexOf("model Subscription {"), schema.indexOf("model StripeWebhookEvent"))
    assert.match(
      subscription,
      /@@(unique|index)\(\[providerId\]\)/,
      "Subscription.providerId must be indexed (webhooks look subscriptions up by provider id)"
    )
  })
})
