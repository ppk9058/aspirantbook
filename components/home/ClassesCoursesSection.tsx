import Link from "next/link"
import Image from "next/image"
import { BookOpen, Calendar, ChevronRight, Phone } from "lucide-react"
import ClassesTabsClient from "./ClassesTabsClient"
import { CLASS_TABS, COURSE_SLUG_MAP, BatchCourse } from "./homepage-courses.data"
import BatchCardItem from "./BatchCardItem"
import { prisma } from "@/lib/prisma"
import { formatUtcToIst, isSlotExpired } from "@/lib/demo/slot-utils"
import { getPlatformSetting, PLATFORM_SETTING_KEYS } from "@/lib/platform-settings"
import { filterRealSections } from "@/lib/home/real-batches"

export { COURSE_SLUG_MAP }
export type { BatchCourse }

async function getHomepageCards(): Promise<Record<string, { sectionTitle: string; batches: BatchCourse[] }>> {
    try {
        const parsed = await getPlatformSetting<Record<string, { sectionTitle: string; batches: BatchCourse[] }>>(
            PLATFORM_SETTING_KEYS.homepageCards
        )
        if (parsed && typeof parsed === "object") {
            return parsed
        }
    } catch (e) {
        // Fallback to empty object
    }
    return {}
}

export default async function ClassesCoursesSection() {
    const rawCardsData = await getHomepageCards()
    const { sections, filteredTabs, hasRealBatches } = filterRealSections(rawCardsData, CLASS_TABS)

    if (!hasRealBatches || filteredTabs.length === 0) {
        return null
    }

    // Fetch upcoming demo slots dynamically to show badges only when enabled and slot exists
    let demoBadgeMap: Record<string, string> = {}
    try {
        const now = new Date()
        const upcomingSlots = await prisma.demoSlot.findMany({
            where: {
                status: { in: ["SCHEDULED", "LIVE"] },
                startTime: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
            },
            include: {
                course: {
                    select: { id: true, slug: true, metadataJson: true },
                },
            },
            orderBy: { startTime: "asc" },
        })

        for (const slot of upcomingSlots) {
            let demoSettings: any = null
            try {
                if (slot.course?.metadataJson) {
                    demoSettings = JSON.parse(slot.course.metadataJson)?.demoSettings
                }
            } catch (e) {}
            if (demoSettings?.enabled !== true) continue

            const expired = isSlotExpired(slot.startTime, slot.durationMinutes)
            if (expired && slot.status !== "LIVE") continue

            const ist = formatUtcToIst(slot.startTime)
            const label = slot.status === "LIVE" ? "LIVE NOW" : `Live Demo • ${ist.dateLabel} ${ist.timeLabel.replace(" IST", "")}`

            if (slot.course?.slug && !demoBadgeMap[slot.course.slug]) {
                demoBadgeMap[slot.course.slug] = label
            }
            if (slot.course?.id && !demoBadgeMap[slot.course.id]) {
                demoBadgeMap[slot.course.id] = label
            }
        }
    } catch (err) {
        console.error("Error fetching demo slots for homepage:", err)
    }

    return (
        <section id="all-courses-container" className="border-t border-gray-100 bg-white pt-10 pb-24 dark:border-white/10 dark:bg-gray-950">
            <ClassesTabsClient tabs={filteredTabs}>
                {/* Courses Sections by Class - Server Rendered */}
                <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-16">
                    {filteredTabs.filter((t) => t.id !== "all").map((tab) => {
                        const classKey = tab.id
                        const section = sections[classKey]
                        if (!section || !section.batches || section.batches.length === 0) return null

                        return (
                            <div
                                key={classKey}
                                id={`section-${classKey}`}
                                data-section-id={classKey}
                                className="scroll-mt-40 space-y-6"
                            >
                                {/* Section Heading */}
                                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                                    {section.sectionTitle}
                                </h2>

                                {/* Batches 3-Card Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {section.batches.map((batch) => {
                                        const courseSlug =
                                            batch.slug ||
                                            COURSE_SLUG_MAP[batch.id] ||
                                            (batch.buttonLink && batch.buttonLink.startsWith("/courses/") && batch.buttonLink !== "/courses"
                                                ? batch.buttonLink.replace("/courses/", "")
                                                : batch.id)
                                        const liveDemoBadge = demoBadgeMap[courseSlug] || demoBadgeMap[batch.id] || null

                                        return (
                                            <BatchCardItem
                                                key={batch.id}
                                                batch={batch}
                                                liveDemoBadge={liveDemoBadge}
                                            />
                                        )
                                    })}
                                </div>

                                {/* View All Batches Center Pill Button */}
                                <div className="flex justify-center pt-2">
                                    <button
                                        type="button"
                                        data-batch-trigger={JSON.stringify(section.batches[0])}
                                        className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#F4F2FF] hover:bg-[#EBE7FF] text-[#5B47FB] font-extrabold text-xs sm:text-sm transition-all cursor-pointer"
                                    >
                                        <span>View All {section.sectionTitle.split(" ")[0]} Batches</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </ClassesTabsClient>

            {/* Floating Support Call Button in Bottom Right (safe-area aware) */}
            <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-50 sm:right-6">
                <a
                    href="tel:+919999999999"
                    aria-label="Call an academic counselor"
                    className="flex h-13 w-13 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl transition-all duration-200 hover:scale-105 hover:bg-indigo-700"
                    title="Talk to an Academic Counselor"
                >
                    <Phone className="h-6 w-6 fill-current" />
                </a>
            </div>
        </section>
    )
}
