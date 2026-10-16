"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Search } from "lucide-react"
import type { BatchCourse } from "./homepage-courses.data"
import { openMobileAuth } from "@/components/auth/MobileAuthModal"

interface ClassesTabsClientProps {
    tabs: { id: string; label: string }[]
    children: React.ReactNode
}

export default function ClassesTabsClient({ tabs, children }: ClassesTabsClientProps) {
    const router = useRouter()
    const { data: session } = useSession()
    const [selectedTab, setSelectedTab] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)

    // Synchronize tab and search filter with DOM for fast, 0-bundle server-rendered cards
    useEffect(() => {
        if (!containerRef.current) return
        const container = containerRef.current
        const q = searchQuery.trim().toLowerCase()

        const sections = container.querySelectorAll<HTMLElement>("[data-section-id]")
        sections.forEach((sec) => {
            const secId = sec.getAttribute("data-section-id")
            const matchesTab = selectedTab === "all" || selectedTab === secId

            if (!matchesTab) {
                sec.style.display = "none"
                return
            }

            const cards = sec.querySelectorAll<HTMLElement>("[data-batch-card]")
            let visibleCount = 0

            cards.forEach((card) => {
                const searchData = (card.getAttribute("data-batch-search") || "").toLowerCase()
                const matchesSearch = !q || searchData.includes(q)

                if (matchesSearch) {
                    card.style.display = ""
                    visibleCount++
                } else {
                    card.style.display = "none"
                }
            })

            sec.style.display = visibleCount > 0 ? "" : "none"
        })
    }, [selectedTab, searchQuery])

    const scrollToClass = (tabId: string) => {
        setSelectedTab(tabId)

        if (tabId === "all") {
            const el = document.getElementById("all-courses-container")
            el?.scrollIntoView({ behavior: "smooth" })
        } else {
            const el = document.getElementById(`section-${tabId}`)
            if (el) {
                const yOffset = -140
                const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset
                window.scrollTo({ top: y, behavior: "smooth" })
            }
        }
    }

    const handleContainerClick = async (e: React.MouseEvent) => {
        // 1. Did the student click on the "Enroll" or "Buy Now" action button?
        const actionBtn = (e.target as HTMLElement).closest<HTMLElement>("[data-action-btn]")
        if (actionBtn) {
            e.preventDefault()
            e.stopPropagation()
            const raw = actionBtn.getAttribute("data-action-payload")
            const actionType = actionBtn.getAttribute("data-action-type") as "enroll" | "buy"

            if (raw) {
                try {
                    const batch = JSON.parse(raw) as BatchCourse
                    const p = (batch.price || "").toLowerCase()
                    const isFree = actionType === "enroll" || !batch.price || p.includes("free") || p === "0" || p === "₹0"

                    if (session?.user) {
                        // User is already logged in
                        if (isFree) {
                            try {
                                await fetch("/api/auth/mobile-login", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        phoneNumber: (session.user as any).phoneNumber || "0000000000",
                                        courseId: batch.slug || batch.id,
                                    }),
                                })
                            } catch (err) {
                                console.error("Enrollment error:", err)
                            }
                            router.push("/my-learning")
                            router.refresh()
                        } else {
                            // Paid course -> Go to checkout
                            router.push(`/checkout?courseId=${batch.slug || batch.id}`)
                        }
                    } else {
                        // Unauthenticated -> Open Mobile Number & OTP Modal
                        openMobileAuth({
                            course: {
                                id: batch.id,
                                slug: batch.slug,
                                title: batch.title,
                                price: batch.price,
                                isFree,
                                image: batch.image,
                                classTag: batch.classTag,
                                targetText: batch.targetText,
                            },
                            actionType: isFree ? "enroll" : "buy",
                        })
                    }
                } catch (err) {
                    console.error("Action click error:", err)
                }
            }
            return
        }

        // 2. Otherwise: Student clicked anywhere else on the course card
        // Requirement 4: "if student clicks on anywhere else on course card exept Buy Now or Enroll(in case of free) then it should take them to course details page"
        const card = (e.target as HTMLElement).closest<HTMLElement>("[data-batch-card]")
        if (card) {
            const cardLink = card.getAttribute("data-card-link")
            if (cardLink) {
                e.preventDefault()
                router.push(cardLink)
            }
        }
    }

    return (
        <div ref={containerRef} onClick={handleContainerClick}>
            {/* Sticky class filter bar + search. Offset clears the compact mobile
                header (h-16) and the taller desktop header (h-20). */}
            <div className="sticky top-16 z-40 mb-8 border-b border-gray-200/80 bg-white/95 py-3 shadow-sm backdrop-blur-md md:top-20 dark:border-white/10 dark:bg-gray-950/90">
                <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 sm:px-8 md:flex-row md:items-center">
                    {/* Horizontal class chips */}
                    <div data-scroll-x="true" className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
                        {tabs.map((tab) => {
                            const isSelected = selectedTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => scrollToClass(tab.id)}
                                    aria-pressed={isSelected}
                                    className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-xs font-bold transition-all active:scale-95 sm:text-sm ${
                                        isSelected
                                            ? "border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                                            : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:text-indigo-300"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Right Search Input Box */}
                    <div className="relative w-full flex-shrink-0 md:w-80">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for Batches"
                            aria-label="Search for batches"
                            className="min-h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            {/* Server-Rendered Children (Sections & Cards) */}
            {children}
        </div>
    )
}
