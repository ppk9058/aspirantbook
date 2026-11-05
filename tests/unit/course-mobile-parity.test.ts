import test from "node:test"
import assert from "node:assert/strict"
import type { CourseDetailDto } from "../../packages/shared/src/dto/content.dto"

test("extracts bilingual titles and themes properly", () => {
  const mockDto: CourseDetailDto = {
    course: {
      id: "course-123",
      title: "BPSC Mains Demolish Course",
      titleHi: "बीपीएससी मेन्स डिमोलिश कोर्स",
      slug: "bpsc-mains-demolish",
      description: "Comprehensive BPSC prep",
      descriptionHi: "विस्तृत बीपीएससी तैयारी",
      difficulty: "Advanced",
      duration: 120,
      rating: 4.9,
      enrollmentCount: 240,
      isFree: false,
      price: 5499,
      chaptersCount: 9,
      lessonsCount: 41,
      isEnrolled: false,
    },
    chapters: [
      {
        id: "ch-1",
        title: "History",
        titleHi: "इतिहास",
        order: 1,
        unitId: "unit-1",
        lessons: [
          {
            id: "l-1",
            title: "Mauryan Art",
            titleHi: "मौर्य कला",
            isTrial: true,
            order: 1,
            isLocked: false,
            isCompleted: false,
          },
        ],
      },
    ],
    isEnrolled: false,
    units: [
      {
        id: "unit-1",
        title: "History",
        titleHi: "इतिहास",
        tags: ["GS 1"],
        order: 1,
      },
    ],
    theme: {
      navy: "#1B1F4A",
      gold: "#F5C842",
      cream: "#F0EAD9",
      creamDark: "#FAF5E8",
      olive: "#3A3510",
      ink: "#1E1A0F",
    },
    goalLabel: "72nd BPSC Mains",
    goalLabelHi: "72वीं बीपीएससी मेन्स",
    enrollCtaLabel: "Enroll now",
    enrollCtaLabelHi: "अभी जुड़ें",
    enrollHelperText: "You sign in with your mobile or email, then pay.",
    enrollHelperTextHi: "आप अपने मोबाइल या ईमेल से साइन इन करें, फिर भुगतान करें।",
  }

  assert.equal(mockDto.course.title, "BPSC Mains Demolish Course")
  assert.equal(mockDto.course.titleHi, "बीपीएससी मेन्स डिमोलिश कोर्स")
  assert.equal(mockDto.theme?.navy, "#1B1F4A")
  assert.equal(mockDto.theme?.gold, "#F5C842")
  assert.equal(mockDto.goalLabel, "72nd BPSC Mains")
  assert.equal(mockDto.enrollCtaLabelHi, "अभी जुड़ें")
  assert.equal(mockDto.units?.length, 1)
  assert.equal(mockDto.chapters[0].lessons[0].isTrial, true)
  assert.equal(mockDto.chapters[0].lessons[0].isLocked, false)
})
