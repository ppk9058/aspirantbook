import { ShieldCheck, Trophy, FileCheck2, Languages } from "lucide-react"

export default function LandingStatsStrip() {
  return (
    <section aria-label="Key platform highlights" className="w-full relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-6 sm:-mt-8">
        <div className="bg-white dark:bg-gray-900 border border-emerald-100/90 dark:border-gray-800 rounded-3xl p-3 sm:p-4 shadow-xl shadow-gray-200/50 dark:shadow-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Tile 1: Highlighted in light green */}
            <div className="bg-[#E8FAF0] dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                  Exam Categories
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight truncate">
                  7+ Major Exams
                </div>
              </div>
            </div>

            {/* Tile 2: Pastel yellow */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 hover:border-amber-200/80 dark:hover:border-amber-800/40 rounded-2xl p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF7E6] dark:bg-amber-950/30 border border-amber-100/80 dark:border-amber-800/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                  Previous Year Papers
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight truncate">
                  Official PYQs
                </div>
              </div>
            </div>

            {/* Tile 3: Pastel lavender */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 hover:border-indigo-200/80 dark:hover:border-indigo-800/40 rounded-2xl p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EDFD] dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-800/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                  Exam Simulation
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight truncate">
                  CBT Practice
                </div>
              </div>
            </div>

            {/* Tile 4: Pastel peach */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/80 hover:border-orange-200/80 dark:hover:border-orange-800/40 rounded-2xl p-4 flex items-center gap-3.5 transition-transform hover:scale-[1.01]">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF1EB] dark:bg-orange-950/30 border border-orange-100/80 dark:border-orange-800/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Languages className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                  Learning Medium
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight truncate">
                  Hindi &amp; English
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
