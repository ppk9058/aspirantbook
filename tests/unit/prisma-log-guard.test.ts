import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { getPrismaLogConfig } from "@/lib/prisma"

describe("PRISMA_LOG_QUERIES Production Guard (O10)", () => {
  it("strictly disables query logging in production even if PRISMA_LOG_QUERIES=1", () => {
    const config = getPrismaLogConfig("production", "1")
    assert.deepEqual(config, [], "Must return empty log array in production")
    assert.equal((config as readonly string[]).includes("query"), false, "Must never include 'query' in production")
  })

  it("strictly disables query logging in production when PRISMA_LOG_QUERIES is unset or 0", () => {
    const configUnset = getPrismaLogConfig("production", undefined)
    assert.deepEqual(configUnset, [])
    const configZero = getPrismaLogConfig("production", "0")
    assert.deepEqual(configZero, [])
  })

  it("allows query logging in development or test when PRISMA_LOG_QUERIES=1", () => {
    const devConfig = getPrismaLogConfig("development", "1")
    assert.deepEqual(devConfig, ["query", "warn", "error"])

    const testConfig = getPrismaLogConfig("test", "1")
    assert.deepEqual(testConfig, ["query", "warn", "error"])
  })

  it("defaults to no query logging in development or test when PRISMA_LOG_QUERIES is unset or 0", () => {
    const devDefault = getPrismaLogConfig("development", undefined)
    assert.deepEqual(devDefault, [])

    const testDefault = getPrismaLogConfig("test", "0")
    assert.deepEqual(testDefault, [])
  })
})
