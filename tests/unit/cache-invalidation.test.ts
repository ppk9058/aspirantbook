import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"

import {
  revalidateContentEngineRoutes,
  CONTENT_ENGINE_PUBLIC_ROUTES,
  CONTENT_ENGINE_CACHE_TAG,
} from "@/lib/modules/content-engine/db-service"

/**
 * B10: cache invalidation gaps.
 *
 * Reads go through Next's tagged data cache (unstable_cache), so a mutation that
 * only calls revalidatePath leaves the tagged entry serving stale content:
 *  - editing or deleting a published content-engine question never dropped the
 *    1h public copy, and re-categorising all questions never dropped it either;
 *  - course/chapter/lesson server actions never invalidated the "courses" tag
 *    that feeds the video-course list and the course promo badges.
 *
 * These tests pin the invalidation contract: the exact tag/route list for the
 * content engine (behavioural, via an injected invalidator) and the call sites
 * that must keep invalidating (source contract).
 */

const ROOT = process.cwd()

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".next-test") continue
      yield* walk(full)
    } else if (entry.isFile() && full.endsWith(".ts")) {
      yield full
    }
  }
}

function block(source: string, openIndex: number): string {
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

describe("B10 cache invalidation", () => {
  it("invalidates the content-engine tag and every public route", () => {
    const tags: string[] = []
    const paths: Array<{ path: string; type?: string }> = []

    revalidateContentEngineRoutes({
      tag: (tag) => tags.push(tag),
      path: (p, type) => paths.push({ path: p, type }),
    })

    assert.deepEqual(tags, [CONTENT_ENGINE_CACHE_TAG])
    assert.equal(tags[0], "content-engine")

    const invalidated: string[] = paths.map((p) => String(p.path)).sort()
    assert.deepEqual(invalidated, [...CONTENT_ENGINE_PUBLIC_ROUTES].sort())

    // Every page route is invalidated as a page; the root sitemap is a path.
    for (const entry of paths) {
      if (entry.path === "/sitemap.xml") assert.equal(entry.type, undefined)
      else assert.equal(entry.type, "page", `${entry.path} must be invalidated as a page`)
    }

    // Both languages and the detail route must be covered.
    for (const route of [
      "/question-answer",
      "/hi/question-answer",
      "/question-answer/[exam]/[subject]/[slug]",
      "/hi/question-answer/[exam]/[subject]/[slug]",
    ]) {
      assert.equal(invalidated.some((entry) => entry === route), true, `${route} must be invalidated`)
    }
  })

  it("invalidates on every content-engine question mutation path", async () => {
    const questionsRoute = await fs.readFile(
      path.join(ROOT, "app/api/admin/content-engine/questions/route.ts"),
      "utf-8"
    )
    const dbService = await fs.readFile(
      path.join(ROOT, "lib/modules/content-engine/db-service.ts"),
      "utf-8"
    )

    // PATCH (edit) and DELETE each have to invalidate.
    const patch = questionsRoute.slice(questionsRoute.indexOf("export async function PATCH"))
    const del = questionsRoute.slice(questionsRoute.indexOf("export async function DELETE"))
    assert.match(patch, /revalidateContentEngineRoutes\(\)/)
    assert.match(del, /revalidateContentEngineRoutes\(\)/)

    // Publish, unpublish, bulk assign and re-categorise all call the helper.
    const helperCalls = (dbService.match(/revalidateContentEngineRoutes\(\)/g) || []).length
    assert.equal(helperCalls >= 5, true, `expected >= 5 invalidation sites, found ${helperCalls}`)

    const recategorise = dbService.slice(
      dbService.indexOf("export async function reCategoriseAllQuestions")
    )
    assert.match(recategorise, /revalidateContentEngineRoutes\(\)/)
  })

  it("invalidates the courses tag from every course content server action", async () => {
    for (const file of [
      "lib/actions/admin/courses.ts",
      "lib/actions/admin/publishing.ts",
      "lib/actions/admin/chapters.ts",
      "lib/actions/admin/lessons.ts",
    ]) {
      const source = await fs.readFile(path.join(ROOT, file), "utf-8")
      assert.match(
        source,
        /safeRevalidateTags\(CACHE_TAGS\.courses\)/,
        `${file} must invalidate the "courses" data-cache tag`
      )
    }
  })

  it("keeps every cached read on a registered cache tag", async () => {
    const registry = await fs.readFile(path.join(ROOT, "lib/cache-tags.ts"), "utf-8")
    const registered = new Set(
      [...registry.matchAll(/^\s{2}\w+:\s*"([^"]+)",?$/gm)].map((m) => m[1])
    )
    assert.equal(registered.size >= 9, true, `cache tag registry looks empty: ${[...registered]}`)

    const unknown: string[] = []
    for (const dir of ["lib", "app"]) {
      for await (const file of walk(path.join(ROOT, dir))) {
        const source = await fs.readFile(file, "utf-8")
        let index = source.indexOf("unstable_cache(")
        while (index !== -1) {
          const call = block(source, index + "unstable_cache".length)
          const tagsBlock = call.match(/tags:\s*\[([^\]]*)\]/)
          if (tagsBlock) {
            for (const tag of [...tagsBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])) {
              if (!registered.has(tag)) {
                unknown.push(`${path.relative(ROOT, file)}: "${tag}"`)
              }
            }
          }
          index = source.indexOf("unstable_cache(", index + 1)
        }
      }
    }

    assert.deepEqual(unknown, [], `cached reads use tags missing from CACHE_TAGS:\n${unknown.join("\n")}`)
  })
})
