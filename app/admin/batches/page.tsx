"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Calendar,
  Layers,
  RefreshCw,
} from "lucide-react"
import type { Batch } from "@/lib/batches-service"

export default function AdminBatchesListPage() {
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"
  const basePath = isTeacher ? "/teacher" : "/admin"
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/batches")
      if (res.ok) {
        const data = await res.json()
        setBatches(data)
      }
    } catch (err) {
      console.error("Failed to load batches", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/batches/${id}`, { method: "DELETE" })
      if (res.ok) {
        setBatches(batches.filter((b) => b.id !== id))
      } else {
        alert("Failed to delete batch")
      }
    } catch (err) {
      console.error(err)
      alert("Error deleting batch")
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = batches.filter((b) => {
    const matchesClass =
      filterClass === "all" ||
      b.classTag.toLowerCase().includes(filterClass.toLowerCase())
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.classTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesClass && matchesSearch
  })

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span>School Prep &amp; Batches Management</span>
            <GraduationCap className="h-6 w-6 text-[#5B47FB]" />
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage course prices, discounts, faculty teachers, weekly schedule, demo videos, and FAQs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBatches}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href={`${basePath}/batches/new`}
            className="px-5 py-2.5 rounded-xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white font-extrabold text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Batch</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search batches by name or class..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B47FB]"
          />
        </div>

        {/* Class Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {["all", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Skills"].map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterClass(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterClass === tag
                  ? "bg-[#5B47FB] text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {tag === "all" ? "All Classes" : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-500 font-medium">
            Loading batches...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Layers className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700">No batches found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No batches matched your filter. Click Create New Batch to add one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-[#FAFBFD] border-b border-gray-200 text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">Class &amp; Medium</th>
                  <th className="px-6 py-4">Regular Price</th>
                  <th className="px-6 py-4">Pro Price</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((batch) => {
                  const infinityTier = batch.tiers?.find((t) => t.id === "tier-infinity")
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 relative overflow-hidden shrink-0 border border-gray-200">
                            <Image
                              src={batch.image || "/batch-green.svg"}
                              alt={batch.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 block line-clamp-1">
                              {batch.title}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              /batches/{batch.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-[#F26522] block">
                            {batch.classTag}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                            {batch.language || "HINGLISH"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-extrabold text-gray-900 text-sm">
                            {batch.price}
                          </span>
                          {batch.discount && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              {batch.discount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-[#5B47FB] text-sm">
                          {infinityTier?.price || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600 block line-clamp-1">
                          {batch.startDate} - {batch.endDate}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/batches/${batch.slug}`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Live Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`${basePath}/batches/${batch.id}/edit`}
                            className="p-2 text-[#5B47FB] hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit Batch"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(batch.id, batch.title)}
                            disabled={deletingId === batch.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Batch"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
