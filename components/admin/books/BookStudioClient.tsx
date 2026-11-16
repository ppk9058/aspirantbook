"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Book, BookStatus } from "@/lib/books/types"
import BookEditor from "./BookEditor"
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileEdit,
  ExternalLink,
  Send,
  AlertCircle,
  TrendingUp,
  Layers,
  Archive,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  StudioStatusTabs,
  useStudioSelection,
  StudioBulkActionBar,
  StudioRowMenu,
  StudioDeleteImpactDialog,
} from "@/components/admin/studio"
import { toast } from "sonner"

export interface BookStudioClientProps {
  initialBooks: Book[]
  role: "ADMIN" | "TEACHER"
  currentUserId?: string
}

type BookStudioTab = "ALL" | "PUBLISHED" | "PENDING" | "DRAFT" | "REJECTED" | "ARCHIVED"

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
  const [activeTab, setActiveTab] = useState<BookStudioTab>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")

  // Editor mode
  const [isCreating, setIsCreating] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Rejection Dialog state
  const [rejectingBook, setRejectingBook] = useState<Book | null>(null)
  const [rejectionReasonInput, setRejectionReasonInput] = useState("")
  const [rejectionError, setRejectionError] = useState<string | null>(null)

  // Delete dialog state
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null)

  // Status counts calculation
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: 0,
      PUBLISHED: 0,
      PENDING: 0,
      DRAFT: 0,
      REJECTED: 0,
      ARCHIVED: 0,
    }

    for (const b of books) {
      if (role === "TEACHER" && currentUserId && b.createdBy?.id && b.createdBy.id !== currentUserId) {
        continue
      }
      counts.ALL++
      const s = (b.status || "published").toLowerCase()
      if (s === "published") counts.PUBLISHED++
      else if (s === "pending") counts.PENDING++
      else if (s === "draft") counts.DRAFT++
      else if (s === "rejected") counts.REJECTED++
      else if (s === "archived") counts.ARCHIVED++
      else counts.DRAFT++
    }

    return counts
  }, [books, role, currentUserId])

  const tabs = useMemo(
    () => [
      { id: "ALL" as const, label: "All Books", count: statusCounts.ALL },
      { id: "PUBLISHED" as const, label: "Published", count: statusCounts.PUBLISHED },
      { id: "PENDING" as const, label: "Pending Approval", count: statusCounts.PENDING },
      { id: "DRAFT" as const, label: "Drafts", count: statusCounts.DRAFT },
      { id: "REJECTED" as const, label: "Rejected", count: statusCounts.REJECTED },
      { id: "ARCHIVED" as const, label: "Archived", count: statusCounts.ARCHIVED },
    ],
    [statusCounts]
  )

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      // Role filter: Teachers only see their own books in studio
      if (role === "TEACHER" && currentUserId && b.createdBy?.id && b.createdBy.id !== currentUserId) {
        return false
      }

      const bStatus = (b.status || "published").toUpperCase()
      if (activeTab === "PUBLISHED" && bStatus !== "PUBLISHED") return false
      if (activeTab === "PENDING" && bStatus !== "PENDING") return false
      if (activeTab === "DRAFT" && bStatus !== "DRAFT") return false
      if (activeTab === "REJECTED" && bStatus !== "REJECTED") return false
      if (activeTab === "ARCHIVED" && bStatus !== "ARCHIVED") return false

      if (categoryFilter !== "ALL" && b.category !== categoryFilter) {
        return false
      }

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = b.title.toLowerCase().includes(q)
        const matchAuthor = b.author.toLowerCase().includes(q)
        const matchSubject = b.subject.toLowerCase().includes(q)
        if (!matchTitle && !matchAuthor && !matchSubject) return false
      }

      return true
    })
  }, [books, role, currentUserId, activeTab, categoryFilter, search])

  // Bulk selection hook
  const {
    selectedIds,
    selectedCount,
    allSelected,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  } = useStudioSelection({
    items: filteredBooks,
    getItemId: (b) => b.id,
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
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Archive className="w-3 h-3" /> Archived
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
      toast.success(`Book status updated to ${newStatus}`)
      setTimeout(() => setFeedbackMsg(null), 3500)
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to update status" })
      toast.error(err.message || "Failed to update status")
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
  }

  const handleToggleArchive = async (book: Book) => {
    const isCurrentlyArchived = book.status === "archived"
    const nextStatus = isCurrentlyArchived ? (role === "ADMIN" ? "published" : "draft") : "archived"
    try {
      const res = await fetch(`/api/books/${book.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isCurrentlyArchived }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update archive status")

      setBooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, status: nextStatus } : b))
      )
      const msg = isCurrentlyArchived
        ? `Restored "${book.title}" successfully`
        : `Archived "${book.title}" successfully`
      setFeedbackMsg({ type: "success", text: msg })
      toast.success(msg)
      setTimeout(() => setFeedbackMsg(null), 3500)
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to toggle archive state" })
      toast.error(err.message || "Failed to toggle archive state")
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
  }

  // Bulk actions
  const handleBulkAction = async (action: "publish" | "unpublish" | "archive" | "restore" | "delete" | "reject") => {
    if (selectedIds.length === 0) return
    try {
      const res = await fetch("/api/books/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookIds: selectedIds, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Bulk ${action} failed`)

      if (action === "delete") {
        setBooks((prev) => prev.filter((b) => !selectedIds.includes(b.id)))
        toast.success(`Deleted ${data.affected} book(s)`)
      } else {
        const nextStatus =
          action === "publish" || action === "restore"
            ? "published"
            : action === "unpublish"
            ? "draft"
            : action === "archive"
            ? "archived"
            : "rejected"
        setBooks((prev) =>
          prev.map((b) =>
            selectedIds.includes(b.id) ? { ...b, status: nextStatus } : b
          )
        )
        toast.success(`Updated status for ${data.affected} book(s)`)
      }
      clearSelection()
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Bulk action failed" })
      toast.error(err.message || "Bulk action failed")
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
  }

  // Delete impact dialog confirmation
  const handleConfirmHardDelete = async () => {
    if (!bookToDelete) return
    const id = bookToDelete.id

    const res = await fetch(`/api/books/${id}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete book")
    }

    setBooks((prev) => prev.filter((b) => b.id !== id))
    toast.success(`Deleted book "${bookToDelete.title}"`)
    setBookToDelete(null)
  }

  const handleConfirmArchiveInstead = async () => {
    if (!bookToDelete) return
    await handleToggleArchive(bookToDelete)
    setBookToDelete(null)
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
              text: `"${savedBook.title}" has been saved.`,
            })
            setTimeout(() => setFeedbackMsg(null), 4000)
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
    <div
      data-testid="book-studio-root"
      data-hydrated={isHydrated ? "true" : "false"}
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
              <BookOpen className="w-3.5 h-3.5" />
              {role === "ADMIN" ? "Admin Book Studio" : "Teacher Publisher Studio"}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              &bull; AspirantBook Store Catalogue
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Online Bookstore Studio
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl">
            {role === "ADMIN"
              ? "Full catalogue oversight: review incoming teacher book submissions, publish official editions, manage metadata, and monitor distribution."
              : "Publish and sell your books, study notes, and compendiums. Submit for verification to reach thousands of aspirants."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/books"
            target="_blank"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            title="Preview Student Bookstore"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          <button
            type="button"
            data-testid="create-book-btn"
            onClick={() => {
              setEditingBook(null)
              setIsCreating(true)
            }}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-2 shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Book</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2 text-xs font-bold border animate-in fade-in ${
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Catalogue</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {statusCounts.ALL}
          </div>
          <span className="text-[11px] text-gray-400">Total books listed</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Live Store</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {statusCounts.PUBLISHED}
          </div>
          <span className="text-[11px] text-gray-400">Published and purchasable</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Review Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {statusCounts.PENDING}
          </div>
          <span className="text-[11px] text-gray-400">Pending admin review</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Sales &amp; Orders</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {books.reduce((sum, b) => sum + (b.salesCount || 0), 0)}
          </div>
          <span className="text-[11px] text-gray-400">Total verified orders</span>
        </div>
      </div>

      {/* Filter Tabs, Search & Bulk Actions Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        {/* Status Tabs with counts */}
        <StudioStatusTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as BookStudioTab)}
        />

        {/* Search & dropdown filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books by title, author, subject..."
              aria-label="Search books"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 min-h-[40px]"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by Category"
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none min-h-[40px]"
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

        {/* Bulk Action Bar */}
        <StudioBulkActionBar
          totalItems={filteredBooks.length}
          selectedCount={selectedCount}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          itemLabel="book"
          onBulkPublish={role === "ADMIN" ? () => handleBulkAction("publish") : undefined}
          onBulkUnpublish={() => handleBulkAction("unpublish")}
          onBulkArchive={() => handleBulkAction("archive")}
          onBulkRestore={() => handleBulkAction("restore")}
          onBulkDelete={() => handleBulkAction("delete")}
        />
      </div>

      {/* Book List Table */}
      {filteredBooks.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/50 text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                      aria-label="Select all books"
                      data-testid="select-all-books-table"
                    />
                  </th>
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
                  const isSelectedRow = isSelected(book.id)
                  return (
                    <tr
                      key={book.id}
                      className={`hover:bg-gray-50/50 dark:hover:bg-slate-700/40 transition-colors ${
                        isSelectedRow ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <Checkbox
                          checked={isSelectedRow}
                          onCheckedChange={() => toggleSelect(book.id)}
                          aria-label={`Select ${book.title}`}
                          data-testid={`select-book-${book.id}`}
                        />
                      </td>

                      {/* Cover & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[240px] max-w-sm">
                          <div className="w-10 h-14 rounded-lg bg-gray-100 dark:bg-slate-900 p-0.5 border border-gray-200 dark:border-slate-700 shrink-0 flex items-center justify-center overflow-hidden relative">
                            {book.coverImage ? (
                              <Image
                                src={book.coverImage}
                                alt={book.title}
                                width={40}
                                height={56}
                                className="w-full h-full object-contain"
                                unoptimized
                              />
                            ) : (
                              <BookOpen className="w-5 h-5 text-gray-400" />
                            )}
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
                          {/* Admin Approve / Reject actions for quick access */}
                          {role === "ADMIN" && bStatus === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(book.id, "published")}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold min-h-[36px]"
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
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold min-h-[36px]"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* Teacher submit for review if in draft or rejected */}
                          {role === "TEACHER" && (bStatus === "draft" || bStatus === "rejected") && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(book.id, "pending")}
                              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 min-h-[36px]"
                              title="Submit for Admin approval"
                            >
                              <Send className="w-3 h-3" />
                              <span>Submit</span>
                            </button>
                          )}

                          {/* Studio Row Menu */}
                          <StudioRowMenu
                            itemId={book.id}
                            itemTitle={book.title}
                            isArchived={book.status === "archived"}
                            onEdit={() => {
                              setEditingBook(book)
                              setIsCreating(false)
                            }}
                            viewHref={`/books/${book.slug}`}
                            onToggleArchive={() => handleToggleArchive(book)}
                            onDelete={() => setBookToDelete(book)}
                          />
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
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold min-h-[40px]"
          >
            Create Book
          </button>
        </div>
      )}

      {/* Delete Impact Dialog */}
      {bookToDelete && (
        <StudioDeleteImpactDialog
          isOpen={Boolean(bookToDelete)}
          onClose={() => setBookToDelete(null)}
          itemType="Book"
          itemName={bookToDelete.title}
          itemId={bookToDelete.id}
          impactMetrics={[
            {
              label: "Verified Sales / Orders",
              count: bookToDelete.salesCount || 0,
              icon: <BookOpen className="w-3.5 h-3.5 text-purple-500" />,
            },
          ]}
          hasDependencies={(bookToDelete.salesCount || 0) > 0}
          dependencyNotice="Customer purchase orders reference this eBook. Hard deletion is blocked to protect student purchase records and download privileges. Archiving safely hides the eBook from the storefront while keeping it accessible in learner order histories."
          isArchivedAlready={bookToDelete.status === "archived"}
          onConfirmArchive={handleConfirmArchiveInstead}
          onConfirmHardDelete={handleConfirmHardDelete}
        />
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
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
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
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 min-h-[40px]"
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
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-xs min-h-[40px]"
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
