import Link from "next/link"
import Image from "next/image"
import { BookOpen, Calendar, ChevronRight, Phone } from "lucide-react"
import ClassesTabsClient from "./ClassesTabsClient"
import { CLASS_TABS, COURSES_DATA, COURSE_SLUG_MAP, BatchCourse } from "./homepage-courses.data"
import BatchCardItem from "./BatchCardItem"
import fs from "fs"
import path from "path"

import { prisma } from "@/lib/prisma"
import { formatUtcToIst, isSlotExpired } from "@/lib/demo/slot-utils"

export { COURSE_SLUG_MAP }
export type { BatchCourse }

function getHomepageCards(): Record<string, { sectionTitle: string; batches: BatchCourse[] }> {
    try {
        const filePath = path.join(process.cwd(), "data", "homepage-cards.json")
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf-8")
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === "object") {
                return parsed
            }
        }
    } catch (e) {
        // Fallback to static COURSES_DATA
    }
    return COURSES_DATA
}

export default async function ClassesCoursesSection() {
    const cardsData = getHomepageCards()

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
        <section id="all-courses-container" className="pt-10 pb-24 border-t border-gray-100 bg-white">
            <ClassesTabsClient tabs={CLASS_TABS}>
                {/* Courses Sections by Class - Server Rendered */}
                <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-16">
                    {CLASS_TABS.filter((t) => t.id !== "all").map((tab) => {
                        const classKey = tab.id
                        const section = cardsData[classKey] || COURSES_DATA[classKey]
                        if (!section) return null

                        return (
                            <div
                                key={classKey}
                                id={`section-${classKey}`}
                                data-section-id={classKey}
                                className="scroll-mt-40 space-y-6"
                            >
                                {/* Section Heading */}
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] tracking-tight">
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

            {/* Floating Support Call Button in Bottom Right as seen on PW */}
            <div className="fixed bottom-6 right-6 z-50">
                <a
                    href="tel:+919999999999"
                    className="w-13 h-13 bg-[#5B47FB] hover:bg-[#4a36ea] text-white rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                    title="Talk to an Academic Counselor"
                >
                    <Phone className="h-6 w-6 fill-current" />
                </a>
            </div>
        </section>
    )
}
