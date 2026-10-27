"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, PhoneCall, RefreshCw } from "lucide-react"
import { InlineError, StudioSection } from "./fields"

interface Lead {
  id: string
  name: string
  mobile: string
  status: "NEW" | "CONTACTED" | "CLOSED"
  note: string | null
  source: string
  utm: string | null
  createdAt: string
  handledBy?: { id: string; name: string | null } | null
}

interface CallbackLeadsTabProps {
  courseId: string
}

const STATUSES: Array<Lead["status"]> = ["NEW", "CONTACTED", "CLOSED"]

/**
 * "Callback leads" tab. Full numbers are only returned to ADMIN or the teacher
 * who owns the course (enforced server-side in the route).
 */
export function CallbackLeadsTab({ courseId }: CallbackLeadsTabProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/leads`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load callback leads")
      setLeads(data.leads || [])
    } catch (err: any) {
      setError(err.message || "Could not load callback leads")
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (lead: Lead, status: Lead["status"]) => {
    setSavingId(lead.id)
    setError(null)
    const previous = lead.status
    setLeads((prev) => prev.map((entry) => (entry.id === lead.id ? { ...entry, status } : entry)))
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/leads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not update the lead")
    } catch (err: any) {
      setLeads((prev) => prev.map((entry) => (entry.id === lead.id ? { ...entry, status: previous } : entry)))
      setError(err.message || "Could not update the lead")
    } finally {
      setSavingId(null)
    }
  }

  const counts = {
    NEW: leads.filter((lead) => lead.status === "NEW").length,
    CONTACTED: leads.filter((lead) => lead.status === "CONTACTED").length,
    CLOSED: leads.filter((lead) => lead.status === "CLOSED").length,
  }

  return (
    <div className="space-y-4">
      {error && <InlineError message={error} />}

      <StudioSection
        title={`Callback leads (${leads.length})`}
        description={`${counts.NEW} new • ${counts.CONTACTED} contacted • ${counts.CLOSED} closed. Numbers are stored as E.164.`}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <a
              href={`/api/admin/courses/${courseId}/leads?format=csv`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-bold text-gray-800"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </a>
          </div>
        }
      >
        {loading ? (
          <p className="text-xs text-gray-500">Loading leads…</p>
        ) : leads.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-gray-500">
            <PhoneCall className="h-4 w-4" />
            No callback requests yet. Leads appear here as soon as a learner asks for a call.
          </p>
        ) : (
          <ul className="space-y-2">
            {leads.map((lead) => (
              <li key={lead.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900">{lead.name}</p>
                    <a href={`tel:${lead.mobile}`} className="text-xs font-bold text-orange-700 hover:underline">
                      {lead.mobile}
                    </a>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {new Date(lead.createdAt).toLocaleString("en-IN")} • {lead.source}
                      {lead.utm ? ` • ${lead.utm}` : ""}
                    </p>
                    {lead.note && <p className="mt-1 text-[11px] text-gray-700">{lead.note}</p>}
                  </div>

                  <select
                    aria-label={`Status for ${lead.name}`}
                    value={lead.status}
                    disabled={savingId === lead.id}
                    onChange={(event) => void updateStatus(lead, event.target.value as Lead["status"])}
                    className="min-h-[44px] rounded-xl border border-gray-300 px-2 text-xs font-bold text-gray-800 disabled:opacity-60"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                {lead.handledBy?.name && (
                  <p className="mt-1 text-[11px] text-gray-500">Handled by {lead.handledBy.name}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </StudioSection>
    </div>
  )
}
