"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Book, BookStatus } from "@/lib/books/types"
import BookEditor from "./BookEditor"
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileEdit,
  Trash2,
  Eye,
  ExternalLink,
  Send,
  AlertCircle,
  TrendingUp,
  Layers,
  ArrowUpDown,
} from "lucide-react"

export interface BookStudioClientProps {
  initialBooks: Book[]
  role: "ADMIN" | "TEACHER"
  currentUserId?: string
}

export default function BookStudioClient({
  initialBooks,
  role,
  currentUserId,
}: BookStudioClientProps) {
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")

  // Editor mode
  const [isCreating, setIsCreating] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Rejection Dialog state
  const [rejectingBook, setRejectingBook] = useState<Book | null>(null)
  const [rejectionReasonInput, setRejectionReasonInput] = useState("")
  const [rejectionError, setRejectionError] = useState<string | null>(null)

  const pendingCount = books.filter((b) => (b.status || "published") === "pending").length

  // Filter books
  const filteredBooks = books.filter((b) => {
    // Role filter: Teachers only see their own books in studio
    if (role === "TEACHER" && currentUserId && b.createdBy?.id && b.createdBy.id !== currentUserId) {
      return false
    }

    if (statusFilter !== "ALL") {
      const bStatus = b.status || "published"
      if (bStatus !== statusFilter) return false
    }

    if (categoryFilter !== "ALL" && b.category !== categoryFilter) {
      return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const inTitle = b.title.toLowerCase().includes(q)
      const inAuthor = b.author.toLowerCase().includes(q)
      const inCat = b.category.toLowerCase().includes(q)
      if (!inTitle && !inAuthor && !inCat) return false
    }

    return true
  })

  // Status badge helper
  const renderStatusBadge = (status?: BookStatus) => {
    const s = status || "published"
    switch (s) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Published
          </span>
        )
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="w-3 h-3" /> Pending Approval
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        )
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300">
            <FileEdit className="w-3 h-3" /> Draft
          </span>
        )
    }
  }

  // Actions
  const handleStatusChange = async (id: string, newStatus: BookStatus, reason?: string) => {
    try {
      // Optimistic/immediate local update
      setBooks((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: newStatus, rejectionReason: reason || b.rejectionReason } : b
        )
      )
      const res = await fetch(`/api/books/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, rejectionReason: reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update status")

      setBooks((prev) => prev.map((b) => (b.id === id ? data.data : b)))
      setFeedbackMsg({ type: "success", text: `Book status updated to ${newStatus}` })
      setTimeout(() => setFeedbackMsg(null), 3500)
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to update status" })
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return

    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete book")

      setBooks((prev) => prev.filter((b) => b.id !== id))
      setFeedbackMsg({ type: "success", text: `"${title}" has been deleted.` })
      setTimeout(() => setFeedbackMsg(null), 3500)
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to delete book" })
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
  }

  // If in Editor view
  if (isCreating || editingBook) {
    return (
      <div data-testid="book-studio-root" data-hydrated={isHydrated ? "true" : "false"} className="p-4 sm:p-6 max-w-7xl mx-auto">
        <BookEditor
          initialBook={editingBook || undefined}
          role={role}
          onSaveSuccess={(savedBook) => {
            if (editingBook) {
              setBooks((prev) => prev.map((b) => (b.id === savedBook.id ? savedBook : b)))
            } else {
              setBooks((prev) => [savedBook, ...prev])
            }
            setIsCreating(false)
            setEditingBook(null)
            setFeedbackMsg({
              type: "success",
              text: `"${savedBook.title}" successfully saved.`,
            })
            setTimeout(() => setFeedbackMsg(null), 3500)
          }}
          onCancel={() => {
            setIsCreating(false)
            setEditingBook(null)
          }}
        />
      </div>
    )
  }

  return (
    <div data-testid="book-studio-root" data-hydrated={isHydrated ? "true" : "false"} className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
              {role} Panel
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Book Studio
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {role === "ADMIN"
              ? "Create, publish, approve and manage digital PDF books sold on /books"
              : "Create, edit and submit your PDF eBooks for Admin review & store publishing"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/books"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            data-testid="create-book-btn"
            onClick={() => {
              setEditingBook(null)
              setIsCreating(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Book</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, or category..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {role === "ADMIN" && pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "pending" ? "ALL" : "pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Queue ({pendingCount})</span>
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="published">Published</option>
            <option value="pending">Pending Approval ({pendingCount})</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="UPSC">UPSC</option>
            <option value="BPSC">BPSC</option>
            <option value="10th">10th</option>
            <option value="9th">9th</option>
            <option value="8th">8th</option>
            <option value="Skills">Skills</option>
            <option value="Notes">Notes</option>
          </select>
        </div>
      </div>

      {/* Book List Table / Cards */}
      {filteredBooks.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/50 text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                  <th className="py-3 px-4">Book</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Price &amp; MRP</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Sales</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-xs">
                {filteredBooks.map((book) => {
                  const bStatus = book.status || "published"
                  return (
                    <tr
                      key={book.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      {/* Cover & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[240px] max-w-sm">
                          <div className="w-10 h-14 rounded-lg bg-gray-100 dark:bg-slate-900 p-0.5 border border-gray-200 dark:border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 dark:text-white line-clamp-1 block">
                              {book.title}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
                              By {book.author} &bull; {book.pages} pages
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200">
                          {book.category}
                        </span>
                      </td>

                      {/* Price & MRP */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 dark:text-white">
                            ₹{book.price}
                          </span>
                          <span className="text-[11px] text-gray-400 line-through">
                            ₹{book.mrp || book.originalPrice}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {renderStatusBadge(book.status)}
                          {book.status === "rejected" && book.rejectionReason && (
                            <span className="text-[10px] text-rose-600 block line-clamp-1">
                              {book.rejectionReason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales Count */}
                      <td className="py-3 px-3 font-semibold text-gray-700 dark:text-gray-300">
                        {book.salesCount || 0}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-3 text-gray-500 text-[11px]">
                        {book.createdAt
                          ? new Date(book.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Sep 2026"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Preview Link */}
                          <Link
                            href={`/books/${book.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                            title="Preview on Store"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBook(book)
                              setIsCreating(false)
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                            title="Edit Book"
                          >
                            <FileEdit className="w-4 h-4" />
                          </button>

                          {/* Admin Approve / Reject actions */}
                          {role === "ADMIN" && bStatus === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(book.id, "published")}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                data-testid={`reject-btn-${book.id}`}
                                onClick={() => {
                                  setRejectingBook(book)
                                  setRejectionReasonInput("")
                                  setRejectionError(null)
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* Admin toggle publish / unpublish */}
                          {role === "ADMIN" && bStatus === "published" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(book.id, "draft")}
                              className="px-2 py-1 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 text-[11px] font-bold"
                              title="Unpublish to Draft"
                            >
                              Unpublish
                            </button>
                          )}

                          {role === "ADMIN" && bStatus === "draft" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(book.id, "published")}
                              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold"
                              title="Publish directly"
                            >
                              Publish
                            </button>
                          )}

                          {/* Teacher submit for review if in draft or rejected */}
                          {role === "TEACHER" && (bStatus === "draft" || bStatus === "rejected") && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(book.id, "pending")}
                              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1"
                              title="Submit for Admin approval"
                            >
                              <Send className="w-3 h-3" />
                              <span>Submit</span>
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(book.id, book.title)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete Book"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 space-y-3">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            No books found matching criteria
          </h3>
          <p className="text-xs text-gray-500">
            Try adjusting your search terms or create a new book.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingBook(null)
              setIsCreating(true)
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
          >
            Create Book
          </button>
        </div>
      )}

      {/* Admin Rejection Dialog Modal */}
      {rejectingBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-800">
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                Reject Teacher Book Submission
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRejectingBook(null)
                  setRejectionError(null)
                }}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                Book: <span className="font-bold text-gray-900 dark:text-white">{rejectingBook.title}</span>
              </p>
              <p className="text-[11px] text-gray-500">
                Please provide specific feedback for the teacher so they can correct and resubmit.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                Rejection Reason (Required)
              </label>
              <textarea
                data-testid="rejection-reason-input"
                value={rejectionReasonInput}
                onChange={(e) => {
                  setRejectionReasonInput(e.target.value)
                  if (rejectionError) setRejectionError(null)
                }}
                placeholder="e.g. Full PDF is missing answer keys for Chapters 3 and 4. Please re-upload complete edition."
                rows={4}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              {rejectionError && (
                <p className="text-[11px] font-semibold text-rose-600">{rejectionError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingBook(null)
                  setRejectionError(null)
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-reject-btn"
                onClick={() => {
                  if (!rejectionReasonInput.trim()) {
                    setRejectionError("Please enter a rejection reason.")
                    return
                  }
                  handleStatusChange(rejectingBook.id, "rejected", rejectionReasonInput.trim())
                  setRejectingBook(null)
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
