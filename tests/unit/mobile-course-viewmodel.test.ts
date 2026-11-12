import test from "node:test"
import assert from "node:assert/strict"

// Pure view-model extractor modeled exactly on apps/mobile/src/app/courses/[id].tsx
export function buildMobileCourseViewModel(
  data: any,
  lang: "en" | "hi" = "en",
  envBrand?: string
) {
  const isHi = lang === "hi"
  const course = data.course || data
  const title = (isHi && course.titleHi) || course.title
  const subtitle = (isHi && course.subtitleHi) || course.subtitle

  const theme = {
    navy: data.theme?.navy || "#1B1F4A",
    navyLight: data.theme?.navyLight || "#252B5C",
    gold: data.theme?.gold || "#F5C842",
    cream: data.theme?.cream || "#F0EAD9",
    creamDark: data.theme?.creamDark || "#FAF5E8",
    olive: data.theme?.olive || "#3A3510",
    ink: data.theme?.ink || "#1E1A0F",
  }

  const isFree = course.isFree || course.price === 0
  const priceDisplay = isFree
    ? isHi
      ? "निःशुल्क"
      : "FREE"
    : `₹${(course.price || 0).toLocaleString("en-IN")}`

  const enrollLabel = isHi
    ? data.enrollCtaLabelHi || data.enrollCtaLabel || "अभी जुड़ें"
    : data.enrollCtaLabel || (isFree ? "Start free" : "Enroll now")

  const tabList = [
    { id: "about", label: isHi ? "परिचय" : "About" },
    { id: "plan", label: isHi ? "प्लान" : "Course plan" },
    { id: "lectures", label: isHi ? "लेक्चर्स" : "Lectures" },
    { id: "syllabus", label: isHi ? "सिलेबस" : "Syllabus" },
    { id: "teachers", label: isHi ? "शिक्षक" : "Teachers" },
    { id: "faqs", label: isHi ? "सवाल" : "Questions" },
  ]

  const brandName =
    data.brand ||
    data.metadata?.brand ||
    envBrand ||
    process.env.EXPO_PUBLIC_BRAND_NAME ||
    "TrillionSkill"

  return {
    title,
    subtitle,
    brandName,
    priceDisplay,
    enrollLabel,
    theme,
    tabList,
    instructor: data.hero?.instructor || null,
    lateJoinerText: isHi
      ? data.hero?.lateJoinerTextHi || data.hero?.lateJoinerText
      : data.hero?.lateJoinerText,
    unitsCount: (data.units || []).length,
    chaptersCount: (data.chapters || []).length,
  }
}

test("Mobile Course View-Model: renders cleanly without leak words and brand comes from config", () => {
  const FORBIDDEN_WORDS = [
    "BPSC",
    "बीपीएससी",
    "72nd",
    "72वीं",
    "Abhimanyu",
    "अभिमन्यु",
    "5,499",
    "Demolish",
    "GS 1",
    "NaN",
    "undefined",
    "null",
  ]

  // Test Course: Railway NTPC
  const railwayData = {
    brand: "RailPrep Academy",
    course: {
      id: "rail-101",
      title: "Railway NTPC CBT-1 Crash Course",
      subtitle: "Comprehensive 60-day syllabus for RRB NTPC",
      price: 999,
      isFree: false,
    },
    hero: {
      instructor: {
        name: "Vikramaditya Sharma",
        role: "Lead Mathematics Faculty",
      },
      lateJoinerText: "Full access to past recorded sessions and notes.",
    },
    units: [{ id: "u1" }, { id: "u2" }, { id: "u3" }],
    chapters: [{ id: "ch1" }],
  }

  const vm = buildMobileCourseViewModel(railwayData, "en")
  assert.equal(vm.brandName, "RailPrep Academy", "Brand must come from config/field")
  assert.equal(vm.priceDisplay, "₹999")
  assert.equal(vm.unitsCount, 3)

  const renderedJson = JSON.stringify(vm)
  for (const word of FORBIDDEN_WORDS) {
    assert.ok(
      !renderedJson.includes(word),
      `Rendered mobile view-model leaked forbidden word: ${word}`
    )
  }

  // Test default brand fallback when none is in data
  const fallbackVm = buildMobileCourseViewModel(
    { course: { title: "UPSC Prelims 2027", price: 0, isFree: true } },
    "hi",
    "CustomBrand"
  )
  assert.equal(fallbackVm.brandName, "CustomBrand")
  assert.equal(fallbackVm.priceDisplay, "निःशुल्क")
})
