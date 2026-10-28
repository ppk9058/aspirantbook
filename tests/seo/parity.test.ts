import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildSeoModel, SeoQuestionInput } from "../../lib/modules/content-engine/seo-model"
import { adaptContentEngineSeo } from "../../lib/seo/adapters/content-engine"

describe("Content Engine SEO Adapter Parity", () => {
  const sampleQuestion: SeoQuestionInput = {
    id: "q-12345",
    shortId: "f41246fb",
    slug: "f41246fb-upsc-cse-2023-q1-what-was-the-ancient-port-city-of-indus",
    q: "What was the ancient port city of the Indus Valley Civilization?",
    o: ["Harappa", "Mohenjo-daro", "Lothal", "Kalibangan"],
    a: 2,
    exp: "Lothal was one of the southernmost cities of the ancient Indus Valley Civilization, located in modern-day Gujarat.",
    sub: "Ancient History",
    top: "Indus Valley Civilization",
    exam: "UPSC CSE",
    year: "2023",
    src: "UPSC CSE Prelims 2023",
    isPublished: true,
    hindiTwin: {
      q: "सिंधु घाटी सभ्यता का प्राचीन बंदरगाह शहर कौन सा था?",
      o: ["हड़प्पा", "मोहनजोदड़ो", "लोथल", "कालीबंगन"],
      exp: "लोथल प्राचीन सिंधु घाटी सभ्यता के सबसे दक्षिणी शहरों में से एक था।",
      top: "सिंधु घाटी सभ्यता",
      isReviewed: true,
    },
  }

  const base = "https://aspirantbook.com"

  it("produces byte-identical output for English version", () => {
    const original = buildSeoModel(sampleQuestion, "en", base)
    const adapted = adaptContentEngineSeo(sampleQuestion, "en", base)

    assert.equal(JSON.stringify(adapted), JSON.stringify(original))
    assert.equal(adapted.title, original.title)
    assert.ok(adapted.title.includes("UPSC CSE 2023 MCQ"))
    assert.equal(adapted.description, original.description)
    assert.equal(adapted.canonicalUrl, original.canonicalUrl)
    assert.equal(adapted.robots, original.robots)
    assert.equal(adapted.jsonLdScriptString, original.jsonLdScriptString)
  })

  it("produces byte-identical output for Hindi reviewed version", () => {
    const original = buildSeoModel(sampleQuestion, "hi", base)
    const adapted = adaptContentEngineSeo(sampleQuestion, "hi", base)

    assert.equal(JSON.stringify(adapted), JSON.stringify(original))
    assert.equal(adapted.title, original.title)
    assert.equal(adapted.description, original.description)
    assert.equal(adapted.canonicalUrl, original.canonicalUrl)
    assert.equal(adapted.robots, original.robots)
    assert.equal(adapted.jsonLdScriptString, original.jsonLdScriptString)
  })

  it("produces byte-identical output for Hindi unreviewed version (noindex)", () => {
    const unreviewedQ = {
      ...sampleQuestion,
      hindiTwin: {
        ...sampleQuestion.hindiTwin!,
        isReviewed: false,
      },
    }
    const original = buildSeoModel(unreviewedQ, "hi", base)
    const adapted = adaptContentEngineSeo(unreviewedQ, "hi", base)

    assert.equal(JSON.stringify(adapted), JSON.stringify(original))
    assert.equal(adapted.robots, "noindex, follow")
    assert.equal(adapted.jsonLdScriptString, original.jsonLdScriptString)
  })
})
