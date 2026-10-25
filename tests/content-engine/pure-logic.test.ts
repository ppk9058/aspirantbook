import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { nz, classify, inferRuns, reCategoriseAll } from "../../lib/modules/content-engine/classifier"
import { examOf, yearOf, detectBracketTag } from "../../lib/modules/content-engine/exam-detector"
import { parse, ansIdx, stmtParse, matchParse } from "../../lib/modules/content-engine/parser"
import { refInfo, resolveExplanation } from "../../lib/modules/content-engine/cross-ref"
import { formatSolutionHtml, esc } from "../../lib/modules/content-engine/solution-formatter"
import { buildSeoModel, safeJsonLdStringify } from "../../lib/modules/content-engine/seo-model"
import { evaluateQualityGates } from "../../lib/modules/content-engine/quality-gates"
import { createZipBuffer } from "../../lib/modules/content-engine/zip"
import { generateStaticSiteFiles } from "../../lib/modules/content-engine/export-site"
import { parseCategoryJson, parseHindiImport } from "../../lib/modules/content-engine/assist-io"

describe("Phase 1 — Pure Logic Acceptance Tests", () => {
  describe("1. Classifier & Normalization", () => {
    test("nz normalizes chandrabindu, nukta, and nasal halants", () => {
      // सिन्धु = सिंधु, हड़प्पा = हङप्पा, चंद्र = चन्द्र
      assert.strictEqual(nz("सिन्धु"), nz("सिंधु"))
      assert.strictEqual(nz("हङप्पा"), nz("हड़प्पा"))
      assert.strictEqual(nz("चन्द्र"), nz("चंद्र"))
    })

    test("classify identifies specified key questions", () => {
      // 1. चित्रित मृद्भांडों पर लाल और काले रंग का प्रयोग -> Ancient India / Indus Valley Civilization
      const c1 = classify("चित्रित मृद्भांडों पर लाल और काले रंग का प्रयोग")
      assert.deepStrictEqual(c1, ["Ancient India", "Indus Valley Civilization"])

      // 2. सैन्धव सभ्यता का प्रमुख बंदरगाह -> Ancient India / Indus Valley Civilization
      const c2 = classify("सैन्धव सभ्यता का प्रमुख बंदरगाह")
      assert.deepStrictEqual(c2, ["Ancient India", "Indus Valley Civilization"])

      // 3. सिन्धु घाटी के नगर नियोजन की विशेषता -> Ancient India / Indus Valley Civilization
      const c3 = classify("सिन्धु घाटी के नगर नियोजन की विशेषता")
      assert.deepStrictEqual(c3, ["Ancient India", "Indus Valley Civilization"])

      // 4. हङप्पा की मुहरें -> Ancient India / Indus Valley Civilization
      const c4 = classify("हङप्पा की मुहरें")
      assert.deepStrictEqual(c4, ["Ancient India", "Indus Valley Civilization"])

      // 5. अकबर की भूमि राजस्व नीति -> Medieval India / Mughal Empire
      const c5 = classify("अकबर की भूमि राजस्व नीति")
      assert.deepStrictEqual(c5, ["Medieval India", "Mughal Empire"])

      // 6. भारत का संविधान -> Polity / Constitution
      const c6 = classify("भारत का संविधान और मौलिक अधिकार")
      assert.deepStrictEqual(c6, ["Polity", "Constitution"])

      // 7. संधि question -> Hindi / Hindi Grammar and Literature
      const c7 = classify("निम्न में से कौन सा स्वर संधि का उदाहरण है?")
      assert.deepStrictEqual(c7, ["Hindi", "Hindi Grammar and Literature"])

      // 8. शिक्षण की सबसे प्रभावी विधि -> Education / Teaching and Pedagogy
      const c8 = classify("शिक्षण की सबसे प्रभावी विधि कौन सी है?")
      assert.deepStrictEqual(c8, ["Education", "Teaching and Pedagogy"])
    })
  })

  describe("2. Exam & Year Detection", () => {
    test("[RAS/RTS 2013] bracket tag detects exam and year", () => {
      const { cleanQuestion, tag } = detectBracketTag("Where is the Thar desert? [RAS/RTS 2013]")
      assert.strictEqual(cleanQuestion, "Where is the Thar desert?")
      assert.strictEqual(tag, "RAS/RTS 2013")
      assert.strictEqual(examOf(tag), "RAS/RTS")
      assert.strictEqual(yearOf(tag), "2013")
    })

    test("[UPPCS 2017] bracket tag detects UPPCS 2017", () => {
      const { cleanQuestion, tag } = detectBracketTag("Which article guarantees equality? [UPPCS 2017]")
      assert.strictEqual(cleanQuestion, "Which article guarantees equality?")
      assert.strictEqual(examOf(tag), "UPPCS")
      assert.strictEqual(yearOf(tag), "2017")
    })

    test("Source: UPRO/ARO 2017 line detection", () => {
      const src = "Source: UPRO/ARO 2017"
      assert.strictEqual(examOf(src), "UPRO/ARO")
      assert.strictEqual(yearOf(src), "2017")
    })

    test("[1995] bracket tag detects year only", () => {
      const { cleanQuestion, tag } = detectBracketTag("When was the policy enacted? [1995]")
      assert.strictEqual(cleanQuestion, "When was the policy enacted?")
      assert.strictEqual(tag, "1995")
      assert.strictEqual(examOf(tag), "")
      assert.strictEqual(yearOf(tag), "1995")
    })

    test("unknown bracket exam tag stays untagged", () => {
      const text = "A sample problem with [UNKNOWN_EXAM_FOOBAR 2020]"
      const { cleanQuestion, tag } = detectBracketTag(text)
      assert.strictEqual(tag, "")
      assert.strictEqual(cleanQuestion, text)
    })
  })

  describe("3. Cross-Reference Resolver", () => {
    test("resolves reference-only explanation", () => {
      const pool = [
        {
          id: 1,
          no: 1,
          q: "What is Harappa?",
          exp: "Harappa was the first excavated site of the Indus civilization, discovered by Daya Ram Sahni in 1921.",
          src: "NCERT",
        },
        {
          id: 2,
          no: 2,
          q: "Who discovered Harappa?",
          exp: "प्रश्न संख्या 1 की व्याख्या देखें।",
          src: "NCERT",
        },
      ]

      const res = resolveExplanation(pool[1], pool)
      assert.strictEqual(res.refNumber, 1)
      assert.ok(res.resolvedExp.includes("Daya Ram Sahni in 1921"))
    })

    test("resolves chained reference (depth 2)", () => {
      const pool = [
        {
          id: 1,
          no: 1,
          q: "What is Lothal?",
          exp: "Lothal was a prominent port city of the Indus Valley Civilization located in Gujarat.",
          src: "UPSC 2015",
        },
        {
          id: 2,
          no: 2,
          q: "Which was the port city?",
          exp: "See explanation of question 1.",
          src: "UPSC 2015",
        },
        {
          id: 3,
          no: 3,
          q: "Where was dockyard found?",
          exp: "Refer to solution of Question 2.",
          src: "UPSC 2015",
        },
      ]

      const res = resolveExplanation(pool[2], pool)
      assert.strictEqual(res.refNumber, 2)
      assert.ok(res.resolvedExp.includes("prominent port city of the Indus Valley"))
    })

    test("returns original explanation on missing target", () => {
      const pool = [
        {
          id: 1,
          no: 1,
          q: "Test Question",
          exp: "See explanation of question 999.",
        },
      ]
      const res = resolveExplanation(pool[0], pool)
      assert.strictEqual(res.resolvedExp, "See explanation of question 999.")
      assert.strictEqual(res.refNumber, null)
    })

    test("ignores self-reference", () => {
      const pool = [
        {
          id: 5,
          no: 5,
          q: "Self referencing question",
          exp: "See explanation of question 5.",
        },
      ]
      const res = resolveExplanation(pool[0], pool)
      assert.strictEqual(res.resolvedExp, "See explanation of question 5.")
    })

    test("keeps own sentences before pulled explanation", () => {
      const pool = [
        {
          id: 10,
          no: 10,
          q: "Original Q",
          exp: "Full historical context about the Maurya dynasty and Chandragupta.",
          src: "BPSC",
        },
        {
          id: 11,
          no: 11,
          q: "Second Q",
          exp: "This is a direct fact regarding Kautilya. See explanation of Question 10.",
          src: "BPSC",
        },
      ]

      const res = resolveExplanation(pool[1], pool)
      assert.ok(res.resolvedExp.startsWith("This is a direct fact regarding Kautilya."))
      assert.ok(res.resolvedExp.includes("Full historical context about the Maurya dynasty"))
    })

    test("explanation > 400 chars is NOT rewritten", () => {
      const longExp = "A".repeat(405) + ". See explanation of question 1."
      const pool = [
        {
          id: 1,
          no: 1,
          q: "Target",
          exp: "Target explanation",
        },
        {
          id: 2,
          no: 2,
          q: "Long explanation item",
          exp: longExp,
        },
      ]

      const res = resolveExplanation(pool[1], pool)
      assert.strictEqual(res.resolvedExp, longExp)
      assert.strictEqual(res.refNumber, null)
    })
  })

  describe("4. inferRuns", () => {
    test("a 10-item unmatched run between two same-topic matched items inherits", () => {
      interface TestItem {
        q: string
        o: string[]
        sub: string
        top: string
        inferred?: boolean
      }
      const items: TestItem[] = [
        { q: "Q0", o: ["a", "b"], sub: "Polity", top: "Constitution" },
        // 10 unmatched items
        ...Array.from({ length: 10 }, (_, i) => ({
          q: `Unmatched ${i + 1}`,
          o: ["a", "b"],
          sub: "Uncategorized",
          top: "General",
        })),
        { q: "Q12", o: ["a", "b"], sub: "Polity", top: "Constitution" },
      ]

      inferRuns(items)

      for (let i = 1; i <= 10; i++) {
        assert.strictEqual(items[i].sub, "Polity", `Item ${i} subject should be Polity`)
        assert.strictEqual(items[i].top, "Constitution", `Item ${i} topic should be Constitution`)
        assert.strictEqual(items[i].inferred, true)
      }
    })

    test("unmatched run between different-topic items does NOT inherit", () => {
      interface TestItem {
        q: string
        o: string[]
        sub: string
        top: string
        inferred?: boolean
      }
      const items: TestItem[] = [
        { q: "Q0", o: ["a", "b"], sub: "Polity", top: "Constitution" },
        { q: "Unmatched 1", o: ["a", "b"], sub: "Uncategorized", top: "General" },
        { q: "Unmatched 2", o: ["a", "b"], sub: "Uncategorized", top: "General" },
        { q: "Q3", o: ["a", "b"], sub: "Geography", top: "Indian Geography" },
      ]

      inferRuns(items)

      assert.strictEqual(items[1].top, "General")
      assert.strictEqual(items[2].top, "General")
      assert.strictEqual(items[1].inferred, undefined)
      assert.strictEqual(items[2].inferred, undefined)
    })
  })

  describe("5. Security & Escaping in JSON-LD and HTML", () => {
    test("a question containing <script> tags is safely escaped in JSON-LD and HTML", () => {
      const dangerousQ = '<script>alert("XSS")</script> Which article is this?'
      const question = {
        id: "cuid12345",
        shortId: "a1b2c3d4",
        slug: "a1b2c3d4-which-article",
        q: dangerousQ,
        o: ["Option A", "Option B", "Option C", "Option D"],
        a: 0,
        exp: "Safe explanation with <script>test</script>",
        sub: "Polity",
        top: "Constitution",
        exam: "UPSC",
        year: "2020",
        isPublished: true,
      }

      const seo = buildSeoModel(question, "en", "https://aspirantbook.com")

      // In JSON-LD script string, < must be replaced with \u003c
      assert.ok(!seo.jsonLdScriptString.includes("<script>alert"))
      assert.ok(seo.jsonLdScriptString.includes("\\u003cscript>alert"))

      // HTML output escaping
      const sol = formatSolutionHtml({
        id: 1,
        q: dangerousQ,
        o: ["<script>a</script>", "b", "c", "d"],
        a: 0,
        exp: "Safe",
      })
      assert.ok(!sol.includes("<script>a</script>"))
      assert.ok(sol.includes("&lt;script&gt;a&lt;/script&gt;"))
    })
  })

  describe("6. 20-Question Mixed Hindi/English Paste End-to-End", () => {
    const rawPaste = `
# BPSC 45th Prelims 2002
Subject: History
Kunwar Singh held the revolt of 1857 in
A) Punjab
B) Bengal
C) Bihar
D) Maharashtra
Answer: C
Explanation: Kunwar Singh of Jagdispur led the revolt in Bihar.

Q2. Where did the revolt of 1857 start in Rajasthan? [RPSC 2019]
(a) Nasirabad Cantonment (b) Neemuch Cantonment (c) Deoli Cantonment (d) Erinpura Cantonment
Ans: a
Solution: The revolt in Rajasthan began at Nasirabad on 28 May 1857.

## RRC Group D Previous Paper 1 (Held On: 17 Sep 2018 Shift 1)
3. Dayanand Saraswati was the founder of which of the following missions?
1. Brahmo Samaj
2. Chinmaya Mission
3. Arya Samaj
4. Prarthana Samaj
Correct Answer: Arya Samaj
Explanation: Dayanand Saraswati founded the Arya Samaj in Bombay in 1875.

Subject: Polity
## SSC CGL 2021
Who presides over the joint sitting of Lok Sabha and Rajya Sabha?
A) President
B) Vice President
C) Speaker of Lok Sabha
D) Prime Minister
Answer: C
Explanation: Under Article 118 the Speaker presides over a joint sitting.

5. Which article of the Constitution deals with equality before law?
A) Article 12
B) Article 14
C) Article 19
D) Article 21
Answer: B
Explanation: Article 14 of the Constitution provides equality before law and equal protection of laws.

Subject: Science
6. Deficiency of which vitamin causes night blindness?
A) Vitamin A
B) Vitamin B
C) Vitamin C
D) Vitamin D
Answer: A
Explanation: Vitamin A deficiency is the leading cause of preventable night blindness.

Subject: Geography
7. Which river is known as the Sorrow of Bihar?
A) Ganga
B) Gandak
C) Kosi
D) Son
Answer: C
Explanation: Kosi is called the Sorrow of Bihar due to recurring devastating floods.

Subject: Economy
8. The repo rate is set by which institution?
A) SEBI
B) NABARD
C) RBI
D) Finance Ministry
Answer: C
Explanation: The Reserve Bank of India sets the monetary policy repo rate.

Subject: History
प्रश्न 9. हड़प्पा सभ्यता का सबसे बड़ा स्नानागार कहाँ मिला था? [UPPCS 2015]
(क) लोथल
(ख) मोहनजोदड़ो
(ग) कालीबंगा
(घ) राखीगढ़ी
उत्तर: ख
व्याख्या: मोहनजोदड़ो का विशाल स्नानागार सैन्धव सभ्यता का सबसे प्रसिद्ध स्मारक है।

प्रश्न 10. ऋग्वेद में कुल कितने मंडल हैं?
(क) 8
(ख) 10
(ग) 12
(घ) 108
उत्तर: ख
व्याख्या: ऋग्वेद में 10 मंडल और 1028 सूक्त हैं।

Subject: Science
11. What is the SI unit of electric current?
A) Volt
B) Ampere
C) Ohm
D) Watt
Answer: B
Explanation: The ampere is the SI base unit of electric current.

12. The acid present in lemon is:
A) Acetic acid
B) Citric acid
C) Lactic acid
D) Tartaric acid
Answer: B
Explanation: Lemons are rich in citric acid.

Subject: History
प्रश्न 13. नालंदा विश्वविद्यालय की स्थापना किसने की थी? [BPSC 2018]
(क) समुद्रगुप्त
(ख) कुमारगुप्त प्रथम
(ग) स्कंदगुप्त
(घ) हर्ष
उत्तर: ख
व्याख्या: नालंदा महाविहार की स्थापना गुप्त शासक कुमारगुप्त प्रथम ने की थी।

14. Who built the Grand Trunk Road?
A) Akbar
B) Babur
C) Sher Shah Suri
D) Shah Jahan
Answer: C
Explanation: Sher Shah Suri reconstructed the ancient Uttarapatha route into the Sadak-e-Azam (Grand Trunk Road).

Subject: Science
15. What is the chemical formula of common salt?
A) KCl
B) NaCl
C) Na2CO3
D) NaHCO3
Answer: B
Explanation: Sodium chloride (NaCl) is known as common table salt.

Subject: History
प्रश्न 16. महात्मा बुद्ध ने अपना पहला उपदेश कहाँ दिया था?
(क) बोधगया
(ख) सारनाथ
(ग) कुशीनगर
(घ) लुम्बिनी
उत्तर: ख
व्याख्या: बुद्ध ने ज्ञान प्राप्ति के बाद सारनाथ में धर्मचक्रप्रवर्तन किया था।

Subject: Science
17. Which planet is closest to the Sun?
A) Venus
B) Mercury
C) Mars
D) Earth
Answer: B
Explanation: Mercury is the innermost planet of the solar system.

Subject: Maths
18. What percentage of 200 is 50?
A) 20%
B) 25%
C) 30%
D) 40%
Answer: B
Explanation: 50 / 200 * 100 = 25 percent.

Subject: Polity
प्रश्न 19. निम्न में से कौन सा मौलिक अधिकार नहीं है? [MPPSC 2016]
(क) समानता का अधिकार
(ख) स्वतंत्रता का अधिकार
(ग) संपत्ति का अधिकार
(घ) धार्मिक स्वतंत्रता
उत्तर: ग
व्याख्या: 44वें संविधान संशोधन 1978 द्वारा संपत्ति के अधिकार को मौलिक अधिकार से हटाकर विधिक अधिकार बनाया गया।

Subject: History
20. The Battle of Plassey was fought in which year?
A) 1757
B) 1764
C) 1857
D) 1761
Answer: A
Explanation: The Battle of Plassey was fought on 23 June 1757 between the British East India Company and the Nawab of Bengal.
`

    test("parses all 20 questions correctly with proper classifications and options", () => {
      const parsed = parse(rawPaste)
      assert.strictEqual(parsed.length, 20, "Should parse exactly 20 questions")

      // Verify mix of languages and types
      const mcqs = parsed.filter((q) => q.type === "MCQ")
      assert.strictEqual(mcqs.length, 20)

      // Q1: Kunwar Singh
      assert.strictEqual(parsed[0].ans, "C")
      assert.strictEqual(parsed[0].a, 2)
      assert.strictEqual(parsed[0].sub, "Modern India")
      assert.strictEqual(parsed[0].top, "Revolt of 1857")

      // Q2: RPSC 2019
      assert.strictEqual(parsed[1].exam, "RPSC")
      assert.strictEqual(parsed[1].year, "2019")

      // Q9: Hindi Indus Valley
      assert.ok(/हड़प्पा/.test(parsed[8].q))
      assert.strictEqual(parsed[8].sub, "Ancient India")
      assert.strictEqual(parsed[8].top, "Indus Valley Civilization")
      assert.strictEqual(parsed[8].a, 1) // (ख) -> b -> 1
      assert.strictEqual(parsed[8].exam, "UPPCS")
      assert.strictEqual(parsed[8].year, "2015")

      // Q10: Rigveda
      assert.strictEqual(parsed[9].sub, "Ancient India")
      assert.strictEqual(parsed[9].top, "Vedic Age")

      // Q13: BPSC 2018 Kumaragupta
      assert.strictEqual(parsed[12].exam, "BPSC")
      assert.strictEqual(parsed[12].year, "2018")
      assert.strictEqual(parsed[12].sub, "Ancient India")
      assert.strictEqual(parsed[12].top, "Gupta and Post-Gupta Age")

      // Q19: MPPSC 2016 Polity
      assert.strictEqual(parsed[18].exam, "MPPSC")
      assert.strictEqual(parsed[18].year, "2016")
      assert.strictEqual(parsed[18].sub, "Polity")
      assert.strictEqual(parsed[18].top, "Constitution")
    })
  })
})
