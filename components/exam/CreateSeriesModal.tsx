"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    X,
    Sparkles,
    Check,
    Plus,
    Trash2,
    Layers,
    Shield,
    Globe,
    Zap,
    BookOpen,
    Eye,
    ArrowUp,
    ArrowDown
} from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"

const LOGO_OPTIONS = [
    { id: "upsc", label: "UPSC Emblem" },
    { id: "bpsc", label: "BPSC Bodhi Tree" },
    { id: "uppcs", label: "UPPSC Seal" },
    { id: "ncert", label: "NCERT Birds" },
    { id: "ssc", label: "SSC Emblem" },
    { id: "sbi", label: "SBI Banking" },
    { id: "rrb", label: "RRB Railways" },
    { id: "general", label: "General Series" },
]

const CATEGORY_OPTIONS = [
    "UPSC",
    "BPSC",
    "BPSC TRE",
    "Class 10",
    "Class 9",
    "Class 8",
    "Class 7",
    "Class 6",
    "Skill",
]

interface CreateSeriesModalProps {
    isOpen: boolean
    onClose: () => void
    onCreated?: (series: any) => void
    defaultCategory?: string
}

export default function CreateSeriesModal({
    isOpen,
    onClose,
    onCreated,
    defaultCategory = "UPSC"
}: CreateSeriesModalProps) {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [category, setCategory] = useState(defaultCategory)
    const [customCategory, setCustomCategory] = useState("")
    const [logoType, setLogoType] = useState<any>(
        defaultCategory.toLowerCase().includes("bpsc") ? "bpsc" : "upsc"
    )
    const [languages, setLanguages] = useState("English, Hindi")
    const [highlights, setHighlights] = useState<string[]>([""])
    const [description, setDescription] = useState("")
    const [bannerUrl, setBannerUrl] = useState("")
    const [syllabus, setSyllabus] = useState("")
    const [keyFeatures, setKeyFeatures] = useState<string[]>([""])
    const [whyThisSeries, setWhyThisSeries] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createdItem, setCreatedItem] = useState<any | null>(null)

    if (!isOpen) return null

    const handleAddHighlight = () => {
        setHighlights((prev) => [...prev, ""])
    }

    const handleUpdateHighlight = (index: number, val: string) => {
        setHighlights((prev) => {
            const next = [...prev]
            next[index] = val
            return next
        })
    }

    const handleRemoveHighlight = (index: number) => {
        setHighlights((prev) => prev.filter((_, i) => i !== index))
    }

    const handleAddKeyFeature = () => {
        setKeyFeatures((prev) => [...prev, ""])
    }

    const handleUpdateKeyFeature = (index: number, val: string) => {
        setKeyFeatures((prev) => {
            const next = [...prev]
            next[index] = val
            return next
        })
    }

    const handleRemoveKeyFeature = (index: number) => {
        setKeyFeatures((prev) => prev.filter((_, i) => i !== index))
    }

    const handleMoveKeyFeature = (index: number, direction: "up" | "down") => {
        setKeyFeatures((prev) => {
            const next = [...prev]
            const targetIdx = direction === "up" ? index - 1 : index + 1
            if (targetIdx < 0 || targetIdx >= next.length) return prev
            const temp = next[index]
            next[index] = next[targetIdx]
            next[targetIdx] = temp
            return next
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setIsSubmitting(true)
        setError(null)
        const finalCategory = customCategory.trim() || category
        const payload = {
            title: title.trim(),
            category: finalCategory,
            logoType,
            languages,
            highlights: highlights.map((h) => h.trim()).filter((h) => h.length > 0),
            description: description.trim(),
            bannerUrl: bannerUrl.trim() || null,
            syllabus: syllabus.trim() || null,
            keyFeatures: keyFeatures.map((f) => f.trim()).filter((f) => f.length > 0),
            whyThisSeries: whyThisSeries.trim() || null,
        }

        try {
            const res = await fetch("/api/exam/series/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const json = await res.json()

            if (!res.ok || !json.data) {
                throw new Error(json.error || `Failed to create package (status: ${res.status})`)
            }

            const newItem = json.data

            setCreatedItem(newItem)
            if (onCreated) onCreated(newItem)
        } catch (err: any) {
            console.error("Error creating test series:", err)
            setError(err.message || "Failed to create package. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-8">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0ea5e9] to-[#00A8FF] flex items-center justify-center text-white shadow-xs">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-gray-900">
                                Create New Test Series Package
                            </h2>
                            <p className="text-xs text-gray-500">
                                Design the Flash Card &amp; Details Hub for your series
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {createdItem ? (
                    /* ── SUCCESS STATE ──────────────────────────────────── */
                    <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                            <Check className="h-8 w-8 stroke-[3]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-900">
                                Test Series Package Created Successfully!
                            </h3>
                            <p className="text-sm text-gray-600 max-w-md mx-auto">
                                <strong>"{createdItem.title}"</strong> is now live on the Test Series catalogue under <strong>{createdItem.category}</strong>.
                            </p>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-4">
                            <button
                                onClick={() => {
                                    onClose()
                                    router.push(`/test-series/${createdItem.id}`)
                                }}
                                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors flex items-center gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                View Details Page
                            </button>
                            <button
                                onClick={() => {
                                    onClose()
                                    router.push(`/teacher/test-series/create?seriesId=${createdItem.id}`)
                                }}
                                className="px-5 py-2.5 rounded-xl bg-[#00A8FF] text-white font-bold text-xs hover:bg-[#0096e6] transition-colors flex items-center gap-2 shadow-xs"
                            >
                                <Plus className="h-4 w-4" />
                                Add Tests in Studio Now
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── FORM + LIVE PREVIEW ───────────────────────────── */
                    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row">
                        {/* Left Form Controls */}
                        <div className="flex-1 p-6 space-y-5 max-h-[75vh] overflow-y-auto border-r border-gray-100">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-bold border border-red-200">
                                    {error}
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Package Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. UPSC Civil Services Exam (Prelims) 2026 Mock Test Series"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A8FF]"
                                />
                            </div>

                            {/* Category & Logo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Exam Segment / Category
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00A8FF]"
                                    >
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                        <option value="Custom">+ Custom Category...</option>
                                    </select>
                                    {category === "Custom" && (
                                        <input
                                            type="text"
                                            placeholder="Enter custom category name..."
                                            value={customCategory}
                                            onChange={(e) => setCustomCategory(e.target.value)}
                                            className="mt-2 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Emblem / Logo Style
                                    </label>
                                    <select
                                        value={logoType}
                                        onChange={(e) => setLogoType(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00A8FF]"
                                    >
                                        {LOGO_OPTIONS.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Languages */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Languages Supported
                                </label>
                                <input
                                    type="text"
                                    value={languages}
                                    onChange={(e) => setLanguages(e.target.value)}
                                    placeholder="e.g. English, Hindi"
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold"
                                />
                            </div>

                            {/* Flash Card Highlights (Bullet points) */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-gray-700">
                                        Flash Card Highlights (Bullets)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddHighlight}
                                        className="text-[11px] font-bold text-[#00A8FF] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="h-3 w-3" /> Add Bullet
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {highlights.map((h, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="text-gray-400 text-xs">•</span>
                                            <input
                                                type="text"
                                                value={h}
                                                onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                                                placeholder={`e.g. Highlight ${idx + 1}`}
                                                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-1 focus:ring-[#00A8FF]"
                                            />
                                            {highlights.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveHighlight(idx)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Overview / Description for Details Page */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Package Overview (For Details Page)
                                </label>
                                <textarea
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Comprehensive description for the details page banner..."
                                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#00A8FF]"
                                />
                            </div>

                            {/* Test Banner */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Test Banner (Recommended: 1200x400px or 16:9 aspect ratio, max 5MB)
                                </label>
                                <ImageUpload
                                    value={bannerUrl}
                                    onChange={(url) => setBannerUrl(url)}
                                    onRemove={() => setBannerUrl("")}
                                    folder="test-series-banners"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Displays as the hero visual banner on the learner-side details page.
                                </p>
                            </div>

                            {/* Syllabus for the Whole Series */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Series Syllabus (Full Curriculum Outline)
                                </label>
                                <textarea
                                    rows={4}
                                    value={syllabus}
                                    onChange={(e) => setSyllabus(e.target.value)}
                                    placeholder="Outline the full test series syllabus (topics, subjects, phases)..."
                                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#00A8FF] leading-relaxed"
                                />
                            </div>

                            {/* Key Features of the Test Series */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-gray-700">
                                        Key Features of the Test Series (Repeatable)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddKeyFeature}
                                        className="text-[11px] font-bold text-[#00A8FF] hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="h-3 w-3" /> Add Feature
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {keyFeatures.map((feat, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            <span className="text-gray-400 text-xs font-bold w-5 text-right">{idx + 1}.</span>
                                            <input
                                                type="text"
                                                value={feat}
                                                onChange={(e) => handleUpdateKeyFeature(idx, e.target.value)}
                                                placeholder={`e.g. Detailed Bilingual Video Solutions for all questions`}
                                                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-1 focus:ring-[#00A8FF]"
                                            />
                                            <button
                                                type="button"
                                                disabled={idx === 0}
                                                onClick={() => handleMoveKeyFeature(idx, "up")}
                                                className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded cursor-pointer"
                                                title="Move feature up"
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={idx === keyFeatures.length - 1}
                                                onClick={() => handleMoveKeyFeature(idx, "down")}
                                                className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded cursor-pointer"
                                                title="Move feature down"
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </button>
                                            {keyFeatures.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveKeyFeature(idx)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                                                    title="Remove feature"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Why This Test Series */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Why This Test Series (Pedagogy &amp; Value Proposition)
                                </label>
                                <textarea
                                    rows={3}
                                    value={whyThisSeries}
                                    onChange={(e) => setWhyThisSeries(e.target.value)}
                                    placeholder="Highlight why learners should enroll in this specific series..."
                                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#00A8FF] leading-relaxed"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !title.trim()}
                                    className="px-6 py-2.5 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <span>Creating...</span>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            <span>Publish Test Series Package</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right: Live Flash Card Preview */}
                        <div className="w-full lg:w-80 p-6 bg-gray-50/70 flex flex-col items-center justify-center shrink-0 border-t lg:border-t-0 border-gray-100">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
                                <Eye className="h-3 w-3" /> Live Flash Card Preview
                            </span>

                            {/* Card Mockup matching /test-series exactly */}
                            <div className="w-full bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center text-[10px] font-black uppercase text-slate-700">
                                        {(logoType || "gen").slice(0, 4)}
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold flex items-center gap-1">
                                        ⚡ 0 Users
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-sm font-extrabold text-gray-900 line-clamp-2 leading-snug">
                                        {title || "Your Test Series Title Will Appear Here"}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold mt-1">
                                        <span>0 Total Tests</span>
                                        <span>•</span>
                                        <span className="text-emerald-600 font-bold">0 Free Tests</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                        <Globe className="h-2.5 w-2.5" />
                                        <span>{languages || "English, Hindi"}</span>
                                    </div>
                                </div>

                                <ul className="space-y-1 text-[11px] text-gray-600">
                                    {highlights.filter(h => h.trim().length > 0).slice(0, 4).map((h, i) => (
                                        <li key={i} className="flex items-start gap-1.5 leading-tight">
                                            <span className="text-gray-300">•</span>
                                            <span className="line-clamp-1">{h}</span>
                                        </li>
                                    ))}
                                    {highlights.filter(h => h.trim().length > 0).length === 0 && (
                                        <li className="text-[11px] text-gray-400 italic">No highlights added</li>
                                    )}
                                </ul>

                                <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                                    <div className="flex-1 py-2 rounded-xl bg-[#00A8FF] text-white text-center text-xs font-bold shadow-xs">
                                        View Test Series
                                    </div>
                                    <div className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400">
                                        +
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
