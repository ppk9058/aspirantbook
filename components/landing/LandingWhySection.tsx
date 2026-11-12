import Link from "next/link"
import { BookOpen, Radio, BarChart3, Languages } from "lucide-react"

export default function LandingWhySection() {
  return (
    <section aria-labelledby="why-aspirantbook-heading" className="w-full py-16 sm:py-24 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Heading & Value Proposition */}
          <div className="lg:col-span-5 space-y-6">
            {/* Logo Box */}
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 shadow-md shadow-gray-200/50 dark:shadow-none flex items-center justify-center p-2.5">
              <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="#1E293B" />
                <path d="M12 14L20 10L28 14L20 18L12 14Z" fill="#22D3EE" />
                <path d="M12 19L20 23L28 19" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 25L20 29L28 25" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2
              id="why-aspirantbook-heading"
              className="text-3xl sm:text-5xl font-black text-gray-950 dark:text-white tracking-tight leading-[1.15]"
            >
              Why aspirantBook?
            </h2>

            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-md">
              With <strong>verified authentic PYQs</strong> and <strong>one of the most focused exam prep environments</strong> for BPSC, UPSC, and State PCS, you can surely rely on us to excel.
            </p>

            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10B981] hover:bg-[#059669] px-8 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-md shadow-emerald-500/20 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <span>Get Started For Free</span>
              </Link>
            </div>
          </div>

          {/* Right Column: 4 Large Pastel Cards (Staggered 2-Column Grid) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-start">
            {/* Column 1 (Left): Cards 1 & 3 */}
            <div className="space-y-5 sm:space-y-6">
              {/* Card 1: Pastel Green */}
              <div className="bg-[#E8FAF0] dark:bg-emerald-950/25 border border-emerald-100/90 dark:border-emerald-800/30 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                  <BookOpen className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-950 dark:text-white tracking-tight leading-snug">
                    Learn from the Best
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Study official previous year question papers with detailed step-by-step solutions verified by seasoned subject experts.
                  </p>
                </div>
              </div>

              {/* Card 3: Pastel Yellow */}
              <div className="bg-[#FEF7E6] dark:bg-amber-950/25 border border-amber-100/90 dark:border-amber-800/30 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shadow-md shadow-amber-500/25">
                  <BarChart3 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-950 dark:text-white tracking-tight leading-snug">
                    Detailed Score Analysis
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Get an in-depth diagnostic breakdown of your accuracy, subject-wise strengths &amp; weaknesses, and time management.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2 (Right): Cards 2 & 4 (Staggered offset on desktop) */}
            <div className="space-y-5 sm:space-y-6 sm:mt-8">
              {/* Card 2: Pastel Pink */}
              <div className="bg-[#FDF2F4] dark:bg-rose-950/25 border border-rose-100/90 dark:border-rose-800/30 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#F43F5E] text-white flex items-center justify-center shadow-md shadow-rose-500/25">
                  <Radio className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-950 dark:text-white tracking-tight leading-snug">
                    Live Tests for Real Exam Experience
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Feel the thrill of the real exam room. Practice under real time limits to master your pacing and pressure management.
                  </p>
                </div>
              </div>

              {/* Card 4: Pastel Lavender */}
              <div className="bg-[#F0EDFD] dark:bg-indigo-950/25 border border-indigo-100/90 dark:border-indigo-800/30 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#6366F1] text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <Languages className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-950 dark:text-white tracking-tight leading-snug">
                    Multilingual: Hindi &amp; English
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Prepare in the language you are most comfortable with. Authentic papers and test simulations available in Hindi and English.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
