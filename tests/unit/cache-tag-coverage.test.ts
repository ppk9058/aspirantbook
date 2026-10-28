import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import { CACHE_TAGS } from "@/lib/cache-tags"

/**
 * B-015 / B-019 regression: every `unstable_cache` read must use a registered
 * tag, and every registered tag must be invalidated by at least one mutation.
 *
 * Before the fix, `tracks`, `tutorials`, `pyqs`, `current-affairs` and `coupons`
 * were cached with tags that no mutation route ever revalidated, so admin edits
 * stayed invisible until the TTL expired.
 */

const ROOT = process.cwd()
const SCAN_DIRS = ["app", "lib"]
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) out.push(full)
  }
  return out
}

const files = SCAN_DIRS.flatMap((dir) => {
  const absolute = path.join(ROOT, dir)
  return fs.existsSync(absolute) ? walk(absolute) : []
}).map((file) => ({ file, source: fs.readFileSync(file, "utf8") }))

/** Tags declared by `unstable_cache(..., { tags: [...] })` call sites. */
function cachedTags(source: string): string[] {
  const tags: string[] = []
  for (const match of source.matchAll(/unstable_cache\(/g)) {
    const tail = source.slice(match.index ?? 0, (match.index ?? 0) + 1500)
    const tagsMatch = tail.match(/tags:\s*\[([^\]]*)\]/)
    if (!tagsMatch) continue
    for (const quoted of tagsMatch[1].matchAll(/"([^"]+)"/g)) tags.push(quoted[1])
  }
  return tags
}

const readTags = new Map<string, string[]>()
for (const { file, source } of files) {
  for (const tag of cachedTags(source)) {
    const list = readTags.get(tag) ?? []
    list.push(path.relative(ROOT, file))
    readTags.set(tag, list)
  }
}

/** Files that invalidate a tag, either by literal or through the registry. */
function invalidators(tag: string): string[] {
  const registryKey = Object.entries(CACHE_TAGS).find(([, value]) => value === tag)?.[0]
  const patterns = [
    new RegExp(`revalidateTag\\(\\s*["']${tag}["']`),
    new RegExp(`safeRevalidateTag\\(\\s*["']${tag}["']`),
    new RegExp(`safeRevalidateTags\\([^)]*CACHE_TAGS\\.${registryKey ?? "__none__"}`),
  ]
  // B10 introduced one shared invalidator for the public content-engine pages:
  // it revalidates the tag and the route list together, so a call to it is a
  // call to revalidate this tag. tests/unit/cache-invalidation.test.ts asserts
  // the exact tag and routes it emits.
  if (tag === CACHE_TAGS.contentEngine) {
    patterns.push(new RegExp(`revalidateContentEngineRoutes\\(`))
  }
  return files
    .filter(({ source }) => patterns.some((pattern) => pattern.test(source)))
    .map(({ file }) => path.relative(ROOT, file))
}

describe("Cache tags are declared and invalidated (B-015, B-019)", () => {
  it("finds the unstable_cache reads it is meant to guard", () => {
    assert.ok(readTags.size >= 6, `expected several cached tags, found ${readTags.size}`)
  })

  it("uses only registered cache tags", () => {
    const registered = new Set<string>(Object.values(CACHE_TAGS))
    const unknown = [...readTags.keys()].filter((tag) => !registered.has(tag))
    assert.deepEqual(unknown, [], `unregistered cache tags: ${unknown.join(", ")}`)
  })

  it("invalidates every cached tag from at least one mutation path", () => {
    const missing = [...readTags.entries()]
      .filter(([tag]) => invalidators(tag).length === 0)
      .map(([tag, readers]) => `${tag} (read by ${readers.join(", ")})`)

    assert.deepEqual(missing, [], `cached tags with no revalidation: ${missing.join("; ")}`)
  })

  it("keeps batches on the shared tagged cache instead of a module-level TTL cache", () => {
    const source = fs.readFileSync(path.join(ROOT, "lib/batches-service.ts"), "utf8")

    assert.doesNotMatch(source, /CACHE_TTL_MS/, "the 60s in-memory TTL cache must be gone")
    assert.doesNotMatch(source, /let cachedBatches/, "no module-level batches cache")
    assert.match(source, /unstable_cache\(/, "reads must go through unstable_cache")
    // B1/B-019 route every batches write through `mutateBatches`, which
    // invalidates the tag with the shared `safeRevalidateTags` helper.
    assert.match(source, /(?:safe)?revalidateTags?\(/i, "writes must invalidate the tag")
  })
})
