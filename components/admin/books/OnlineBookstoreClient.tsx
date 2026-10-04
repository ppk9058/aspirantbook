"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Book, BookOrder, Coupon } from "@/lib/books/types"
import { CATEGORIES_TREE } from "@/lib/books/data"
import CreateBookModal from "./CreateBookModal"
import EditBookModal from "./EditBookModal"
import CreateCouponModal from "./CreateCouponModal"
import OrderDetailsModal from "./OrderDetailsModal"
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Tag,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Layers,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  Eye,
  Percent,
  FileText,
  AlertCircle,
} from "lucide-react"

interface OnlineBookstoreClientProps {
  initialBooks: Book[]
  initialOrders: BookOrder[]
  initialCoupons: Coupon[]
  initialStats: any
}

export default function OnlineBookstoreClient({
  initialBooks,
  initialOrders,
  initialCoupons,
  initialStats,
}: OnlineBookstoreClientProps) {
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [orders, setOrders] = useState<BookOrder[]>(initialOrders)
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [stats, setStats] = useState(initialStats)

  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "coupons" | "analytics">("inventory")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<BookOrder | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filtered books
  const filteredBooks = books.filter((b) => {
    if (selectedCategory !== "ALL" && b.category !== selectedCategory) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const inTitle = b.title.toLowerCase().includes(q)
      const inAuthor = b.author.toLowerCase().includes(q)
      const inSubject = b.subject.toLowerCase().includes(q)
      return inTitle || inAuthor || inSubject
    }
    return true
  })

  // Handlers
  const handleBookCreated = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev])
    setStats((prev: any) => ({ ...prev, totalBooks: prev.totalBooks + 1 }))
  }

  const handleBookUpdated = (updated: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from the Bookstore inventory?`)) {
      return
    }

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/books/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to delete")
      }
      setBooks((prev) => prev.filter((b) => b.id !== id))
      setStats((prev: any) => ({ ...prev, totalBooks: Math.max(0, prev.totalBooks - 1) }))
    } catch (err: any) {
      alert(err.message || "Failed to delete book")
    } finally {
      setDeletingId(null)
    }
  }

  const handleCouponCreated = (newCoupon: Coupon) => {
    setCoupons((prev) => [newCoupon, ...prev.filter((c) => c.code !== newCoupon.code)])
  }

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Remove coupon code "${code}"?`)) return
    try {
      const res = await fetch(`/api/admin/books/coupons?code=${encodeURIComponent(code)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      setCoupons((prev) => prev.filter((c) => c.code !== code))
    } catch (err: any) {
      alert("Failed to delete coupon")
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-teal-600 text-white flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Online Bookstore
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 border border-amber-300">
              Admin Exclusive Access
            </span>
            <span className="text-xs font-semibold text-gray-500">
              eCommerce &bull; Buy & Sell Management
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Online Bookstore</h1>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            Manage eBook inventory, publish new titles, monitor student sales orders, and configure discount coupons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/books"
            target="_blank"
            className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>Live Storefront</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          </Link>

          <button
            onClick={() => setIsCouponModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Manage Coupons</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Sell / Add New eBook</span>
          </button>
        </div>
      </div>

      {/* KPI 4-Grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span>Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            ₹{stats?.totalRevenue?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Direct eBook sales fulfilled</span>
          </div>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span>Customer Orders</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats?.totalOrders || 0}</div>
          <div className="text-[11px] text-teal-600 font-bold mt-1">100% Instant Digital Access</div>
        </div>

        {/* Metric 3: Listed eBooks */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span>eBooks in Catalog</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{books.length}</div>
          <div className="text-[11px] text-blue-600 font-bold mt-1">Available for Student Purchase</div>
        </div>

        {/* Metric 4: Avg Order Value */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold mb-2">
            <span>Avg Order Value (AOV)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">₹{stats?.avgOrderValue || 0}</div>
          <div className="text-[11px] text-purple-600 font-bold mt-1">Per transaction average</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 flex items-center gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "inventory"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>eBook Inventory ({books.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "orders"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Customer Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("coupons")}
          className={`pb-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "coupons"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons & Promos ({coupons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 text-xs sm:text-sm font-extrabold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "analytics"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Sales & Demand Analytics</span>
        </button>
      </div>

      {/* ==================== TAB 1: INVENTORY ==================== */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search eBook by title, author, or subject..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-900 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 focus:border-teal-500"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES_TREE.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Book Table / Grid */}
          {filteredBooks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-900">No eBooks found</h3>
              <p className="text-xs text-gray-500">
                {searchQuery || selectedCategory !== "ALL"
                  ? "Try changing your search keywords or category filter."
                  : "Start selling by adding your first eBook to the Bookstore."}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New eBook</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">eBook Title & Subject</th>
                      <th className="py-3.5 px-4">Pricing</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Author / Publisher</th>
                      <th className="py-3.5 px-4">Format & Pages</th>
                      <th className="py-3.5 px-4">Badges</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Title & Cover */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3 max-w-sm">
                            <div className="w-10 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 shadow-2xs">
                              <img src={book.coverImage} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 line-clamp-1 text-xs hover:text-teal-700">
                                {book.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                                  {book.subject}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">{book.edition}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4">
                          <div className="font-black text-gray-900 text-sm">₹{book.price}</div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-gray-400 line-through">₹{book.originalPrice}</span>
                            <span className="text-emerald-600 font-extrabold">({book.discountPercent}% OFF)</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 font-semibold text-gray-700 max-w-[140px] truncate">
                          {book.category}
                        </td>

                        {/* Author */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-800 truncate max-w-[130px]">{book.author}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[130px]">{book.publisher}</div>
                        </td>

                        {/* Format */}
                        <td className="py-3.5 px-4 text-gray-600 font-medium">
                          <div>{book.pages} Pages</div>
                          <div className="text-[10px] text-gray-400">{book.fileSize}</div>
                        </td>

                        {/* Badges */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {book.isBestseller && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white">
                                Bestseller
                              </span>
                            )}
                            {book.isFeatured && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-600 text-white">
                                Featured
                              </span>
                            )}
                            {!book.isBestseller && !book.isFeatured && (
                              <span className="text-[10px] text-gray-400">Regular</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/books/${book.slug}`}
                              target="_blank"
                              title="View in Store"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => setEditingBook(book)}
                              title="Edit Price & Details"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              disabled={deletingId === book.id}
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              title="Delete from Bookstore"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: ORDERS ==================== */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Student Purchase Orders</h3>
                <p className="text-xs text-gray-500">
                  Every order includes verified payment confirmation and instant high-res eBook access.
                </p>
              </div>
              <span className="text-xs font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                {orders.length} Total Orders
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order ID & Date</th>
                    <th className="py-3.5 px-4">Purchased eBook(s)</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Amount Paid</th>
                    <th className="py-3.5 px-4">Coupon</th>
                    <th className="py-3.5 px-4">Access Status</th>
                    <th className="py-3.5 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-teal-900">{order.orderNumber}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{order.date}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="font-bold text-gray-800 line-clamp-1">
                              &bull; {item.book.title} (Qty: {item.quantity})
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-700">
                        {order.paymentMethod}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-gray-900 text-sm">₹{order.finalTotal}</span>
                        {order.discountTotal > 0 && (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            Saved ₹{order.discountTotal + (order.couponDiscount || 0)}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {order.couponCode ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {order.couponCode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white">
                          <CheckCircle2 className="w-3 h-3" />
                          {order.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-teal-800 font-bold text-xs transition-colors"
                        >
                          View Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: COUPONS ==================== */}
      {activeTab === "coupons" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Active Bookstore Coupons</h3>
              <p className="text-xs text-gray-500">
                Coupons are verified and instantly applicable at student checkout in Flipkart-style cart.
              </p>
            </div>
            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.code}
                className="p-5 rounded-2xl bg-white border border-gray-200 hover:border-teal-300 shadow-2xs space-y-3 relative transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-black tracking-widest text-sm uppercase">
                    {coupon.code}
                  </span>
                  <button
                    onClick={() => handleDeleteCoupon(coupon.code)}
                    title="Delete coupon"
                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h4 className="font-black text-base text-gray-900">{coupon.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{coupon.description}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                  <span>Min Order: ₹{coupon.minCartValue}</span>
                  <span className="font-extrabold text-emerald-600">
                    {coupon.discountType === "PERCENT" ? `${coupon.value}% OFF` : `₹${coupon.value} FLAT`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: ANALYTICS ==================== */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling eBooks */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Top Selling eBooks</span>
              </h3>
              <span className="text-xs font-bold text-gray-400">By sales volume</span>
            </div>

            <div className="space-y-3">
              {(stats?.topSellingBooks || []).map((entry: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-1">{entry.book?.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {entry.book?.category} &bull; {entry.sales} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-teal-800">₹{entry.revenue}</span>
                    <span className="text-[10px] text-gray-400 block">Total revenue</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Revenue Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Catalog Distribution by Category</span>
            </h3>

            <div className="space-y-3">
              {Object.entries(stats?.categoryCounts || {}).map(([cat, count]: any) => {
                const percent = Math.round((count / (books.length || 1)) * 100)
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>{cat}</span>
                      <span>
                        {count} titles ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleBookCreated}
      />

      <EditBookModal
        isOpen={Boolean(editingBook)}
        book={editingBook}
        onClose={() => setEditingBook(null)}
        onSuccess={handleBookUpdated}
      />

      <CreateCouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onSuccess={handleCouponCreated}
      />

      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}
