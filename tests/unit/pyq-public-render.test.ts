import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { escapeHtml, inlineHtml, publicSolution } from "@/lib/pyq/render"
import { parsePagination, pageHref, pageWindow, PER_PAGE_OPTIONS } from "@/lib/pyq/pagination"
import { scoreSeries, keywords } from "@/lib/pyq/series-match"

describe("render: escaping + bold-only inline markers", () => {
  test("escapeHtml neutralises script injection", () => {
    assert.equal(
      escapeHtml('<script>alert("x")</script>'),
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    )
  })

  test("escapeHtml escapes quotes and ampersands", () => {
    assert.equal(escapeHtml('a & b "c" \'d\''), "a &amp; b &quot;c&quot; &#39;d&#39;")
  })

  test("inlineHtml allows **bold** and escapes the rest", () => {
    assert.equal(inlineHtml("**bold** <b>x</b>"), "<strong>bold</strong> &lt;b&gt;x&lt;/b&gt;")
  })

  test("inlineHtml does not create links or images", () => {
    const out = inlineHtml('[a](javascript:alert(1)) <img src=x>')
    assert.ok(!out.includes("<img"))
    assert.ok(!out.includes("<a"))
  })
})

describe("publicSolution strips private review fields", () => {
  test("checkNote / unsure / warnings / check never present", () => {
    const pub = publicSolution({
      status: "NEEDS_REVIEW",
      check: "disagree",
      checkNote: "secret note",
      unsure: "date uncertain",
      warnings: ["answer-mismatch"],
      keyPoints: ["a"],
      memoryTip: "tip",
      concepts: ["Bud"],
    })
    assert.ok(!("check" in pub))
    assert.ok(!("checkNote" in pub))
    assert.ok(!("unsure" in pub))
    assert.ok(!("warnings" in pub))
    assert.ok(!("status" in pub))
    assert.deepEqual(pub.keyPoints, ["a"])
    assert.deepEqual(pub.concepts, ["Bud"])
  })

  test("null/empty input yields empty arrays", () => {
    const pub = publicSolution(null)
    assert.deepEqual(pub.keyPoints, [])
    assert.deepEqual(pub.concepts, [])
  })
})

describe("pagination helper", () => {
  test("defaults: page 1, per 20", () => {
    const p = parsePagination({})
    assert.equal(p.page, 1)
    assert.equal(p.per, 20)
    assert.equal(p.skip, 0)
    assert.equal(p.take, 20)
  })

  test("per only allows 10/20/50", () => {
    for (const per of PER_PAGE_OPTIONS) {
      assert.equal(parsePagination({ per: String(per) }).per, per)
    }
    assert.equal(parsePagination({ per: "7" }).per, 20)
    assert.equal(parsePagination({ per: "-5" }).per, 20)
  })

  test("page clamps to >=1 and to last page by total", () => {
    assert.equal(parsePagination({ page: "0" }).page, 1)
    assert.equal(parsePagination({ page: "-3" }).page, 1)
    // 55 items at per=10 -> 6 pages; page 99 clamps to 6
    const p = parsePagination({ page: "99", per: "10" }, 55)
    assert.equal(p.page, 6)
    assert.equal(p.skip, 50)
    assert.equal(p.take, 10)
  })

  test("pageHref preserves filters and sets page, omits default per", () => {
    assert.equal(pageHref("/question-answer", { exam: "BPSC" }, 3), "/question-answer?exam=BPSC&page=3")
    assert.equal(pageHref("/question-answer", {}, 2, 10), "/question-answer?page=2&per=10")
    assert.equal(pageHref("/question-answer", { year: "2024", topic: "Bud" }, 1), "/question-answer?year=2024&topic=Bud&page=1")
  })

  test("pageWindow is compact and sorted, includes first+last", () => {
    assert.deepEqual(pageWindow(1, 10), [1, 2, 10])
    assert.deepEqual(pageWindow(5, 10), [1, 4, 5, 6, 10])
    assert.deepEqual(pageWindow(7, 7), [1, 6, 7])
  })
})

describe("series match (exam -> test series)", () => {
  test("keywords drop stop words and short tokens", () => {
    assert.deepEqual(keywords("70th BPSC Exam Official Paper (Re-exam)"), ["70TH", "BPSC"])
  })

  test("scoring rewards overlapping exam name", () => {
    const bpsc = { examName: "BPSC Exam", title: "BPSC 72nd Full Test Series", category: "Civil Services" }
    const upsc = { examName: "UPSC Exam", title: "UPSC Prelims 2026", category: "Civil Services" }
    const kw = keywords("70th BPSC")
    assert.ok(scoreSeries(bpsc, kw) > scoreSeries(upsc, kw))
  })

  test("no overlap scores 0", () => {
    assert.equal(scoreSeries({ examName: "SSC", title: "SSC CGL 2026", category: "Govt" }, ["BPSC"]), 0)
  })
})
