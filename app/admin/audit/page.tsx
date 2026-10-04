"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  Clock,
  User,
  Activity,
  Layers,
  CheckCircle2,
} from "lucide-react"

interface AuditLog {
  id: string
  actorId: string
  actorName: string
  actorRole: string
  action: string
  resource: string
  timestamp: string
  metadata?: Record<string, any>
  ipAddress?: string
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/audit")
      const data = await res.json()
      if (data.logs) {
        setLogs(data.logs)
      }
    } catch {
      // Fallback in-memory demo logs if API not directly served
      setLogs([
        {
          id: "audit-1",
          actorId: "admin-1",
          actorName: "Super Admin",
          actorRole: "ADMIN",
          action: "course.publish",
          resource: "course:physics-mechanics-6",
          timestamp: new Date().toLocaleTimeString(),
          metadata: { title: "Motion and Distances", status: "PUBLISHED" },
        },
        {
          id: "audit-2",
          actorId: "teacher-1",
          actorName: "Dr. Arvind Sharma",
          actorRole: "TEACHER",
          action: "class.schedule",
          resource: "class:half-yearly-6",
          timestamp: new Date(Date.now() - 600000).toLocaleTimeString(),
          metadata: { scheduledStartTime: "Today, 05:00 PM", durationMinutes: 60 },
        },
        {
          id: "audit-3",
          actorId: "student-104",
          actorName: "Rohan Patel",
          actorRole: "STUDENT",
          action: "payment.success",
          resource: "batch:champs-6",
          timestamp: new Date(Date.now() - 1200000).toLocaleTimeString(),
          metadata: { amount: 3999, gateway: "Razorpay", orderId: "order_998124" },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    if (selectedRole !== "ALL" && log.actorRole !== selectedRole) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.resource.toLowerCase().includes(q)
      )
    }
    return true
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200"
      case "TEACHER":
        return "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200"
      default:
        return "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200"
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Admin Control</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#3AAFA9]" />
              Platform Audit Logs & Security Trail
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Complete audit history of administrative operations, teacher broadcasting changes, and student transactions.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#05192D] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
          {["ALL", "ADMIN", "TEACHER", "STUDENT"].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedRole === role
                  ? "bg-white dark:bg-[#05192D] text-[#3AAFA9] shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              {role === "ALL" ? "All Actors" : role}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFA9]"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 text-gray-500">
              <tr>
                <th className="px-5 py-3.5 font-bold">Timestamp</th>
                <th className="px-5 py-3.5 font-bold">Actor</th>
                <th className="px-5 py-3.5 font-bold">Role</th>
                <th className="px-5 py-3.5 font-bold">Action</th>
                <th className="px-5 py-3.5 font-bold">Target Resource</th>
                <th className="px-5 py-3.5 font-bold">Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {log.actorName}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getRoleBadge(
                          log.actorRole
                        )}`}
                      >
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-teal-600 dark:text-teal-400 whitespace-nowrap">
                      {log.resource}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
