import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Users, ArrowLeft, Download, Phone, Calendar, FileText, ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminPyqLeadsPage() {
  const leads = await prisma.pyqLeadCapture.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      paper: {
        select: {
          title: true,
          year: true,
          category: { select: { name: true } },
        },
      },
    },
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/pyqs"
            className="text-xs font-semibold text-gray-500 hover:text-orange-600 flex items-center gap-1 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to PYQ Directory
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            Student PDF Download Leads
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified mobile phone numbers captured when students requested official PYQ PDF downloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-800 text-xs font-bold border border-orange-200">
            {leads.length} Total Leads Captured
          </span>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <span className="text-xs font-semibold text-gray-700">Latest 300 Enquiries</span>
          <span className="text-xs text-gray-400">Strictly accessible to Admin & Teachers only</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Student Phone Number</th>
                <th className="py-3 px-4">Requested PYQ Paper</th>
                <th className="py-3 px-4">Exam Authority</th>
                <th className="py-3 px-4">Captured Timestamp</th>
                <th className="py-3 px-4">Acquisition Channel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">No student leads recorded yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Phone numbers will automatically appear here when students download PYQ question papers.
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      +91 {lead.phoneNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800 max-w-sm truncate">
                      {lead.paper.title} ({lead.paper.year})
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                        {lead.paper.category.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        PDF Gate
                      </span>
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
