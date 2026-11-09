"use client"

import React, { useState } from "react"
import { Book } from "@/lib/books/types"
import { CATEGORIES_TREE, SUBJECTS_LIST } from "@/lib/books/data"
import { X, Sparkles, BookOpen, Upload, CheckCircle2, AlertCircle } from "lucide-react"
import Image from "next/image"

interface CreateBookModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newBook: Book) => void
}

const PRESET_COVERS = [
  { label: "CBSE 10 Solved Papers", url: "/images/books/cbse-10-solved-papers.svg" },
  { label: "CBSE 10 4-in-1 Combo", url: "/images/books/cbse-10-bundle.svg" },
  { label: "72nd BPSC Current Affairs", url: "/images/books/bpsc-current-affairs.svg" },
  { label: "RD Sharma Mathematics", url: "/images/books/rd-sharma-maths.svg" },
  { label: "UPSC Indian Polity", url: "/images/books/indian-polity.svg" },
  { label: "BPSC 25 Years Solved", url: "/images/books/bpsc-solved-papers.svg" },
  { label: "CBSE Social Science", url: "/images/books/cbse-10-social-science.svg" },
  { label: "CBSE English First Flight", url: "/images/books/cbse-10-english.svg" },
]

export default function CreateBookModal({ isOpen, onClose, onSuccess }: CreateBookModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    author: "AspirantBook Academic Team",
    publisher: "AspirantBook Publications",
    category: "CBSE Class 10th Books",
    subcategory: "Previous Year Papers",
    subject: "Science",
    edition: "2026 Edition",
    price: 499,
    originalPrice: 699,
    pages: 280,
    fileSize: "16.4 MB",
    language: "English",
    coverImage: "/images/books/cbse-10-solved-papers.svg",
    description: "",
    shortDescription: "",
    features: "100% Solved Papers with point-wise marking scheme\nNCERT textbook references for every question\nInstant eBook Delivery with interactive reader access\nSearchable and highlightable high-resolution PDF",
    samplePdfUrl: "",
    fullPdfUrl: "",
    isBestseller: false,
    isFeatured: true,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const discountPercent =
    formData.originalPrice > formData.price
      ? Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError("Please enter a title for the eBook.")
      return
    }

    if (formData.price <= 0) {
      setError("Please enter a valid selling price greater than 0.")
      return
    }

    setLoading(true)
    try {
      const featuresArray = formData.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)

      const payload = {
        ...formData,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        pages: Number(formData.pages),
        features: featuresArray,
        thumbnails: [
          {
            id: `thumb-${Date.now()}-1`,
            label: "Front Cover",
            url: formData.coverImage,
            type: "cover",
          },
          {
            id: `thumb-${Date.now()}-2`,
            label: "Contents Page",
            url: "/images/books/cbse-10-contents.svg",
            type: "contents",
          },
          {
            id: `thumb-${Date.now()}-3`,
            label: "Sample Pages",
            url: "/images/books/cbse-10-sample-sci.svg",
            type: "sample",
          },
        ],
      }

      const res = await fetch("/api/admin/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create eBook")
      }

      onSuccess(data.data)
      onClose()
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-100 animate-in fade-in-50 zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-teal-600 text-white px-2 py-0.5 rounded-full">
                  Sell & Publish eBook
                </span>
                <span className="text-xs text-gray-400 font-semibold">eCommerce Inventory</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">Add New eBook to Bookstore</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs">1</span>
              eBook Title & Identity
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Full eBook Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. PW UPSC CSE 2026: Indian Polity & Governance Chapter-wise Solved Mindmaps"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs text-gray-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Subtitle / Catchphrase
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g. Complete 10 Years Previous Solved Papers with Concept Maps & NCERT references"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs text-gray-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Author Name / Faculty</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Publisher</label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Taxonomy & Pricing */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs">2</span>
              Category, Subject & Pricing (eCommerce)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                >
                  {CATEGORIES_TREE.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="Engineering & Coding">Engineering & Coding</option>
                  <option value="General Competitive Exams">General Competitive Exams</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                >
                  {SUBJECTS_LIST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Computer Science">Computer Science</option>
                  <option value="Current Affairs & GK">Current Affairs & GK</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Edition</label>
                <input
                  type="text"
                  value={formData.edition}
                  onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                />
              </div>
            </div>

            {/* Pricing Box */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-extrabold text-teal-900 mb-1">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-teal-300 focus:border-teal-600 bg-white text-sm font-black text-teal-950"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Original MRP (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-600 bg-white text-sm font-medium text-gray-900"
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-teal-200 text-center">
                <span className="text-[11px] font-bold text-gray-500 block uppercase">Calculated Discount</span>
                <span className="text-lg font-black text-emerald-600">{discountPercent}% OFF</span>
                <span className="text-[10px] text-gray-400 block">
                  Buyer saves ₹{Math.max(0, formData.originalPrice - formData.price)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Cover Image Selection */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs">3</span>
              Cover Art & Presentation
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Choose from Preset Cover Designs</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setFormData({ ...formData, coverImage: preset.url })}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs transition-all ${
                      formData.coverImage === preset.url
                        ? "border-teal-600 bg-teal-50/50 text-teal-900 font-bold ring-2 ring-teal-500/20"
                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}
                  >
                    <div className="w-8 h-10 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                      <Image src={preset.url} alt="" width={32} height={40} className="h-full w-full object-cover" />
                    </div>
                    <span className="truncate text-[11px]">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Or Custom Cover Image URL
              </label>
              <input
                type="text"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                placeholder="/images/books/... or https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Section 4: Specifications & Highlights */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-black uppercase tracking-wider text-teal-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs">4</span>
              eBook Specs & Digital Delivery
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Total Pages</label>
                <input
                  type="number"
                  value={formData.pages}
                  onChange={(e) => setFormData({ ...formData, pages: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">PDF File Size</label>
                <input
                  type="text"
                  value={formData.fileSize}
                  onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                  placeholder="e.g. 24.8 MB"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Bilingual (Hindi + English)">Bilingual (Hindi + English)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Key Features & Smart Highlights (one per line)
              </label>
              <textarea
                rows={4}
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
              />
            </div>

            {/* Checkbox Badges */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <span>Featured in Bookstore Hero Showcase</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={formData.isBestseller}
                  onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <span>Mark with "Bestseller" Badge</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing eBook...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish & List in Bookstore</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
