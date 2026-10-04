import Link from "next/link"
import {
  FileText,
  GraduationCap,
  Award,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { FORM_DEFINITIONS } from "@/lib/forms-config"

export default function FormsIndexPage() {
  const forms = Object.values(FORM_DEFINITIONS)

  const getIcon = (slug: string) => {
    switch (slug) {
      case "admission":
        return GraduationCap
      case "scholarship":
        return Award
      case "feedback":
        return MessageSquare
      case "support":
        return HelpCircle
      default:
        return FileText
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#05192D] via-[#0a2540] to-[#0d2f52] rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-[#3AAFA9]/20 border border-[#3AAFA9]/40 text-teal-300 text-xs font-bold">
            Applications & Student Services
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Student Forms & Application Portal
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
            Submit batch admissions, apply for merit-based scholarships, share faculty feedback, or open a mentor support ticket.
          </p>
        </div>
      </div>

      {/* Form Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map((f) => {
          const Icon = getIcon(f.slug)
          return (
            <div
              key={f.slug}
              className="bg-white dark:bg-[#05192D] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:border-[#3AAFA9]/50 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#3AAFA9]/10 text-[#3AAFA9] flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 text-[11px] font-bold">
                    {f.badge}
                  </span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {f.title}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Online submission
                </span>
                <Link
                  href={`/forms/${f.slug}`}
                  className="px-4 py-2 rounded-xl bg-[#3AAFA9] hover:bg-[#2d8a85] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span>Apply / Fill Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
