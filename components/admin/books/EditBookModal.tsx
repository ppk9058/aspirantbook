"use client"

import React, { useState, useEffect } from "react"
import { Book } from "@/lib/books/types"
import { CATEGORIES_TREE, SUBJECTS_LIST } from "@/lib/books/data"
import { X, Save, AlertCircle, CheckCircle2 } from "lucide-react"

interface EditBookModalProps {
  isOpen: boolean
  book: Book | null
  onClose: () => void
  onSuccess: (updatedBook: Book) => void
}

export default function EditBookModal({ isOpen, book, onClose, onSuccess }: EditBookModalProps) {
  const [formData, setFormData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        subtitle: book.subtitle || "",
        author: book.author,
        publisher: book.publisher,
        category: book.category,
        subcategory: book.subcategory || "",
        subject: book.subject,
        edition: book.edition,
        price: book.price,
        originalPrice: book.originalPrice,
        pages: book.pages,
        fileSize: book.fileSize,
        language: book.language,
        coverImage: book.coverImage,
        description: book.description,
        features: (book.features || []).join("\n"),
        isBestseller: Boolean(book.isBestseller),
        isFeatured: Boolean(book.isFeatured),
      })
    }
  }, [book])

  if (!isOpen || !book || !formData) return null

  const discountPercent =
    formData.originalPrice > formData.price
      ? Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError("Title is required.")
      return
    }

    setLoading(true)
    try {
      const featuresArray = (formData.features || "")
        .split("\n")
        .map((f: string) => f.trim())
        .filter(Boolean)

      const payload = {
        ...formData,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        pages: Number(formData.pages),
        features: featuresArray,
      }

      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update eBook")
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 animate-in fade-in-50 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-900 text-white">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider bg-teal-600 text-white px-2 py-0.5 rounded-full">
              Edit eBook Details
            </span>
            <h2 className="text-lg font-black text-white mt-1 line-clamp-1">{book.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">eBook Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Author</label>
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

          {/* Pricing Row */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-extrabold text-teal-900 mb-1">Selling Price (₹)</label>
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
              <span className="text-base font-black text-emerald-600">{discountPercent}% OFF</span>
            </div>
          </div>

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
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pages</label>
              <input
                type="number"
                value={formData.pages}
                onChange={(e) => setFormData({ ...formData, pages: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Key Features (one per line)</label>
            <textarea
              rows={3}
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-xs text-gray-900 font-medium"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
              />
              <span>Featured eBook</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
              <input
                type="checkbox"
                checked={formData.isBestseller}
                onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
              />
              <span>Bestseller Tag</span>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
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
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md flex items-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
