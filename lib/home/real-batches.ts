import type { BatchCourse } from "@/components/home/homepage-courses.data"

export interface SectionData {
    sectionTitle: string
    batches: BatchCourse[]
}

export interface TabItem {
    id: string
    label: string
}

export interface FilterRealSectionsResult {
    sections: Record<string, SectionData>
    filteredTabs: TabItem[]
    hasRealBatches: boolean
}

/**
 * Checks if a batch course card is a placeholder or "coming soon" card.
 * Uses the exact condition from BatchCardItem.tsx:
 * - isLive === false
 * - price includes "coming" (case-insensitive)
 * - buttonText includes "coming" (case-insensitive)
 * - buttonText includes "notify" (case-insensitive)
 * Also safely checks for "Coming Soon" price & buttonText.
 */
export function isPlaceholderBatch(batch: Partial<BatchCourse> | null | undefined): boolean {
    if (!batch) return true
    const p = (batch.price || "").trim().toLowerCase()
    const b = (batch.buttonText || "").trim().toLowerCase()

    if (batch.isLive === false) return true
    if (p.includes("coming")) return true
    if (b.includes("coming")) return true
    if (b.includes("notify")) return true

    if (p === "coming soon" && b === "coming soon") return true

    return false
}

/**
 * Pure function to filter out placeholder batches and drop empty sections.
 * Also computes which tabs have content and keeps the "all" tab if at least one section remains.
 */
export function filterRealSections(
    data: Record<string, SectionData> | null | undefined,
    tabs: TabItem[] = []
): FilterRealSectionsResult {
    if (!data || typeof data !== "object") {
        return {
            sections: {},
            filteredTabs: [],
            hasRealBatches: false,
        }
    }

    const filteredSections: Record<string, SectionData> = {}

    for (const [key, section] of Object.entries(data)) {
        if (!section || !Array.isArray(section.batches)) continue

        const realBatches = section.batches.filter((b) => !isPlaceholderBatch(b))
        if (realBatches.length > 0) {
            filteredSections[key] = {
                ...section,
                batches: realBatches,
            }
        }
    }

    const remainingKeys = new Set(Object.keys(filteredSections))
    const hasRealBatches = remainingKeys.size > 0

    // Filter tabs to only those matching remaining sections
    const nonAllTabs = tabs.filter((t) => t.id !== "all" && remainingKeys.has(t.id))

    // Keep the "all" tab only if at least one section remains
    const hasAllTab = tabs.some((t) => t.id === "all")
    const filteredTabs: TabItem[] = []
    if (hasRealBatches && hasAllTab) {
        const allTab = tabs.find((t) => t.id === "all")!
        filteredTabs.push(allTab)
    }
    filteredTabs.push(...nonAllTabs)

    return {
        sections: filteredSections,
        filteredTabs,
        hasRealBatches,
    }
}

/**
 * In-page anchors (#all-courses-container, #section-upsc, #section-bpsc) only
 * exist while ClassesCoursesSection renders real batches. When it renders
 * nothing, send the user to the courses catalogue instead of a dead anchor.
 */
export function resolveAnchorHref(href: string, hasRealBatches: boolean): string {
    return hasRealBatches ? href : "/courses"
}
