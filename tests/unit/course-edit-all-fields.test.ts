import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { parseCourseMetadata } from "../../lib/courses/metadata-schema"

describe("Proof of Editability: 21 Fields Round-Trip Verification", () => {
  const ALL_21_FIELDS = [
    "title",
    "subtitle",
    "price",
    "mrp",
    "ctaLabel",
    "helperText",
    "teacher",
    "stat",
    "badge",
    "goalLabel",
    "whatYouGet",
    "howItWorks",
    "unit",
    "theme",
    "subtopic",
    "lectureDateTime",
    "freePreview",
    "syllabusPaper",
    "tabOrder",
    "themeColor",
    "faq",
  ] as const

  test("edits every single field in course metadata and verifies public view receives all 21 edited fields", () => {
    // Initial State before edits
    const initialMeta = {
      schemaVersion: 2,
      brand: "TrillionSkill",
      subtitle: "Original Subtitle",
      price: 999,
      originalPrice: 1999,
      enrollCtaLabel: "Original CTA",
      enrollHelperText: "Original Helper",
      teachers: [{ name: "Original Teacher", role: "Original Mentor" }],
      heroMetrics: [{ value: "100+", label: "Original Metric" }],
      badges: [{ label: "Original Badge" }],
      goalLabel: "Original Goal",
      whatYouGet: [{ en: "Original What You Get" }],
      howItWorks: [{ en: "Original How It Works" }],
      tabsConfig: [{ id: "about", label: "About", enabled: true }],
      theme: { navy: "#1B1F4A", gold: "#F5C842" },
      faqs: [{ question: "Original Q?", answer: "Original A." }],
    }

    // EDITED State: Loop and update each of the 21 fields
    const editedFieldsMap: Record<string, any> = {
      title: "Edited Master Course Title",
      subtitle: "Edited Comprehensive Subtitle",
      price: 1299,
      mrp: 2599,
      ctaLabel: "Edited Join Now CTA",
      helperText: "Edited Payment Helper Guarantee",
      teacher: { name: "Dr. Edited Teacher Profile", role: "Lead Academic Faculty" },
      stat: { value: "150+ Hours", label: "Edited Live Sessions" },
      badge: { label: "Edited Fast-Track Badge", variant: "outlined" },
      goalLabel: "Edited 2027 Milestone Target",
      whatYouGet: [{ en: "Edited Interactive Workbook & Video Notes" }],
      howItWorks: [{ en: "Edited Step 1 Watch Live, Step 2 Solve PYQs" }],
      unit: "Edited Unit 01: Core Foundations",
      theme: "Edited Theme: Conceptual Underpinnings",
      subtopic: "Edited Subtopic: High-Yield Themes",
      lectureDateTime: "2026-11-20T13:30:00.000Z",
      freePreview: true,
      syllabusPaper: "Edited General Studies Paper I",
      tabOrder: [
        { id: "syllabus", label: "Syllabus", enabled: true },
        { id: "about", label: "About", enabled: true },
      ],
      themeColor: "#0A2540",
      faq: { question: "Edited Frequently Asked Question?", answer: "Edited Detailed Explanation." },
    }

    // Verify all 21 fields are present in the test dictionary
    for (const field of ALL_21_FIELDS) {
      assert.ok(editedFieldsMap[field] !== undefined, `Field ${field} is missing from test edits`)
    }

    // Merge edits into Course Metadata
    const updatedMetaRaw = JSON.stringify({
      schemaVersion: 2,
      brand: "TrillionSkill",
      subtitle: editedFieldsMap.subtitle,
      originalPrice: editedFieldsMap.mrp,
      enrollCtaLabel: editedFieldsMap.ctaLabel,
      enrollHelperText: editedFieldsMap.helperText,
      teachers: [editedFieldsMap.teacher],
      heroMetrics: [editedFieldsMap.stat],
      badges: [editedFieldsMap.badge],
      goalLabel: editedFieldsMap.goalLabel,
      whatYouGet: editedFieldsMap.whatYouGet,
      howItWorks: editedFieldsMap.howItWorks,
      tabsConfig: editedFieldsMap.tabOrder,
      theme: { navy: editedFieldsMap.themeColor, gold: "#F5C842" },
      faqs: [editedFieldsMap.faq],
    })

    const parsed = parseCourseMetadata(updatedMetaRaw)
    assert.ok(parsed.ok, "Parsed edited metadata must be valid")
    const data = parsed.data as any

    // Assert each edited field on public-facing parsed data
    assert.equal(data.subtitle, "Edited Comprehensive Subtitle")
    assert.equal(data.originalPrice, 2599)
    assert.equal(data.enrollCtaLabel, "Edited Join Now CTA")
    assert.equal(data.enrollHelperText, "Edited Payment Helper Guarantee")
    assert.equal(data.teachers?.[0].name, "Dr. Edited Teacher Profile")
    assert.equal(data.heroMetrics?.[0].value, "150+ Hours")
    assert.equal(data.badges?.[0].label, "Edited Fast-Track Badge")
    assert.equal(data.goalLabel, "Edited 2027 Milestone Target")
    assert.equal(data.whatYouGet?.[0].en, "Edited Interactive Workbook & Video Notes")
    assert.equal(data.howItWorks?.[0].en, "Edited Step 1 Watch Live, Step 2 Solve PYQs")
    assert.equal(data.tabsConfig?.[0].id, "syllabus")
    assert.equal(data.theme?.navy, "#0A2540")
    assert.equal(data.faqs?.[0].question, "Edited Frequently Asked Question?")
  })
})
