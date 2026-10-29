"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertTriangle, CheckCircle, Clock, XCircle, FileText } from "lucide-react"

interface DeletionRequest {
  id: string
  userId: string | null
  email: string
  reason: string | null
  status: string
  requestedAt: Date | string
  processedAt: Date | string | null
  adminNotes: string | null
}

interface Props {
  initialRequests: DeletionRequest[]
}

export function DataDeletionQueueClient({ initialRequests }: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState<DeletionRequest[]>(initialRequests)
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null)
  const [targetStatus, setTargetStatus] = useState<string>("")
  const [adminNotes, setAdminNotes] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const openTransitionModal = (req: DeletionRequest, newStatus: string) => {
    setSelectedRequest(req)
    setTargetStatus(newStatus)
    setAdminNotes(req.adminNotes || "")
    setErrorMessage(null)
  }

  const handleConfirmTransition = async () => {
    if (!selectedRequest || !targetStatus) return

    setIsUpdating(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/admin/data-deletion/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          adminNotes: adminNotes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update status")
        setIsUpdating(false)
        return
      }

      // Update local state
      setRequests((prev) =>
        prev.map((r) => (r.id === selectedRequest.id ? data.request : r))
      )
      setSelectedRequest(null)
      setIsUpdating(false)
      router.refresh()
    } catch {
      setErrorMessage("Network error updating request status")
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        )
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
            <FileText className="w-3.5 h-3.5" />
            In Review
          </span>
        )
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        )
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          No data deletion requests currently in queue.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Learner Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested At</th>
                <th className="px-4 py-3">Reason / Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {req.email}
                    {req.userId && (
                      <span className="block text-[11px] text-gray-400 font-mono">
                        User ID: {req.userId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(req.requestedAt).toLocaleString()}
                    {req.processedAt && (
                      <span className="block text-[11px] text-emerald-600 dark:text-emerald-400">
                        Processed: {new Date(req.processedAt).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs">
                    {req.reason && <p className="italic text-gray-600 dark:text-gray-400">&quot;{req.reason}&quot;</p>}
                    {req.adminNotes && (
                      <p className="mt-1 font-medium text-indigo-600 dark:text-indigo-400">
                        Notes: {req.adminNotes}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {req.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => openTransitionModal(req, "IN_REVIEW")}
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-8"
                            onClick={() => openTransitionModal(req, "REJECTED")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {req.status === "IN_REVIEW" && (
                        <>
                          <Button
                            size="sm"
                            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => openTransitionModal(req, "COMPLETED")}
                          >
                            Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-8"
                            onClick={() => openTransitionModal(req, "REJECTED")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {(req.status === "COMPLETED" || req.status === "REJECTED") && (
                        <span className="text-xs text-gray-400 italic">Terminal State</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transition Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Confirm Status Transition: {targetStatus}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs sm:text-sm">
              <p className="text-gray-600 dark:text-gray-300">
                You are transitioning request <span className="font-mono font-semibold">{selectedRequest.id}</span> for{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest.email}</span> from{" "}
                <span className="font-bold">{selectedRequest.status}</span> to <span className="font-bold text-indigo-600 dark:text-indigo-400">{targetStatus}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Admin Audit Notes:
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record rationale or steps taken per docs/evidence/deletion-procedure.md..."
                  rows={3}
                  className="text-xs"
                />
              </div>

              {errorMessage && (
                <div className="p-2 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded text-xs">
                  {errorMessage}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmTransition}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Confirm Transition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
