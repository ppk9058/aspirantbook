import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  generateStaticSiteFiles,
  ExportQuestionRecord,
} from "@/lib/modules/content-engine/static-export"
import { createZipBuffer } from "@/lib/modules/content-engine/zip"

describe("Phase 3 — Admin UI and Navigation Registration", () => {
  it("1. Navigation Registration: AdminNav and LeftSidebar contain Content Engine", () => {
    const adminNavContent = readFileSync(
      join(process.cwd(), "components/admin/AdminNav.tsx"),
      "utf-8"
    )
    assert.ok(
      adminNavContent.includes('name: "Content Engine"') &&
        adminNavContent.includes('href: "/admin/content-engine"'),
      "AdminNav must include Content Engine link"
    )
    assert.ok(
      adminNavContent.includes("adminOnly: true"),
      "AdminNav Content Engine entry must specify adminOnly: true"
    )

    const leftSidebarContent = readFileSync(
      join(process.cwd(), "components/layout/LeftSidebar.tsx"),
      "utf-8"
    )
    assert.ok(
      leftSidebarContent.includes('name: "Content Engine"') &&
        leftSidebarContent.includes('href: "/admin/content-engine"'),
      "LeftSidebar ADMIN_NAV must include Content Engine entry"
    )
  })

  it("2. Static Site Export: Mirror vs Primary Canonical and File Generation", () => {
    const sampleQuestions: ExportQuestionRecord[] = [
      {
        id: "q-test-1",
        shortId: "abcd1234",
        slug: "q-abcd1234-harappa-excavation",
        q: "In which year was Harappa excavated?",
        options: ["1920", "1921", "1922", "1925"],
        answer: "1921",
        answerIndex: 1,
        explanation: "Harappa was excavated in 1921 by Daya Ram Sahni under the Archaeological Survey of India.",
        sub: "History",
        top: "Indus Valley Civilization",
        exam: "UPSC CSE",
        year: "2023",
        sourceTag: "UPSC CSE 2023",
        isPublished: true,
        isVerified: true,
        translations: [
          {
            lang: "hi",
            q: "हड़प्पा की खुदाई किस वर्ष हुई थी?",
            options: ["1920", "1921", "1922", "1925"],
            explanation: "हड़प्पा की खुदाई 1921 में दयाराम साहनी द्वारा की गई थी।",
            top: "सिंधु घाटी सभ्यता",
            isReviewed: true, // Reviewed
          },
        ],
      },
      {
        id: "q-test-2",
        shortId: "efgh5678",
        slug: "q-efgh5678-unreviewed-hindi-question",
        q: "Who was the first President of India?",
        options: ["Dr. Rajendra Prasad", "Dr. S. Radhakrishnan", "Zakir Husain", "V.V. Giri"],
        answer: "Dr. Rajendra Prasad",
        answerIndex: 0,
        explanation: "Dr. Rajendra Prasad was elected as the first President of the Republic of India.",
        sub: "Polity",
        top: "President & Union Executive",
        exam: "UPPCS",
        year: "2021",
        isPublished: true,
        isVerified: true,
        translations: [
          {
            lang: "hi",
            q: "भारत के प्रथम राष्ट्रपति कौन थे?",
            options: ["डॉ. राजेन्द्र प्रसाद", "डॉ. एस. राधाकृष्णन", "ज़ाकिर हुसैन", "वी.वी. गिरि"],
            isReviewed: false, // NOT reviewed -> must NOT be included in static export or sitemap-hi
          },
        ],
      },
      {
        id: "q-test-3",
        shortId: "ijkl9012",
        slug: "q-ijkl9012-draft-question",
        q: "Draft question not published",
        options: ["A", "B", "C", "D"],
        answer: "A",
        answerIndex: 0,
        sub: "Economy",
        top: "General",
        isPublished: false, // Draft -> must NOT be exported
        isVerified: false,
      },
    ]

    // Test Mirror Mode
    const mirrorFiles = generateStaticSiteFiles(sampleQuestions, "mirror")
    const paths = mirrorFiles.map((f) => f.path)

    assert.ok(paths.includes("index.html"), "Must contain index.html")
    assert.ok(paths.includes("_headers"), "Must contain _headers")
    assert.ok(paths.includes("_redirects"), "Must contain _redirects")
    assert.ok(paths.includes("sitemap.xml"), "Must contain sitemap.xml")
    assert.ok(paths.includes("sitemap-hi.xml"), "Must contain sitemap-hi.xml")

    // Check English page exists
    const enPage = mirrorFiles.find((f) =>
      f.path.includes("q-abcd1234-harappa-excavation/index.html")
    )
    assert.ok(enPage, "English page must exist in export")
    assert.ok(
      String(enPage.content).includes('canonical" href="https://aspirantbook.com/question-answer/'),
      "Mirror mode must have aspirantbook.com canonical"
    )

    // Check Reviewed Hindi page exists
    const hiPage = mirrorFiles.find((f) =>
      f.path.includes("hi/question-answer") &&
      f.path.includes("q-abcd1234-harappa-excavation/index.html")
    )
    assert.ok(hiPage, "Reviewed Hindi page must exist in export")

    // Check Unreviewed Hindi page does NOT exist
    const unrevHiPage = mirrorFiles.find((f) =>
      f.path.includes("hi/question-answer") &&
      f.path.includes("q-efgh5678-unreviewed-hindi-question")
    )
    assert.equal(unrevHiPage, undefined, "Unreviewed Hindi page must NOT be exported")

    // Check Draft question does NOT exist
    const draftPage = mirrorFiles.find((f) =>
      f.path.includes("q-ijkl9012-draft-question")
    )
    assert.equal(draftPage, undefined, "Draft question must NOT be exported")

    // Check Primary Mode
    const primaryFiles = generateStaticSiteFiles(sampleQuestions, "primary")
    const primaryEnPage = primaryFiles.find((f) =>
      f.path.includes("q-abcd1234-harappa-excavation/index.html")
    )
    assert.ok(
      String(primaryEnPage?.content).includes(
        'canonical" href="https://questions.aspirantbook.com/question-answer/'
      ),
      "Primary mode must have questions.aspirantbook.com canonical"
    )

    // Test ZIP archive generation
    const zipBytes = createZipBuffer(mirrorFiles)
    assert.ok(zipBytes instanceof Uint8Array, "Must return Uint8Array")
    assert.ok(zipBytes.byteLength > 1000, `ZIP size should be > 1KB, got ${zipBytes.byteLength}`)
    // Check ZIP magic header PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
    assert.equal(zipBytes[0], 0x50)
    assert.equal(zipBytes[1], 0x4b)
    assert.equal(zipBytes[2], 0x03)
    assert.equal(zipBytes[3], 0x04)
  })
})
