"use client"

import React, { useState } from "react"
import { Book, BookProductDetail } from "@/lib/books/types"
import PdfUploader from "@/components/upload/PdfUploader"
import BookImageGallery from "@/components/books/BookImageGallery"
import {
  Upload,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  Save,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
  DollarSign,
  Tag,
  ArrowLeft,
  X,
  ExternalLink,
} from "lucide-react"
import Image from "next/image"

export interface BookEditorProps {
  initialBook?: Partial<Book>
  role: "ADMIN" | "TEACHER"
  onSaveSuccess: (savedBook: Book) => void
  onCancel?: () => void
}

const CATEGORIES = ["UPSC", "BPSC", "10th", "9th", "8th", "Skills", "Notes"]

const DEFAULT_PRODUCT_DETAILS: BookProductDetail[] = [
  { label: "Format", value: "PDF" },
  { label: "Pages", value: "240" },
  { label: "Language", value: "English" },
  { label: "Publisher", value: "AspirantBook Publications" },
  { label: "Edition", value: "2026 Edition" },
  { label: "Year", value: "2026" },
  { label: "File Size", value: "18.5 MB" },
]

export default function BookEditor({
  initialBook,
  role,
  onSaveSuccess,
  onCancel,
}: BookEditorProps) {
  // Form State
  const [title, setTitle] = useState(initialBook?.title || "")
  const [subtitle, setSubtitle] = useState(initialBook?.subtitle || "")
  const [author, setAuthor] = useState(initialBook?.author || (role === "ADMIN" ? "AspirantBook Academic Team" : "Faculty"))
  const [category, setCategory] = useState(initialBook?.category || "UPSC")
  const [subject, setSubject] = useState(initialBook?.subject || "General Studies")
  const [language, setLanguage] = useState(initialBook?.language || "English")
  const [edition, setEdition] = useState(initialBook?.edition || "2026 Edition")
  const [pages, setPages] = useState<number>(initialBook?.pages || 240)
  const [fileSizeMb, setFileSizeMb] = useState<number>(initialBook?.fileSizeMb || 18.5)

  // Images (up to 8, first is cover)
  const [images, setImages] = useState<string[]>(
    initialBook?.images && initialBook.images.length > 0
      ? initialBook.images
      : initialBook?.coverImage
      ? [initialBook.coverImage]
      : ["/images/books/cbse-10-solved-papers.svg"]
  )
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Pricing
  const [price, setPrice] = useState<number>(initialBook?.price || 499)
  const [mrp, setMrp] = useState<number>(initialBook?.mrp || initialBook?.originalPrice || 799)

  // Descriptions
  const [shortDescription, setShortDescription] = useState(
    initialBook?.shortDescription || "Comprehensive high-yield study material and solved papers."
  )
  const [description, setDescription] = useState(
    initialBook?.description ||
      "Comprehensive exam preparation eBook designed by top subject matter experts.\n\nIncludes chapter-wise breakdown, high-scoring revision notes, previous years questions with solutions and syllabus textbook references."
  )

  // Product Details key/value rows
  const [productDetails, setProductDetails] = useState<BookProductDetail[]>(
    initialBook?.productDetails && initialBook.productDetails.length > 0
      ? initialBook.productDetails
      : DEFAULT_PRODUCT_DETAILS
  )

  // Target Audience & Delivery
  const [whoCanBuy, setWhoCanBuy] = useState(
    initialBook?.whoCanBuy || "UPSC & State PSC aspirants, Class 10 & 12 students, and competitive learners."
  )
  const [deliveryNote, setDeliveryNote] = useState(
    initialBook?.deliveryNote || "Digital PDF only. Instant online access, no physical copy, no shipping."
  )

  // Highlights
  const [highlights, setHighlights] = useState<string[]>(
    initialBook?.highlights && initialBook.highlights.length > 0
      ? initialBook.highlights
      : [
          "Instant eBook Delivery: Searchable & printable high-res PDF",
          "Complete syllabus coverage with syllabus textbook references",
          "Detailed model answers with step-by-step marking breakdown",
        ]
  )
  const [newHighlight, setNewHighlight] = useState("")

  // PDF URLs
  const [samplePdfUrl, setSamplePdfUrl] = useState(initialBook?.samplePdfUrl || "")
  const [fullPdfUrl, setFullPdfUrl] = useState(initialBook?.fullPdfUrl || "")
  const [sampleFileName, setSampleFileName] = useState("")
  const [fullFileName, setFullFileName] = useState("")

  // Tags & Status
  const [tags, setTags] = useState<string[]>(initialBook?.tags || ["eBook", "PDF", "Prep"])
  const [tagInput, setTagInput] = useState("")

  // Status & Submit State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<"card" | "details">("card")

  // Auto-calculated discount percent
  const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0

  // Handle Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (images.length >= 8) {
      setError("Maximum of 8 images allowed.")
      return
    }

    setIsUploadingImage(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "image")

      const res = await fetch("/api/books/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to upload image")

      setImages((prev) => [...prev, data.url])
    } catch (err: any) {
      setError(err.message || "Failed to upload image")
    } finally {
      setIsUploadingImage(false)
      e.target.value = ""
    }
  }

  const removeImage = (index: number) => {
    if (images.length <= 1) {
      setError("At least one book image/cover is required.")
      return
    }
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const moveImage = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= images.length) return
    setImages((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[target]
      copy[target] = temp
      return copy
    })
  }

  // Highlights handlers
  const addHighlight = () => {
    if (!newHighlight.trim()) return
    setHighlights((prev) => [...prev, newHighlight.trim()])
    setNewHighlight("")
  }

  const removeHighlight = (idx: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== idx))
  }

  // Key-value Product Details handlers
  const updateProductDetail = (index: number, field: "label" | "value", val: string) => {
    setProductDetails((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item))
    )
  }

  const addProductDetailRow = () => {
    setProductDetails((prev) => [...prev, { label: "Attribute", value: "" }])
  }

  const removeProductDetailRow = (index: number) => {
    setProductDetails((prev) => prev.filter((_, i) => i !== index))
  }

  // Tags handlers
  const addTag = () => {
    if (!tagInput.trim()) return
    if (!tags.includes(tagInput.trim())) {
      setTags((prev) => [...prev, tagInput.trim()])
    }
    setTagInput("")
  }

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((item) => item !== t))
  }

  // Save / Publish
  const handleSave = async (submitForPublish: boolean) => {
    setError(null)
    if (!title.trim()) {
      setError("Book Name is required.")
      return
    }

    if (price <= 0) {
      setError("Please enter a valid price greater than 0.")
      return
    }

    if (price > mrp) {
      setError("Selling price cannot be greater than MRP.")
      return
    }

    if (submitForPublish && !fullPdfUrl && !samplePdfUrl && role === "ADMIN") {
      setError("A Full PDF document must be uploaded before publishing.")
      return
    }

    // Role-based status:
    // Admin: published or draft
    // Teacher: pending or draft
    let status: "draft" | "pending" | "published" = "draft"
    if (submitForPublish) {
      status = role === "ADMIN" ? "published" : "pending"
    }

    setIsSubmitting(true)

    // Ensure Product Details have up to date Pages and File size
    const finalProductDetails = productDetails.map((pd) => {
      if (pd.label.toLowerCase() === "pages") return { ...pd, value: String(pages) }
      if (pd.label.toLowerCase() === "file size") return { ...pd, value: `${fileSizeMb} MB` }
      if (pd.label.toLowerCase() === "language") return { ...pd, value: language }
      if (pd.label.toLowerCase() === "edition") return { ...pd, value: edition }
      return pd
    })

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      author: author.trim(),
      category,
      subject: subject.trim(),
      language,
      edition,
      pages: Number(pages),
      fileSizeMb: Number(fileSizeMb),
      fileSize: `${fileSizeMb} MB`,
      price: Number(price),
      originalPrice: Number(mrp),
      mrp: Number(mrp),
      discountPercent,
      images,
      coverImage: images[0],
      thumbnails: images.map((url, i) => ({
        id: `thumb-${i + 1}`,
        label: i === 0 ? "Cover Image" : `Sample Page ${i + 1}`,
        url,
        type: (i === 0 ? "cover" : "sample") as "cover" | "sample",
      })),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      productDetails: finalProductDetails,
      whoCanBuy: whoCanBuy.trim(),
      deliveryNote: deliveryNote.trim(),
      highlights,
      features: highlights,
      samplePdfUrl,
      fullPdfUrl,
      tags,
      status,
    }

    try {
      const isEdit = Boolean(initialBook?.id)
      const url = isEdit ? `/api/books/${initialBook!.id}` : "/api/books"
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save book")
      }

      onSaveSuccess(data.data)
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the book.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Preview Object
  const previewBook: Book = {
    id: initialBook?.id || "preview",
    slug: "preview-book",
    title: title || "Your Book Name",
    subtitle,
    author: author || "Author Name",
    publisher: "AspirantBook Publications",
    category,
    subject,
    edition,
    price,
    originalPrice: mrp,
    mrp,
    discountPercent,
    rating: 4.9,
    ratingCount: 1,
    reviewCount: 1,
    salesCount: 0,
    coverImage: images[0] || "/images/books/cbse-10-solved-papers.svg",
    images,
    thumbnails: images.map((url, i) => ({
      id: `p-thumb-${i}`,
      label: i === 0 ? "Cover Image" : `Page ${i + 1}`,
      url,
      type: (i === 0 ? "cover" : "sample") as "cover" | "sample",
    })),
    description,
    shortDescription,
    features: highlights,
    highlights,
    productDetails,
    whoCanBuy,
    deliveryNote,
    pages,
    language,
    format: "PDF",
    fileSize: `${fileSizeMb} MB`,
    fileSizeMb,
    samplePdfUrl,
    fullPdfUrl,
  }

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Back to list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {initialBook?.id ? "Edit Book" : "Create New Book"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {role === "ADMIN"
                ? "Create and publish digital PDF books to the store."
                : "Submit digital PDF books for Admin review and store publishing."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold transition-all"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-black transition-all shadow-2xs active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            data-testid="submit-book-btn"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black transition-all shadow-md active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {role === "ADMIN" ? "Publish to Store" : "Submit for Approval"}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left 2 Cols Form, Right 1 Col Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>1. Basic Book Information</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                  Book Name / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  data-testid="book-name-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. UPSC Prelims General Studies 15 Years Solved Papers"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Author / Teacher Name
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Dr. R. Kumar / Academic Faculty"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Comprehensive Chapterwise Solved & Marking Guidelines"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Science, Polity, History"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. English, Hindi, Bilingual"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Edition
                  </label>
                  <input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    placeholder="e.g. 2026 Edition"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Number of Pages
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={pages}
                    onChange={(e) => setPages(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    File Size (MB)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    value={fileSizeMb}
                    onChange={(e) => setFileSizeMb(Number(e.target.value) || 0.1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Multiple Images (Up to 8, first is cover) */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-600" />
                  <span>2. Book Images &amp; Previews (Up to 8)</span>
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  The first image serves as the main Cover. Drag or use the arrows to reorder.
                </p>
              </div>

              <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs">
                <Plus className="w-3.5 h-3.5" />
                <span>{isUploadingImage ? "Uploading..." : "Add Image"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleImageFileChange}
                  disabled={isUploadingImage || images.length >= 8}
                  className="hidden"
                />
              </label>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative group bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-2 flex flex-col items-center"
                >
                  {/* Cover Tag for First Image */}
                  {idx === 0 && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                      Cover
                    </span>
                  )}

                  <div className="w-full aspect-[3/4] flex items-center justify-center overflow-hidden rounded-lg mb-2">
                    <Image
                      src={imgUrl}
                      alt={`Book image ${idx + 1}`}
                      width={300}
                      height={400}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between w-full pt-1 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                        title="Move left/up"
                      >
                        <MoveUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, "down")}
                        disabled={idx === images.length - 1}
                        className="p-1 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                        title="Move right/down"
                      >
                        <MoveDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Pricing & MRP */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>3. Pricing &amp; Discounts</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                  Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  data-testid="book-price-input"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-sm font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                  MRP / Strike-through (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  data-testid="book-mrp-input"
                  value={mrp}
                  onChange={(e) => setMrp(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col justify-center">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  Calculated Discount
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {discountPercent}% OFF
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Descriptions & Target Audience */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-600" />
              <span>4. Descriptions, Audience &amp; Delivery</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                  Short Description (Card Summary)
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="One or two line summary for catalog card and highlights"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                  Full Description (Markdown or Rich Text)
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    Who Can Buy (Target Audience)
                  </label>
                  <input
                    type="text"
                    value={whoCanBuy}
                    onChange={(e) => setWhoCanBuy(e.target.value)}
                    placeholder="e.g. UPSC aspirants, CBSE 10th students"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-1">
                    What You Get / Delivery Note
                  </label>
                  <input
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Highlights / Bullet Points */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>5. Highlights &amp; Bullet Points</span>
            </h3>

            <div className="space-y-2">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold text-xs">&bull;</span>
                  <span className="text-xs text-gray-800 dark:text-gray-200 flex-1">{h}</span>
                  <button
                    type="button"
                    onClick={() => removeHighlight(i)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addHighlight()
                    }
                  }}
                  placeholder="Add a new highlight bullet..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addHighlight}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Section 6: Product Details (Key / Value Rows) */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-600" />
                <span>6. Product Details (Key/Value Specifications)</span>
              </h3>
              <button
                type="button"
                onClick={addProductDetailRow}
                className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2">
              {productDetails.map((pd, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pd.label}
                    onChange={(e) => updateProductDetail(idx, "label", e.target.value)}
                    placeholder="Key (e.g. Publisher)"
                    className="w-1/3 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={pd.value}
                    onChange={(e) => updateProductDetail(idx, "value", e.target.value)}
                    placeholder="Value (e.g. 2026 Edition)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => removeProductDetailRow(idx)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: PDF Uploads (Sample & Full PDF) */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-5">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>7. PDF Documents</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sample PDF */}
              <div className="p-4 bg-gray-50/60 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                <PdfUploader
                  label="Sample PDF (Optional Free Preview)"
                  description="Students can read online or download this sample before buying."
                  currentUrl={samplePdfUrl}
                  currentFileName={sampleFileName}
                  folder="books-sample"
                  onUploadSuccess={(res) => {
                    setSamplePdfUrl(res.url)
                    setSampleFileName(res.fileName)
                  }}
                  onClear={() => {
                    setSamplePdfUrl("")
                    setSampleFileName("")
                  }}
                />
              </div>

              {/* Full PDF */}
              <div className="p-4 bg-sky-50/40 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800 space-y-2">
                <PdfUploader
                  label="Full eBook PDF (Required to Publish)"
                  description="Protected and served exclusively to buyers and staff via secure route."
                  required={true}
                  currentUrl={fullPdfUrl}
                  currentFileName={fullFileName}
                  folder="books-secure"
                  onUploadSuccess={(res) => {
                    setFullPdfUrl(res.url)
                    setFullFileName(res.fileName)
                    if (res.fileSizeMb) setFileSizeMb(res.fileSizeMb)
                    if (res.detectedPages && res.detectedPages > 0) setPages(res.detectedPages)
                  }}
                  onClear={() => {
                    setFullPdfUrl("")
                    setFullFileName("")
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 8: Tags */}
          <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
              8. Tags &amp; Search Keywords
            </h3>

            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-rose-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Add keyword tag..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold"
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview Panel (4-5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-md p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  Live Preview Panel
                </span>
              </div>

              <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab("card")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewTab === "card"
                      ? "bg-white dark:bg-slate-800 text-sky-600 shadow-2xs"
                      : "text-gray-500 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("details")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewTab === "details"
                      ? "bg-white dark:bg-slate-800 text-sky-600 shadow-2xs"
                      : "text-gray-500 hover:text-black dark:hover:text-white"
                  }`}
                >
                  Details
                </button>
              </div>
            </div>

            {/* Preview Container */}
            {previewTab === "card" ? (
              <div className="max-w-[280px] mx-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-3 shadow-md">
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-2 mb-2">
                  <Image
                    src={previewBook.coverImage}
                    alt={previewBook.title}
                    fill
                    sizes="280px"
                    className="object-contain drop-shadow"
                  />
                  {/* Heart Icon top right */}
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center text-rose-500">
                    &hearts;
                  </div>
                </div>

                <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                  {previewBook.title}
                </h4>

                <div className="mt-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                    {previewBook.edition}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-sm font-black text-gray-950 dark:text-white">
                    ₹{previewBook.price}
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    ₹{previewBook.originalPrice}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    ({previewBook.discountPercent}% off)
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <BookImageGallery
                  images={previewBook.images || [previewBook.coverImage]}
                  title={previewBook.title}
                  showHeart={true}
                />

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-sky-600">
                    {previewBook.category} &bull; {previewBook.subject}
                  </span>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white">
                    {previewBook.title}
                  </h4>
                  <span className="text-xs text-gray-500 block">By {previewBook.author}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-gray-950 dark:text-white">
                    ₹{previewBook.price}
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    MRP ₹{previewBook.originalPrice}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600">
                    ({previewBook.discountPercent}% OFF)
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 dark:bg-slate-900 rounded-xl space-y-1">
                  <span className="font-bold text-gray-800 dark:text-gray-200 block">
                    Product Details:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                    <div>Pages: {previewBook.pages}</div>
                    <div>Format: PDF</div>
                    <div>Size: {previewBook.fileSize}</div>
                    <div>Language: {previewBook.language}</div>
                  </div>
                </div>

                <div className="p-2.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl text-[11px] text-sky-900 dark:text-sky-200 font-medium">
                  {previewBook.deliveryNote}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
