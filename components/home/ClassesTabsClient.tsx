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
            {/* Sticky Class Filter Bar + Search Bar */}
            <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs py-3.5 mb-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Horizontal Class Pills List */}
                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
                        {tabs.map((tab, idx) => {
                            const isSelected = selectedTab === tab.id
                            return (
                                <div key={tab.id} className="flex items-center flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => scrollToClass(tab.id)}
                                        className={`px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all rounded-md cursor-pointer ${
                                            isSelected
                                                ? "text-[#5B47FB] font-bold border-b-2 border-[#5B47FB] bg-[#F5F3FF]"
                                                : "text-[#5B47FB] hover:text-[#4338CA] hover:bg-gray-50"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                    {idx < tabs.length - 1 && (
                                        <span className="text-gray-300 mx-1.5 text-xs select-none">|</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Right Search Input Box */}
                    <div className="relative w-full md:w-80 flex-shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for Batches"
                            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B47FB]/30 focus:border-[#5B47FB]"
                        />
                    </div>
                </div>
            </div>

            {/* Server-Rendered Children (Sections & Cards) */}
            {children}
        </div>
    )
}
