/**
 * P1 regression: course format resolution, slug aliases, categories/languages,
 * and bilingual fallback must be single-source and behaviour-preserving.
 *
 * Pure logic only: no database access.
 */
import assert from "node:assert/strict"
import { test, describe } from "node:test"

import {
  resolveCourseFormat,
  isVideoCourseForStudio,
  isTextTutorialForCatalog,
  isListedInTutorialsSitemap,
} from "../../lib/courses/format"
import { resolveCourseAlias, COURSE_ALIASES } from "../../lib/courses/slug-aliases"
import { EXAM_CATEGORIES, isKnownExamCategory } from "../../lib/courses/categories"
import { COURSE_LANGUAGES, DEFAULT_COURSE_LANGUAGE, isKnownCourseLanguage } from "../../lib/courses/languages"
import { localized, hindiCompleteness } from "../../lib/i18n/localized"
import { BRAND_NAME } from "../../lib/brand"

const video = (extra: Record<string, any> = {}) => ({
  id: "l1",
  title: "L1",
  type: "VIDEO",
  videoUrl: "https://cdn.example.com/v.mp4",
  ...extra,
})

describe("resolveCourseFormat", () => {
  test("explicit metadata format wins over legacy heuristics", () => {
    assert.equal(
      resolveCourseFormat({ slug: "bpsc-something", price: 100, metadataJson: JSON.stringify({ format: "tutorial" }) }),
      "tutorial"
    )
    assert.equal(
      resolveCourseFormat({ slug: "any-doc", metadataJson: JSON.stringify({ format: "document" }) }),
      "document"
    )
    assert.equal(
      resolveCourseFormat({ slug: "any-video", metadataJson: JSON.stringify({ format: "video" }) }),
      "bundle"
    )
    assert.equal(
      resolveCourseFormat({ slug: "any-coming", metadataJson: JSON.stringify({ meta: { format: "comingSoon" } }) }),
      "comingSoon"
    )
    assert.equal(
      resolveCourseFormat({ slug: "any-coming2", metadataJson: JSON.stringify({ type: "TUTORIAL" }) }),
      "tutorial"
    )
  })

  test("legacy externalId is treated as a tutorial", () => {
    assert.equal(resolveCourseFormat({ slug: "legacy-import", externalId: "ext-1" }), "tutorial")
  })

  test("legacy BPSC slug rules still classify as bundle", () => {
    assert.equal(resolveCourseFormat({ slug: "72nd-bpsc-prelims-current-affairs" }), "bundle")
    assert.equal(resolveCourseFormat({ slug: "some-bpsc-batch" }), "bundle")
  })

  test("paid or video or attachment courses are bundles", () => {
    assert.equal(resolveCourseFormat({ slug: "paid", price: 499 }), "bundle")
    assert.equal(
      resolveCourseFormat({ slug: "vid", chapters: [{ lessons: [video()] }] }),
      "bundle"
    )
    assert.equal(
      resolveCourseFormat({
        slug: "att",
        chapters: [{ lessons: [{ title: "notes", type: "READING", attachmentName: "notes.pdf" }] }],
      }),
      "bundle"
    )
  })

  test("everything else is a document (reading) course", () => {
    assert.equal(resolveCourseFormat({ slug: "plain-reading", chapters: [{ lessons: [{ title: "a", type: "READING" }] }] }), "document")
    assert.equal(resolveCourseFormat({ slug: "bare" }), "document")
  })

  test("malformed metadata never throws", () => {
    assert.equal(resolveCourseFormat({ slug: "broken", metadataJson: "{not-json" }), "document")
  })

  test("UPSC / SSC / Banking / Railways / Defence / Skills are format-agnostic", () => {
    for (const slug of ["upsc-2027", "ssc-cgl", "ibps-po", "rrb-ntpc", "nda-defence", "react-native-skills"]) {
      assert.equal(resolveCourseFormat({ slug, price: 999 }), "bundle")
    }
  })
})

describe("listing predicates mirror the old inline filters", () => {
  const paidVideo = { slug: "paid-video", price: 999, chapters: [{ lessons: [video()] }] }
  const freeReading = { slug: "reading-notes", chapters: [{ lessons: [{ title: "a", type: "READING" }] }] }
  const bpscFlagship = { slug: "72nd-bpsc-prelims-current-affairs" }
  const videoNamed = { slug: "my-video-course", chapters: [{ lessons: [{ title: "a", type: "READING" }] }] }

  test("studio video list keeps paid, video-lesson and legacy BPSC courses", () => {
    assert.equal(isVideoCourseForStudio(paidVideo), true)
    assert.equal(isVideoCourseForStudio(freeReading), false)
    assert.equal(isVideoCourseForStudio(bpscFlagship), true)
  })

  test("tutorial catalog excludes video-ish courses", () => {
    assert.equal(isTextTutorialForCatalog(paidVideo), false)
    assert.equal(isTextTutorialForCatalog(freeReading), true)
    assert.equal(isTextTutorialForCatalog(bpscFlagship), false)
    assert.equal(isTextTutorialForCatalog(videoNamed), false)
  })

  test("tutorial sitemap keeps the old slug-only rule", () => {
    // The old sitemap filter only looked at the slug, so a paid course without
    // "video" in its slug was still listed. Behaviour must not change.
    assert.equal(isListedInTutorialsSitemap({ slug: "paid-course", price: 999 }), true)
    assert.equal(isListedInTutorialsSitemap(bpscFlagship), false)
    assert.equal(isListedInTutorialsSitemap({ slug: "video-tutorial" }), false)
  })
})

describe("slug aliases", () => {
  test("single alias map resolves both legacy and unknown identifiers", () => {
    assert.equal(resolveCourseAlias("bpsc-prelims-current-affairs"), "72nd-bpsc-prelims-current-affairs")
    assert.equal(resolveCourseAlias("half-yearly-678"), "half-yearly-6")
    assert.equal(resolveCourseAlias("class-10-toppers"), "class-10-board-toppers-comprehensive-batch")
    assert.equal(resolveCourseAlias("not-an-alias"), "not-an-alias")
    assert.equal(resolveCourseAlias(""), "")
    assert.equal(Object.keys(COURSE_ALIASES).length, 17)
  })
})

describe("exam categories and languages", () => {
  test("categories cover every exam family the mission names", () => {
    const values = EXAM_CATEGORIES.map((c) => c.value)
    for (const required of ["UPSC", "BPSC", "State PSC", "SSC", "Banking", "Railways", "Defence", "Teaching", "Skills & Tech", "Other"]) {
      assert.ok(values.includes(required), `missing category ${required}`)
    }
    assert.equal(isKnownExamCategory("UPSC"), true)
    assert.equal(isKnownExamCategory("Custom Coaching Track"), false)
  })

  test("languages are ENGLISH, HINDI, HINGLISH with ENGLISH default", () => {
    assert.deepEqual(COURSE_LANGUAGES.map((l) => l.value), ["ENGLISH", "HINDI", "HINGLISH"])
    assert.equal(DEFAULT_COURSE_LANGUAGE, "ENGLISH")
    assert.equal(isKnownCourseLanguage("hinglish"), true)
    assert.equal(isKnownCourseLanguage("Klingon"), false)
  })
})

describe("bilingual fallback", () => {
  const teacher = { name: "Lead Faculty", nameHi: "प्रमुख शिक्षक" }

  test("Hindi is returned when present", () => {
    assert.equal(localized(teacher, "name", "hi"), "प्रमुख शिक्षक")
  })

  test("missing Hindi falls back to English, field by field", () => {
    assert.equal(localized({ name: "Lead Faculty" }, "name", "hi"), "Lead Faculty")
    assert.equal(localized(teacher, "name", "en"), "Lead Faculty")
  })

  test("blank Hindi string also falls back", () => {
    assert.equal(localized({ name: "Lead Faculty", nameHi: "   " }, "name", "hi"), "Lead Faculty")
  })

  test("Hindi completeness counter", () => {
    assert.deepEqual(hindiCompleteness(teacher, ["name"]), { total: 1, missing: 0 })
    assert.deepEqual(
      hindiCompleteness({ ...teacher, role: "Mentor" }, ["name", "role"]),
      { total: 2, missing: 1 }
    )
  })
})

describe("brand config", () => {
  test("brand comes from one config source", () => {
    assert.equal(BRAND_NAME, "AspirantBook")
  })
})
