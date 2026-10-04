"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import {
    Sparkles,
    Plus,
    Save,
    Trash2,
    Edit3,
    ExternalLink,
    ArrowUp,
    ArrowDown,
    CheckCircle2,
    AlertCircle,
    BookOpen,
    Calendar,
    ChevronRight,
    RefreshCw,
    Layers,
    MoveLeft,
    MoveRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface BatchCard {
    id: string
    title: string
    classTag: string
    language: string
    targetText: string
    scheduleText: string
    price: string
    originalPrice?: string
    discount?: string
    image: string
    buttonText: string
    buttonLink: string
    slug?: string
    isLive?: boolean
    isPrimaryAction?: boolean
}

interface SectionData {
    sectionTitle: string
    batches: BatchCard[]
}

const TABS = [
    { id: "skills", label: "Skills & Tech" },
    { id: "upsc", label: "UPSC" },
    { id: "bpsc", label: "BPSC" },
    { id: "class-10", label: "Class 10th" },
    { id: "class-9", label: "Class 9th" },
    { id: "class-8", label: "Class 8th" },
    { id: "class-7", label: "Class 7th" },
    { id: "class-6", label: "Class 6th" },
]

export function HomePageCardStudioClient() {
    const [cardsData, setCardsData] = useState<Record<string, SectionData>>({})
    const [dbCourses, setDbCourses] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState("skills")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Modal state for Add/Edit
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null) // null = Add, number = Edit

    // Form fields
    const [selectedCourseId, setSelectedCourseId] = useState("")
    const [formTitle, setFormTitle] = useState("")
    const [formSlug, setFormSlug] = useState("")
    const [formClassTag, setFormClassTag] = useState("Skills")
    const [formLanguage, setFormLanguage] = useState("HINGLISH")
    const [formTargetText, setFormTargetText] = useState("")
    const [formScheduleText, setFormScheduleText] = useState("Self-Paced | Video Course")
    const [formPrice, setFormPrice] = useState("₹999")
    const [formOriginalPrice, setFormOriginalPrice] = useState("₹1,499")
    const [formDiscount, setFormDiscount] = useState("33% OFF")
    const [formImage, setFormImage] = useState("/batch-skills.svg")
    const [formButtonText, setFormButtonText] = useState("Enroll Now")
    const [formButtonLink, setFormButtonLink] = useState("")
    const [formIsLive, setFormIsLive] = useState(true)

    const fetchCards = async () => {
        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/homepage-cards")
            const data = await res.json()
            if (data.cards) setCardsData(data.cards)
            if (data.courses) setDbCourses(data.courses)
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load cards")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCards()
    }, [])

    const handleSaveAll = async () => {
        setIsSaving(true)
        setErrorMsg(null)
        setSuccessMsg(null)

        try {
            const res = await fetch("/api/admin/homepage-cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cards: cardsData }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to save")

            setSuccessMsg("All homepage course cards saved successfully! Public homepage updated.")
            setTimeout(() => setSuccessMsg(null), 4000)
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to save homepage cards")
        } finally {
            setIsSaving(false)
        }
    }

    // Auto-fill form from selected DB Course
    const handleSelectCourse = (courseId: string) => {
        setSelectedCourseId(courseId)
        const course = dbCourses.find((c) => c.id === courseId)
        if (!course) return

        setFormTitle(course.title)
        setFormSlug(course.slug)
        setFormClassTag(
            activeTab === "skills"
                ? "Skills"
                : activeTab === "upsc"
                ? "UPSC"
                : activeTab === "bpsc"
                ? "BPSC"
                : activeTab.replace("class-", "Class ") + "th"
        )
        setFormTargetText(course.description ? course.description.slice(0, 80) : "Comprehensive syllabus & lecture notes")
        setFormScheduleText("Self-Paced | Full Video Course | Watch Now")
        setFormPrice(course.price && course.price > 0 ? `₹${course.price.toLocaleString()}` : "Free")
        setFormOriginalPrice(course.originalPrice && course.originalPrice > 0 ? `₹${course.originalPrice.toLocaleString()}` : "")
        setFormDiscount(course.discountPercent && course.discountPercent > 0 ? `${course.discountPercent}% OFF` : "")
        setFormImage(course.thumbnailUrl || (activeTab === "skills" ? "/batch-skills.svg" : "/batch-blue.svg"))
        setFormButtonText("Enroll Now")
        setFormButtonLink(`/courses/${course.slug}`)
        setFormIsLive(true)
    }

    const openAddModal = () => {
        setEditingIndex(null)
        setSelectedCourseId("")
        setFormTitle("")
        setFormSlug("")
        setFormClassTag(
            activeTab === "skills"
                ? "Skills"
                : activeTab === "upsc"
                ? "UPSC"
                : activeTab === "bpsc"
                ? "BPSC"
                : activeTab.replace("class-", "Class ") + "th"
        )
        setFormLanguage("HINGLISH")
        setFormTargetText("Comprehensive syllabus & study notes")
        setFormScheduleText("Self-Paced | Video Course")
        setFormPrice("₹999")
        setFormOriginalPrice("₹1,499")
        setFormDiscount("33% OFF")
        setFormImage(activeTab === "skills" ? "/batch-skills.svg" : "/batch-blue.svg")
        setFormButtonText("Enroll Now")
        setFormButtonLink("/courses")
        setFormIsLive(true)
        setIsModalOpen(true)
    }

    const openEditModal = (batch: BatchCard, index: number) => {
        setEditingIndex(index)
        setSelectedCourseId("")
        setFormTitle(batch.title)
        setFormSlug(batch.slug || "")
        setFormClassTag(batch.classTag)
        setFormLanguage(batch.language || "HINGLISH")
        setFormTargetText(batch.targetText)
        setFormScheduleText(batch.scheduleText)
        setFormPrice(batch.price)
        setFormOriginalPrice(batch.originalPrice || "")
        setFormDiscount(batch.discount || "")
        setFormImage(batch.image)
        setFormButtonText(batch.buttonText)
        setFormButtonLink(batch.buttonLink)
        setFormIsLive(batch.isLive ?? true)
        setIsModalOpen(true)
    }

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formTitle.trim()) return

        const newBatch: BatchCard = {
            id: editingIndex !== null
                ? currentBatches[editingIndex].id
                : `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: formTitle.trim(),
            slug: formSlug.trim() || undefined,
            classTag: formClassTag.trim(),
            language: formLanguage,
            targetText: formTargetText.trim(),
            scheduleText: formScheduleText.trim(),
            price: formPrice.trim(),
            originalPrice: formOriginalPrice.trim() || undefined,
            discount: formDiscount.trim() || undefined,
            image: formImage.trim() || "/batch-skills.svg",
            buttonText: formButtonText.trim() || "Enroll Now",
            buttonLink: formButtonLink.trim() || `/courses/${formSlug.trim()}`,
            isLive: formIsLive,
            isPrimaryAction: true,
        }

        const updatedBatches = [...currentBatches]
        if (editingIndex !== null) {
            updatedBatches[editingIndex] = newBatch
        } else {
            updatedBatches.unshift(newBatch) // add new card to top
        }

        setCardsData((prev) => ({
            ...prev,
            [activeTab]: {
                sectionTitle: prev[activeTab]?.sectionTitle || `${formClassTag} Batches`,
                batches: updatedBatches,
            },
        }))

        setIsModalOpen(false)
    }

    const handleDeleteCard = (index: number) => {
        if (!confirm("Remove this course card from the homepage?")) return
        const updatedBatches = currentBatches.filter((_, i) => i !== index)
        setCardsData((prev) => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                batches: updatedBatches,
            },
        }))
    }

    const handleMoveCard = (index: number, direction: "up" | "down") => {
        const targetIndex = direction === "up" ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= currentBatches.length) return

        const updatedBatches = [...currentBatches]
        const temp = updatedBatches[index]
        updatedBatches[index] = updatedBatches[targetIndex]
        updatedBatches[targetIndex] = temp

        setCardsData((prev) => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                batches: updatedBatches,
            },
        }))
    }

    const currentSection = cardsData[activeTab] || { sectionTitle: "", batches: [] }
    const currentBatches = currentSection.batches || []

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-indigo-600 text-white flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            HomePage Card Studio
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                            Zero-Latency &bull; Curated Flashcards
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#10162F]">HomePage Card Studio</h1>
                    <p className="text-gray-600 mt-1 font-medium text-sm">
                        Build, match slugs, and customize course cards for the homepage without any live database latency.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Link
                        href="/"
                        target="_blank"
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview Homepage
                    </Link>

                    <Button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold shadow-sm flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : "Save All Changes"}
                    </Button>
                </div>
            </div>

            {/* Notifications */}
            {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Tab Selector Bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {TABS.map((tab) => {
                        const count = cardsData[tab.id]?.batches?.length || 0
                        const isSelected = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 ${
                                    isSelected
                                        ? "bg-[#5B47FB] text-white shadow-sm"
                                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                        isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <Button
                    onClick={openAddModal}
                    className="bg-[#5B47FB] hover:bg-[#4a36ea] text-white font-bold text-xs flex items-center gap-1.5 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    + Create Card for {TABS.find((t) => t.id === activeTab)?.label}
                </Button>
            </div>

            {/* Cards Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                    <span>
                        {currentBatches.length} Cards in {TABS.find((t) => t.id === activeTab)?.label}
                    </span>
                    <span>Order (Left to Right on Homepage)</span>
                </div>

                {currentBatches.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8 space-y-3">
                        <Layers className="w-10 h-10 text-gray-400 mx-auto" />
                        <h3 className="text-base font-bold text-gray-900">No cards in this section yet</h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                            Click &quot;Create Card&quot; above to select a course from your database and match its slug for the homepage.
                        </p>
                        <Button onClick={openAddModal} className="bg-[#5B47FB] text-white font-bold text-xs">
                            + Add First Card
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentBatches.map((batch, index) => (
                            <div
                                key={batch.id || index}
                                className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[#5B47FB]/60 shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
                            >
                                <div>
                                    {/* Card Top Banner */}
                                    <div className="relative h-44 w-full bg-gray-100 overflow-hidden border-b border-gray-100">
                                        <img
                                            src={batch.image || "/batch-skills.svg"}
                                            alt={batch.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                                            {batch.isLive ? "Live Course" : "Upcoming"}
                                        </div>
                                        <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
                                            slug: {batch.slug || "none"}
                                        </div>
                                    </div>

                                    {/* Card Content Body */}
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#F26522]">{batch.classTag}</span>
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {batch.language || "HINGLISH"}
                                            </span>
                                        </div>

                                        <h3 className="font-extrabold text-base text-gray-900 line-clamp-1">
                                            {batch.title}
                                        </h3>

                                        <p className="text-xs text-gray-600 line-clamp-2">
                                            {batch.targetText}
                                        </p>

                                        <div className="text-[11px] text-gray-500 font-medium">
                                            {batch.scheduleText}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer & Studio Controls */}
                                <div className="p-4 pt-3 border-t border-gray-100 bg-gray-50/50 space-y-3">
                                    <div className="flex items-baseline justify-between">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-lg font-black text-gray-900">{batch.price}</span>
                                            {batch.originalPrice && (
                                                <span className="text-xs text-gray-400 line-through">
                                                    {batch.originalPrice}
                                                </span>
                                            )}
                                        </div>
                                        {batch.discount && (
                                            <span className="text-[11px] font-bold text-emerald-600">
                                                {batch.discount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Studio Order & Edit Action Buttons */}
                                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-gray-200/70">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleMoveCard(index, "up")}
                                                disabled={index === 0}
                                                title="Move card left / up"
                                                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                                            >
                                                <MoveLeft className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveCard(index, "down")}
                                                disabled={index === currentBatches.length - 1}
                                                title="Move card right / down"
                                                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                                            >
                                                <MoveRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditModal(batch, index)}
                                                className="h-8 px-2.5 text-xs font-bold border-gray-300 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 flex items-center gap-1"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                                Edit
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDeleteCard(index)}
                                                className="h-8 px-2.5 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Create or Edit Card */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-extrabold text-[#10162F]">
                                {editingIndex !== null ? "Edit Homepage Card" : `Create New Card for ${TABS.find((t) => t.id === activeTab)?.label}`}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-700 text-xl font-bold px-2"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            {/* Course Auto-Fill Selector */}
                            <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 space-y-1.5">
                                <label className="block font-bold text-indigo-900">
                                    Quick 1-Click Auto-Fill from Video Course Studio
                                </label>
                                <select
                                    value={selectedCourseId}
                                    onChange={(e) => handleSelectCourse(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white font-semibold text-gray-800"
                                >
                                    <option value="">-- Choose a course to auto-fill title, slug &amp; pricing --</option>
                                    {dbCourses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} (slug: {c.slug} | ₹{c.price || 0})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Title & Slug */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Card Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-gray-900"
                                        placeholder="e.g. Actual Video course1"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Course Slug *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formSlug}
                                        onChange={(e) => {
                                            setFormSlug(e.target.value)
                                            setFormButtonLink(`/courses/${e.target.value}`)
                                        }}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-gray-900"
                                        placeholder="e.g. actual"
                                    />
                                </div>
                            </div>

                            {/* Class Tag & Language */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Class / Category Tag</label>
                                    <input
                                        type="text"
                                        value={formClassTag}
                                        onChange={(e) => setFormClassTag(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200"
                                        placeholder="e.g. Skills, Class 10th, UPSC"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Language</label>
                                    <select
                                        value={formLanguage}
                                        onChange={(e) => setFormLanguage(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200"
                                    >
                                        <option value="HINGLISH">HINGLISH</option>
                                        <option value="ENGLISH">ENGLISH</option>
                                        <option value="HINDI">HINDI</option>
                                    </select>
                                </div>
                            </div>

                            {/* Target Text & Schedule Text */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Target / Syllabus Text</label>
                                    <input
                                        type="text"
                                        value={formTargetText}
                                        onChange={(e) => setFormTargetText(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200"
                                        placeholder="e.g. Build Real-world AI & Web Projects"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Schedule / Lecture Text</label>
                                    <input
                                        type="text"
                                        value={formScheduleText}
                                        onChange={(e) => setFormScheduleText(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200"
                                        placeholder="e.g. Self-Paced | 2 Full Video Lectures | Watch Now"
                                    />
                                </div>
                            </div>

                            {/* Pricing & Discount */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Price Tag</label>
                                    <input
                                        type="text"
                                        value={formPrice}
                                        onChange={(e) => setFormPrice(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold"
                                        placeholder="e.g. ₹999 or Free"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Original Price</label>
                                    <input
                                        type="text"
                                        value={formOriginalPrice}
                                        onChange={(e) => setFormOriginalPrice(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200"
                                        placeholder="e.g. ₹1,599"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Discount Badge</label>
                                    <input
                                        type="text"
                                        value={formDiscount}
                                        onChange={(e) => setFormDiscount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-emerald-700 font-bold"
                                        placeholder="e.g. 38% OFF"
                                    />
                                </div>
                            </div>

                            {/* Image URL & Button Link */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Card Banner / Image URL</label>
                                    <input
                                        type="text"
                                        value={formImage}
                                        onChange={(e) => setFormImage(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-[11px]"
                                        placeholder="/batch-skills.svg or /uploads/..."
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Button Link URL</label>
                                    <input
                                        type="text"
                                        value={formButtonLink}
                                        onChange={(e) => setFormButtonLink(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-[11px]"
                                        placeholder="/courses/actual"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#5B47FB] hover:bg-[#4a36ea] text-white font-bold text-xs"
                                >
                                    {editingIndex !== null ? "Update Card" : "Add to Homepage"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
