"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  X,
  Layers,
  Sparkles,
  Lock,
  Globe,
  Sliders,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"
import { toast } from "sonner"

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
  "Civil Services",
  "Banking",
  "Railways",
  "State PSC",
  "Skill",
]

export interface EditPackageModalProps {
  isOpen: boolean
  onClose: () => void
  pkg: {
    id: string
    slug: string
    title: string
    examName?: string | null
    category: string
    description?: string | null
    thumbnailUrl?: string | null
    bannerUrl?: string | null
    syllabus?: string | null
    keyFeatures?: string[]
    whyThisSeries?: string | null
    logoType?: string | null
    languages?: string
    highlights?: string[]
    isFree?: boolean
    isPro?: boolean
    isPublished?: boolean
    isGated?: boolean
    previewPercentage?: number
    seoMode?: string
    gateTitle?: string | null
    gateSubtitle?: string | null
    updatedAt?: string
  }
  basePath: string
  onUpdated: (updated: any) => void
}

export default function EditPackageModal({
  isOpen,
  onClose,
  pkg,
  basePath,
  onUpdated,
}: EditPackageModalProps) {
  const router = useRouter()

  const [title, setTitle] = useState(pkg.title || "")
  const [slug, setSlug] = useState(pkg.slug || "")
  const [examName, setExamName] = useState(pkg.examName || "")
  const [category, setCategory] = useState(pkg.category || "UPSC")
  const [customCategory, setCustomCategory] = useState("")
  const [description, setDescription] = useState(pkg.description || "")
  const [thumbnailUrl, setThumbnailUrl] = useState(pkg.thumbnailUrl || "")
  const [bannerUrl, setBannerUrl] = useState(pkg.bannerUrl || "")
  const [syllabus, setSyllabus] = useState(pkg.syllabus || "")
  const [keyFeatures, setKeyFeatures] = useState<string[]>(
    pkg.keyFeatures && pkg.keyFeatures.length > 0 ? pkg.keyFeatures : [""]
  )
  const [whyThisSeries, setWhyThisSeries] = useState(pkg.whyThisSeries || "")
  const [logoType, setLogoType] = useState(pkg.logoType || "general")
  const [languages, setLanguages] = useState(pkg.languages || "English, Hindi")
  const [highlights, setHighlights] = useState<string[]>(
    pkg.highlights && pkg.highlights.length > 0 ? pkg.highlights : [""]
  )

  // Pricing / Tier
  const [isFree, setIsFree] = useState(Boolean(pkg.isFree))
  const [isPro, setIsPro] = useState(pkg.isPro !== undefined ? Boolean(pkg.isPro) : true)
  const [isPublished, setIsPublished] = useState(Boolean(pkg.isPublished))

  // Authwall gating
  const [isGated, setIsGated] = useState(Boolean(pkg.isGated))
  const [previewPercentage, setPreviewPercentage] = useState(pkg.previewPercentage ?? 20)
  const [seoMode, setSeoMode] = useState(pkg.seoMode || "preview")
  const [gateTitle, setGateTitle] = useState(pkg.gateTitle || "")
  const [gateSubtitle, setGateSubtitle] = useState(pkg.gateSubtitle || "")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(pkg.title || "")
      setSlug(pkg.slug || "")
      setExamName(pkg.examName || "")
      if (CATEGORY_OPTIONS.includes(pkg.category)) {
        setCategory(pkg.category)
        setCustomCategory("")
      } else {
        setCategory("Other")
        setCustomCategory(pkg.category)
      }
      setDescription(pkg.description || "")
      setThumbnailUrl(pkg.thumbnailUrl || "")
      setBannerUrl(pkg.bannerUrl || "")
      setSyllabus(pkg.syllabus || "")
      setKeyFeatures(pkg.keyFeatures && pkg.keyFeatures.length > 0 ? pkg.keyFeatures : [""])
      setWhyThisSeries(pkg.whyThisSeries || "")
      setLogoType(pkg.logoType || "general")
      setLanguages(pkg.languages || "English, Hindi")
      setHighlights(pkg.highlights && pkg.highlights.length > 0 ? pkg.highlights : [""])
      setIsFree(Boolean(pkg.isFree))
      setIsPro(pkg.isPro !== undefined ? Boolean(pkg.isPro) : true)
      setIsPublished(Boolean(pkg.isPublished))
      setIsGated(Boolean(pkg.isGated))
      setPreviewPercentage(pkg.previewPercentage ?? 20)
      setSeoMode(pkg.seoMode || "preview")
      setGateTitle(pkg.gateTitle || "")
      setGateSubtitle(pkg.gateSubtitle || "")
      setError(null)
      setIsDirty(false)
    }
  }, [isOpen, pkg])

  const markDirty = () => {
    if (!isDirty) setIsDirty(true)
  }

  const handleClose = () => {
    if (isDirty && !confirm("You have unsaved changes. Are you sure you want to discard them?")) {
      return
    }
    onClose()
  }

  const handleAddHighlight = () => {
    setHighlights((prev) => [...prev, ""])
    markDirty()
  }

  const handleUpdateHighlight = (index: number, val: string) => {
    setHighlights((prev) => {
      const next = [...prev]
      next[index] = val
      return next
    })
    markDirty()
  }

  const handleRemoveHighlight = (index: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== index))
    markDirty()
  }

  const handleAddKeyFeature = () => {
    setKeyFeatures((prev) => [...prev, ""])
    markDirty()
  }

  const handleUpdateKeyFeature = (index: number, val: string) => {
    setKeyFeatures((prev) => {
      const next = [...prev]
      next[index] = val
      return next
    })
    markDirty()
  }

  const handleRemoveKeyFeature = (index: number) => {
    setKeyFeatures((prev) => prev.filter((_, i) => i !== index))
    markDirty()
  }

  const handleMoveKeyFeature = (index: number, direction: "up" | "down") => {
    setKeyFeatures((prev) => {
      const target = direction === "up" ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const temp = next[index]
      next[index] = next[target]
      next[target] = temp
      return next
    })
    markDirty()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError("Package title cannot be empty")
      return
    }

    const finalCategory = (category === "Other" ? customCategory : category).trim()
    if (!finalCategory) {
      setError("Category is required")
      return
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")

    if (!cleanSlug) {
      setError("A valid slug is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const payload = {
      title: title.trim(),
      slug: cleanSlug,
      examName: examName.trim() || finalCategory,
      category: finalCategory,
      description: description.trim() || null,
      thumbnailUrl: thumbnailUrl.trim() || null,
      bannerUrl: bannerUrl.trim() || null,
      syllabus: syllabus.trim() || null,
      keyFeatures: keyFeatures.map((f) => f.trim()).filter(Boolean),
      whyThisSeries: whyThisSeries.trim() || null,
      logoType,
      languages: languages.trim() || "English, Hindi",
      highlights: highlights.map((h) => h.trim()).filter(Boolean),
      isFree,
      isPro,
      isPublished,
      isGated,
      previewPercentage: Math.max(0, Math.min(100, Number(previewPercentage) || 20)),
      seoMode,
      gateTitle: gateTitle.trim() || null,
      gateSubtitle: gateSubtitle.trim() || null,
      expectedUpdatedAt: pkg.updatedAt,
    }

    try {
      const res = await fetch(`/api/exam/series/packages/${encodeURIComponent(pkg.slug || pkg.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update package")
      }

      toast.success("Package details updated successfully")
      setIsDirty(false)
      onUpdated(data.data)

      // If slug changed, update browser URL smoothly
      if (cleanSlug !== pkg.slug) {
        router.replace(`${basePath}/package/${cleanSlug}`)
      }

      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to update package. Please retry.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0a1628] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">Edit Test Series Package</DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Update package metadata, catalog discovery, pricing tier, and gating rules.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Core Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              1. Basic Information
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Package Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  markDirty()
                }}
                required
                placeholder="e.g. BPSC 71st Prelims GS Test Series"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    markDirty()
                  }}
                  required
                  placeholder="bpsc-71st-prelims-test-series"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-mono text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Target: /test-series/{slug || "slug"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Category / Exam Goal <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value)
                      markDirty()
                    }}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Other">Other (Custom)</option>
                  </select>
                  {category === "Other" && (
                    <input
                      type="text"
                      placeholder="Category name"
                      value={customCategory}
                      onChange={(e) => {
                        setCustomCategory(e.target.value)
                        markDirty()
                      }}
                      className="w-1/2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Exam Target Subtitle
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => {
                    setExamName(e.target.value)
                    markDirty()
                  }}
                  placeholder="e.g. BPSC Civil Services"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Logo / Emblem Type
                </label>
                <select
                  value={logoType}
                  onChange={(e) => {
                    setLogoType(e.target.value)
                    markDirty()
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs font-semibold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                >
                  {LOGO_OPTIONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  markDirty()
                }}
                placeholder="Comprehensive description of package curriculum and target exams..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF]"
              />
            </div>
          </div>

          {/* Section 2: Media, Languages, Highlights */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              2. Catalog Display &amp; Highlights
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Thumbnail / Cover URL
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => {
                    setThumbnailUrl(e.target.value)
                    markDirty()
                  }}
                  placeholder="https://... image banner"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Supported Languages
                </label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => {
                    setLanguages(e.target.value)
                    markDirty()
                  }}
                  placeholder="English, Hindi"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                />
              </div>
            </div>

            {/* Highlights Array */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Key Highlights / Features
                </label>
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A8FF] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Highlight</span>
                </button>
              </div>

              <div className="space-y-2">
                {highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                      placeholder={`Highlight #${idx + 1} (e.g. 15 Full-length Mocks)`}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[40px]"
                    />
                    {highlights.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Remove highlight"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Details Page Banner & Syllabus Content */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              3. Details Page Content (Banner, Syllabus, Features)
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Test Banner (Recommended: 1200x400px or 16:9 aspect ratio, max 5MB)
              </label>
              <ImageUpload
                value={bannerUrl}
                onChange={(url: string) => {
                  setBannerUrl(url)
                  markDirty()
                }}
                onRemove={() => {
                  setBannerUrl("")
                  markDirty()
                }}
                folder="test-series-banners"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Displays as the hero visual banner on the learner-side details page.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Series Syllabus (Full Curriculum Outline)
              </label>
              <textarea
                rows={4}
                value={syllabus}
                onChange={(e) => {
                  setSyllabus(e.target.value)
                  markDirty()
                }}
                placeholder="Outline the full test series syllabus (topics, subjects, phases)..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Key Features of the Test Series (Repeatable)
                </label>
                <button
                  type="button"
                  onClick={handleAddKeyFeature}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A8FF] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Feature</span>
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
                      placeholder="e.g. Detailed Bilingual Video Solutions for all questions"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] min-h-[40px]"
                    />
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveKeyFeature(idx, "up")}
                      className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                      title="Move feature up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === keyFeatures.length - 1}
                      onClick={() => handleMoveKeyFeature(idx, "down")}
                      className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                      title="Move feature down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    {keyFeatures.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyFeature(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                        aria-label="Remove feature"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Why This Test Series (Value Proposition &amp; Pedagogy)
              </label>
              <textarea
                rows={3}
                value={whyThisSeries}
                onChange={(e) => {
                  setWhyThisSeries(e.target.value)
                  markDirty()
                }}
                placeholder="Explain why students should take this test series (curated by toppers, real exam pattern, etc.)..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#071d33] text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-[#00A8FF] leading-relaxed"
              />
            </div>
          </div>

          {/* Section 4: Pricing Tier & Publication Status */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              4. Pricing Tier &amp; Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#071d33] space-y-2">
                <span className="text-xs font-bold block">Publication</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => {
                      setIsPublished(e.target.checked)
                      markDirty()
                    }}
                    className="rounded text-[#00A8FF] h-4 w-4"
                  />
                  <span>Published to Catalog</span>
                </label>
                <p className="text-[10px] text-gray-400">
                  {isPublished ? "Visible to students" : "Draft (Admins & Author only)"}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#071d33] space-y-2">
                <span className="text-xs font-bold block">Free Tier</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => {
                      setIsFree(e.target.checked)
                      markDirty()
                    }}
                    className="rounded text-[#00A8FF] h-4 w-4"
                  />
                  <span>100% Free Series</span>
                </label>
                <p className="text-[10px] text-gray-400">
                  Accessible to all students without purchasing.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#071d33] space-y-2">
                <span className="text-xs font-bold block">TrillionPass Inclusion</span>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isPro}
                    onChange={(e) => {
                      setIsPro(e.target.checked)
                      markDirty()
                    }}
                    className="rounded text-[#00A8FF] h-4 w-4"
                  />
                  <span>Included in TrillionPass</span>
                </label>
                <p className="text-[10px] text-gray-400">
                  Subscribers get full access automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Authwall Gate Settings */}
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                5. Authwall Gate Rules
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#00A8FF]">
                <input
                  type="checkbox"
                  checked={isGated}
                  onChange={(e) => {
                    setIsGated(e.target.checked)
                    markDirty()
                  }}
                  className="rounded text-[#00A8FF] h-4 w-4"
                />
                <span>Enable Gate Paywall</span>
              </label>
            </div>

            {isGated && (
              <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Preview Percentage ({previewPercentage}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={previewPercentage}
                      onChange={(e) => {
                        setPreviewPercentage(Number(e.target.value))
                        markDirty()
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Guests and free learners can sample {previewPercentage}% of content.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      SEO Bot Mode
                    </label>
                    <select
                      value={seoMode}
                      onChange={(e) => {
                        setSeoMode(e.target.value)
                        markDirty()
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-xs font-semibold focus:outline-hidden focus:border-[#00A8FF] min-h-[44px]"
                    >
                      <option value="preview">Preview (Index preview portion only)</option>
                      <option value="bot-full">Full Index (Verified Bots see full questions)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Paywall Title
                    </label>
                    <input
                      type="text"
                      value={gateTitle}
                      onChange={(e) => {
                        setGateTitle(e.target.value)
                        markDirty()
                      }}
                      placeholder="e.g. Unlock Full Mock Series"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-xs focus:outline-hidden focus:border-[#00A8FF] min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Paywall Subtitle
                    </label>
                    <input
                      type="text"
                      value={gateSubtitle}
                      onChange={(e) => {
                        setGateSubtitle(e.target.value)
                        markDirty()
                      }}
                      placeholder="e.g. Enrolled or Pass members get unrestricted access"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#071d33] text-xs focus:outline-hidden focus:border-[#00A8FF] min-h-[40px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs transition-colors min-h-[44px]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="save-package-btn"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0080ff] hover:from-[#0096e6] hover:to-[#0070e6] text-white font-bold text-xs shadow-lg shadow-[#00A8FF]/20 transition-all cursor-pointer min-h-[44px]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
