import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
    isPlaceholderBatch,
    filterRealSections,
    resolveAnchorHref,
    type SectionData,
    type TabItem,
} from "@/lib/home/real-batches"
import type { BatchCourse } from "@/components/home/homepage-courses.data"

describe("home-real-batches unit tests", () => {
    const sampleTabs: TabItem[] = [
        { id: "all", label: "All" },
        { id: "upsc", label: "UPSC" },
        { id: "bpsc", label: "BPSC" },
        { id: "skills", label: "Skills" },
    ]

    const realBatch1: BatchCourse = {
        id: "real-upsc-1",
        title: "UPSC Prelims & Mains Comprehensive",
        classTag: "UPSC",
        language: "HINGLISH",
        targetText: "Complete GS Papers 1 to 4",
        scheduleText: "Self-Paced | 2 Full Video Lectures",
        price: "₹4,999",
        originalPrice: "₹9,999",
        discount: "50% OFF",
        image: "/batch-amber.svg",
        buttonText: "Enroll Now",
        buttonLink: "/courses/upsc-prelims-mains",
        slug: "upsc-prelims-mains",
        isLive: true,
    }

    const realBatch2: BatchCourse = {
        id: "real-bpsc-1",
        title: "BPSC Prelims Crash Course",
        classTag: "BPSC",
        language: "HINDI",
        targetText: "Daily Live Interactive Practice",
        scheduleText: "Starts Nov 2026",
        price: "Free",
        image: "/batch-blue.svg",
        buttonText: "Watch Free",
        buttonLink: "/courses/bpsc-prelims",
        slug: "bpsc-prelims",
        isLive: true,
    }

    const placeholderBatch1: BatchCourse = {
        id: "placeholder-1",
        title: "Super 50 Board Toppers Test Series",
        classTag: "Class 10",
        language: "ENGLISH",
        targetText: "Live Evaluated Subjective Mock Tests",
        scheduleText: "Starts Nov 2026",
        price: "Coming Soon",
        image: "/batch-purple.svg",
        buttonText: "Coming Soon",
        buttonLink: "/courses/super-50",
        isLive: false,
    }

    const placeholderBatch2: BatchCourse = {
        id: "placeholder-2",
        title: "AI & Python for Young Innovators",
        classTag: "Skills",
        language: "HINGLISH",
        targetText: "Build Real AI Agents",
        scheduleText: "Self-Paced",
        price: "coming soon",
        image: "/batch-skills.svg",
        buttonText: "Notify Me",
        buttonLink: "/courses/ai-python",
        isLive: false,
    }

    it("identifies placeholder vs real batches accurately", () => {
        assert.equal(isPlaceholderBatch(placeholderBatch1), true)
        assert.equal(isPlaceholderBatch(placeholderBatch2), true)
        assert.equal(isPlaceholderBatch({ price: "Coming Soon", buttonText: "Enroll" }), true)
        assert.equal(isPlaceholderBatch({ price: "₹999", buttonText: "Notify Me When Live" }), true)
        assert.equal(isPlaceholderBatch({ isLive: false }), true)

        assert.equal(isPlaceholderBatch(realBatch1), false)
        assert.equal(isPlaceholderBatch(realBatch2), false)
        assert.equal(isPlaceholderBatch({ price: "Free", buttonText: "Enroll", isLive: true }), false)
        assert.equal(isPlaceholderBatch({ price: "₹1,499", buttonText: "Buy Now", isLive: true }), false)
    })

    it("all-placeholder input returns no sections and empty tabs", () => {
        const inputData: Record<string, SectionData> = {
            skills: {
                sectionTitle: "Skills Section",
                batches: [placeholderBatch1, placeholderBatch2],
            },
        }

        const result = filterRealSections(inputData, sampleTabs)
        assert.equal(result.hasRealBatches, false)
        assert.deepEqual(result.sections, {})
        assert.deepEqual(result.filteredTabs, [])
    })

    it("mixed input keeps only real batches within a section", () => {
        const inputData: Record<string, SectionData> = {
            upsc: {
                sectionTitle: "UPSC Civil Services",
                batches: [realBatch1, placeholderBatch1],
            },
        }

        const result = filterRealSections(inputData, sampleTabs)
        assert.equal(result.hasRealBatches, true)
        assert.equal(Object.keys(result.sections).length, 1)
        assert.equal(result.sections.upsc.batches.length, 1)
        assert.equal(result.sections.upsc.batches[0].id, "real-upsc-1")
    })

    it("section with only placeholders is dropped", () => {
        const inputData: Record<string, SectionData> = {
            upsc: {
                sectionTitle: "UPSC Civil Services",
                batches: [realBatch1],
            },
            skills: {
                sectionTitle: "Skills Section",
                batches: [placeholderBatch1, placeholderBatch2],
            },
        }

        const result = filterRealSections(inputData, sampleTabs)
        assert.equal(result.hasRealBatches, true)
        assert.equal(result.sections.upsc !== undefined, true)
        assert.equal(result.sections.skills, undefined)
        assert.equal(Object.keys(result.sections).length, 1)
    })

    it("tab list shrinks accordingly and keeps 'all' only when content exists", () => {
        const inputData: Record<string, SectionData> = {
            upsc: {
                sectionTitle: "UPSC Civil Services",
                batches: [realBatch1],
            },
        }

        const result = filterRealSections(inputData, sampleTabs)
        assert.equal(result.hasRealBatches, true)
        assert.deepEqual(result.filteredTabs, [
            { id: "all", label: "All" },
            { id: "upsc", label: "UPSC" },
        ])
    })

    it("real batch is returned unchanged with all original properties intact", () => {
        const inputData: Record<string, SectionData> = {
            upsc: {
                sectionTitle: "UPSC Civil Services",
                batches: [realBatch1],
            },
        }

        const result = filterRealSections(inputData, sampleTabs)
        const returnedBatch = result.sections.upsc.batches[0]

        assert.equal(returnedBatch.id, realBatch1.id)
        assert.equal(returnedBatch.title, realBatch1.title)
        assert.equal(returnedBatch.price, realBatch1.price)
        assert.equal(returnedBatch.originalPrice, realBatch1.originalPrice)
        assert.equal(returnedBatch.discount, realBatch1.discount)
        assert.equal(returnedBatch.image, realBatch1.image)
        assert.equal(returnedBatch.buttonText, realBatch1.buttonText)
        assert.equal(returnedBatch.buttonLink, realBatch1.buttonLink)
        assert.equal(returnedBatch.slug, realBatch1.slug)
        assert.equal(returnedBatch.isLive, realBatch1.isLive)
    })

    it("handles null, undefined, or empty inputs safely", () => {
        const r1 = filterRealSections(null, sampleTabs)
        assert.equal(r1.hasRealBatches, false)
        assert.deepEqual(r1.sections, {})
        assert.deepEqual(r1.filteredTabs, [])

        const r2 = filterRealSections(undefined, sampleTabs)
        assert.equal(r2.hasRealBatches, false)
        assert.deepEqual(r2.sections, {})
        assert.deepEqual(r2.filteredTabs, [])

        const r3 = filterRealSections({}, sampleTabs)
        assert.equal(r3.hasRealBatches, false)
        assert.deepEqual(r3.sections, {})
        assert.deepEqual(r3.filteredTabs, [])
    })

    it("keeps anchor hrefs when real batches exist and falls back to /courses otherwise", () => {
        assert.equal(resolveAnchorHref("#all-courses-container", true), "#all-courses-container")
        assert.equal(resolveAnchorHref("/#section-upsc", true), "/#section-upsc")
        assert.equal(resolveAnchorHref("/#section-bpsc", true), "/#section-bpsc")

        assert.equal(resolveAnchorHref("#all-courses-container", false), "/courses")
        assert.equal(resolveAnchorHref("/#all-courses-container", false), "/courses")
        assert.equal(resolveAnchorHref("/#section-upsc", false), "/courses")
        assert.equal(resolveAnchorHref("/#section-bpsc", false), "/courses")
    })
})
