"use client"

import { useState } from "react"
import Link from "next/link"
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowLeft,
} from "lucide-react"

interface SubExam {
  id: string
  categoryId: string
  name: string
  slug: string
  description?: string | null
  order: number
  isPublished: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  fullName?: string | null
  description?: string | null
  badgeColor?: string | null
  order: number
  isPublished: boolean
  subExams: SubExam[]
  _count: { papers: number; subExams: number }
}

export function ExamCategoriesManagerClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategories[0]?.id || ""
  )

  // Modals / forms state
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState("")
  const [catFullName, setCatFullName] = useState("")
  const [catSlug, setCatSlug] = useState("")
  const [catColor, setCatColor] = useState("#ea580c")
  const [catDescription, setCatDescription] = useState("")

  const [showSubModal, setShowSubModal] = useState(false)
  const [editingSub, setEditingSub] = useState<SubExam | null>(null)
  const [subName, setSubName] = useState("")
  const [subSlug, setSubSlug] = useState("")
  const [subDescription, setSubDescription] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const activeCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0]

  // Open Category Create/Edit Modal
  const openCategoryModal = (cat?: Category) => {
    setError(null)
    setSuccessMsg(null)
    if (cat) {
      setEditingCat(cat)
      setCatName(cat.name)
      setCatFullName(cat.fullName || "")
      setCatSlug(cat.slug)
      setCatColor(cat.badgeColor || "#ea580c")
      setCatDescription(cat.description || "")
    } else {
      setEditingCat(null)
      setCatName("")
      setCatFullName("")
      setCatSlug("")
      setCatColor("#ea580c")
      setCatDescription("")
    }
    setShowCatModal(true)
  }

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      if (editingCat) {
        // Update
        const res = await fetch(`/api/admin/pyqs/categories/${editingCat.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: catName,
            fullName: catFullName,
            slug: catSlug || undefined,
            badgeColor: catColor,
            description: catDescription,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Update failed")

        setCategories((prev) =>
          prev.map((c) => (c.id === editingCat.id ? { ...c, ...data } : c))
        )
        setSuccessMsg(`Category "${catName}" updated successfully!`)
      } else {
        // Create
        const res = await fetch("/api/admin/pyqs/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: catName,
            fullName: catFullName,
            slug: catSlug || undefined,
            badgeColor: catColor,
            description: catDescription,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Creation failed")

        const newCat: Category = {
          ...data,
          subExams: [],
          _count: { papers: 0, subExams: 0 },
        }
        setCategories((prev) => [...prev, newCat])
        setSelectedCategoryId(newCat.id)
        setSuccessMsg(`New Exam Category "${catName}" added!`)
      }

      setShowCatModal(false)
    } catch (err: any) {
      setError(err.message || "Failed to save category")
    } finally {
      setIsLoading(false)
    }
  }

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" and all its sub-exams? This action is irreversible.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/pyqs/categories/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")

      const updated = categories.filter((c) => c.id !== id)
      setCategories(updated)
      if (selectedCategoryId === id) {
        setSelectedCategoryId(updated[0]?.id || "")
      }
      setSuccessMsg(`Category "${name}" deleted.`)
    } catch (err: any) {
      setError(err.message || "Failed to delete category")
    }
  }

  // Open Sub-Exam Create/Edit Modal
  const openSubExamModal = (sub?: SubExam) => {
    setError(null)
    setSuccessMsg(null)
    if (sub) {
      setEditingSub(sub)
      setSubName(sub.name)
      setSubSlug(sub.slug)
      setSubDescription(sub.description || "")
    } else {
      setEditingSub(null)
      setSubName("")
      setSubSlug("")
      setSubDescription("")
    }
    setShowSubModal(true)
  }

  // Save Sub-Exam
  const handleSaveSubExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subName.trim() || !activeCategory) return

    setIsLoading(true)
    setError(null)

    try {
      if (editingSub) {
        // Update
        const res = await fetch(`/api/admin/pyqs/sub-exams/${editingSub.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: subName,
            slug: subSlug || undefined,
            description: subDescription,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Update failed")

        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== activeCategory.id) return cat
            return {
              ...cat,
              subExams: cat.subExams.map((s) => (s.id === editingSub.id ? { ...s, ...data } : s)),
            }
          })
        )
        setSuccessMsg(`Sub-exam "${subName}" updated!`)
      } else {
        // Create
        const res = await fetch("/api/admin/pyqs/sub-exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: activeCategory.id,
            name: subName,
            slug: subSlug || undefined,
            description: subDescription,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Creation failed")

        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== activeCategory.id) return cat
            return {
              ...cat,
              subExams: [...cat.subExams, data],
              _count: { ...cat._count, subExams: cat._count.subExams + 1 },
            }
          })
        )
        setSuccessMsg(`New sub-exam "${subName}" added under ${activeCategory.name}!`)
      }

      setShowSubModal(false)
    } catch (err: any) {
      setError(err.message || "Failed to save sub-exam")
    } finally {
      setIsLoading(false)
    }
  }

  // Delete Sub-Exam
  const handleDeleteSubExam = async (id: string, name: string) => {
    if (!confirm(`Delete sub-exam "${name}"?`)) return

    try {
      const res = await fetch(`/api/admin/pyqs/sub-exams/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")

      setCategories((prev) =>
        prev.map((cat) => {
          if (cat.id !== activeCategory?.id) return cat
          return {
            ...cat,
            subExams: cat.subExams.filter((s) => s.id !== id),
            _count: { ...cat._count, subExams: Math.max(0, cat._count.subExams - 1) },
          }
        })
      )
      setSuccessMsg(`Sub-exam "${name}" deleted.`)
    } catch (err: any) {
      setError(err.message || "Failed to delete sub-exam")
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/pyqs"
              className="text-xs font-semibold text-gray-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to PYQ Studio
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-orange-600" />
            Exam Categories & Sub-Exam Types
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure Major Exam Heads (UPSC, BPSC, UPPSC) and sub-exam specializations (CCE, CDPO, AEDO, TRE).
          </p>
        </div>

        <button
          onClick={() => openCategoryModal()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-sm shadow-orange-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add Major Exam Head
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2-Column Split Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Major Exam Heads (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Major Exam Heads</h2>
              <p className="text-xs text-gray-400">e.g. BPSC, UPSC, UPPSC, Boards</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
              {categories.length} Exams
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {categories.map((cat) => {
              const isSelected = cat.id === activeCategory?.id
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? "bg-orange-50/80 border-l-4 border-orange-600" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                      style={{ backgroundColor: cat.badgeColor || "#ea580c" }}
                    >
                      {cat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{cat.name}</span>
                        <span className="text-[11px] font-mono text-gray-400">/{cat.slug}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{cat.fullName || "Government Exam"}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {cat._count.subExams || cat.subExams.length} Sub-Exams • {cat._count.papers} PYQ Papers
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openCategoryModal(cat)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className={`w-4 h-4 ml-1 ${isSelected ? "text-orange-600" : "text-gray-300"}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Sub-Exam Types for Active Category (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {activeCategory ? (
            <div>
              {/* Category Active Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: activeCategory.badgeColor || "#ea580c" }}
                    />
                    <h2 className="font-bold text-gray-900 text-base">
                      Sub-Exam Types under {activeCategory.name}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeCategory.fullName || activeCategory.description || "Specialized branches and exams"}
                  </p>
                </div>

                <button
                  onClick={() => openSubExamModal()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Sub-Exam Type
                </button>
              </div>

              {/* Sub-Exams Table / List */}
              <div className="p-4">
                {activeCategory.subExams.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">No sub-exams added yet for {activeCategory.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click &quot;Add Sub-Exam Type&quot; above to create branches like CDPO, AEDO, TRE, etc.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {activeCategory.subExams.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-xl border border-gray-200/80 hover:border-orange-300 bg-white hover:bg-orange-50/20 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 text-xs font-mono font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 text-sm">{sub.name}</h3>
                              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-gray-100 text-gray-600 border border-gray-200">
                                slug: {sub.slug}
                              </span>
                            </div>
                            {sub.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{sub.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openSubExamModal(sub)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Sub-Exam"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubExam(sub.id, sub.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Sub-Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <p>Select or create a major exam head to manage sub-exams.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Major Category Create / Edit */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-base">
                {editingCat ? `Edit Exam Head: ${editingCat.name}` : "Create New Major Exam Head"}
              </h2>
              <button
                onClick={() => setShowCatModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Exam Short Name * (e.g. UPPSC, MPPSC, RAS, CBSE 10th)
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value)
                    if (!editingCat) {
                      setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))
                    }
                  }}
                  placeholder="e.g. UPPSC"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Authority Title (e.g. Uttar Pradesh Public Service Commission)
                </label>
                <input
                  type="text"
                  value={catFullName}
                  onChange={(e) => setCatFullName(e.target.value)}
                  placeholder="e.g. Uttar Pradesh Public Service Commission"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    placeholder="uppsc"
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Badge Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catColor}
                      onChange={(e) => setCatColor(e.target.value)}
                      className="w-9 h-9 p-0.5 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-gray-600">{catColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Official PCS, RO/ARO papers..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : editingCat ? "Save Changes" : "Create Exam Head"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sub-Exam Create / Edit */}
      {showSubModal && activeCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-base">
                {editingSub
                  ? `Edit Sub-Exam: ${editingSub.name}`
                  : `Add Sub-Exam under ${activeCategory.name}`}
              </h2>
              <button
                onClick={() => setShowSubModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubExam} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sub-Exam Name * (e.g. CDPO, AEDO, CCE Civil Services, TRE 3.0)
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => {
                    setSubName(e.target.value)
                    if (!editingSub) {
                      setSubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))
                    }
                  }}
                  placeholder="e.g. BPSC CDPO"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">URL Identifier / Slug</label>
                <input
                  type="text"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value)}
                  placeholder="cdpo"
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Pattern & Eligibility Description</label>
                <textarea
                  rows={2}
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                  placeholder="Child Development Project Officer recruitment examination..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : editingSub ? "Save Changes" : "Add Sub-Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
