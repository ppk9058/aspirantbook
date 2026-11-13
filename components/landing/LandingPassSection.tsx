import Link from "next/link"
import { Trophy, ClipboardList, BarChart3, Languages } from "lucide-react"

export default function LandingPassSection() {
  return (
    <section aria-labelledby="landing-pass-heading" className="w-full py-16 sm:py-24 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Large Vector Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[420px] aspect-[4/3] sm:aspect-square flex items-center justify-center">
              {/* Soft decorative background circles */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-sky-100 via-indigo-50 to-emerald-50 dark:from-sky-950/20 dark:via-indigo-950/20 dark:to-emerald-950/20 -z-10 blur-xl" />

              <svg
                viewBox="0 0 500 500"
                className="w-full h-full drop-shadow-md select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Student practicing mock tests on digital device"
              >
                {/* Desk Surface */}
                <ellipse cx="250" cy="450" rx="200" ry="24" fill="#F1F5F9" className="dark:fill-gray-900" />
                <rect x="70" y="440" width="360" height="12" rx="6" fill="#E2E8F0" className="dark:fill-gray-800" />

                {/* Big Mobile / Tablet Device Frame */}
                <g filter="drop-shadow(0 14px 25px rgba(15, 23, 42, 0.12))">
                  <rect x="180" y="80" width="220" height="340" rx="28" fill="#1E293B" />
                  <rect x="190" y="90" width="200" height="320" rx="20" fill="#0F172A" />

                  {/* Device Screen UI Header */}
                  <rect x="190" y="90" width="200" height="42" rx="20" fill="#1E293B" />
                  <circle cx="215" cy="111" r="5" fill="#10B981" />
                  <circle cx="230" cy="111" r="5" fill="#F59E0B" />
                  <circle cx="245" cy="111" r="5" fill="#EF4444" />
                  <rect x="290" y="106" width="80" height="10" rx="5" fill="#334155" />

                  {/* Active Question Bar (Highlighted Green) */}
                  <rect x="204" y="146" width="172" height="46" rx="10" fill="#059669" />
                  <circle cx="225" cy="169" r="10" fill="#FFFFFF" fillOpacity="0.25" />
                  <path d="M221 169L224 172L229 166" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="244" y="161" width="90" height="7" rx="3.5" fill="#FFFFFF" />
                  <rect x="244" y="173" width="60" height="6" rx="3" fill="#A7F3D0" />

                  {/* Question Options List */}
                  <rect x="204" y="204" width="172" height="36" rx="8" fill="#1E293B" />
                  <rect x="216" y="217" width="20" height="10" rx="4" fill="#475569" />
                  <rect x="246" y="218" width="110" height="8" rx="4" fill="#334155" />

                  <rect x="204" y="250" width="172" height="36" rx="8" fill="#1E293B" />
                  <rect x="216" y="263" width="20" height="10" rx="4" fill="#475569" />
                  <rect x="246" y="264" width="95" height="8" rx="4" fill="#334155" />

                  <rect x="204" y="296" width="172" height="36" rx="8" fill="#1E293B" />
                  <rect x="216" y="309" width="20" height="10" rx="4" fill="#475569" />
                  <rect x="246" y="310" width="120" height="8" rx="4" fill="#334155" />

                  {/* Bottom Navigation on Device */}
                  <rect x="204" y="348" width="80" height="28" rx="8" fill="#2563EB" />
                  <rect x="296" y="348" width="80" height="28" rx="8" fill="#334155" />
                </g>

                {/* Desk Plant & Books */}
                <rect x="390" y="390" width="50" height="12" rx="3" fill="#D97706" />
                <rect x="394" y="376" width="44" height="12" rx="3" fill="#6366F1" />
                <rect x="398" y="362" width="38" height="12" rx="3" fill="#10B981" />
                <path d="M425 360L425 340" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
                <ellipse cx="430" cy="336" rx="9" ry="5" fill="#34D399" transform="rotate(-30 430 336)" />
                <ellipse cx="420" cy="344" rx="8" ry="4" fill="#10B981" transform="rotate(25 420 344)" />

                {/* Student Character Illustration */}
                {/* Legs & Torso */}
                <path d="M125 320L115 440" stroke="#1E293B" strokeWidth="22" strokeLinecap="round" />
                <path d="M155 320L150 440" stroke="#0F172A" strokeWidth="22" strokeLinecap="round" />
                <path d="M100 440H130" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
                <path d="M138 440H168" stroke="#334155" strokeWidth="10" strokeLinecap="round" />

                {/* Body (Shirt) */}
                <path d="M110 210C110 185 170 185 170 210V330H110V210Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="3" />
                {/* Arm pointing forward */}
                <path d="M145 225L195 170" stroke="#F8FAFC" strokeWidth="18" strokeLinecap="round" />
                <path d="M195 170L220 166" stroke="#FDBA74" strokeWidth="14" strokeLinecap="round" />

                {/* Head, Hair & Glasses */}
                <circle cx="140" cy="155" r="24" fill="#FDBA74" />
                {/* Hair */}
                <path d="M120 148C120 132 135 125 155 130C165 133 168 145 168 155C164 148 152 146 142 147C132 148 126 153 120 158V148Z" fill="#451A03" />
                {/* Glasses */}
                <circle cx="148" cy="155" r="7" stroke="#1E293B" strokeWidth="2.5" fill="none" />
                <path d="M155 155H162" stroke="#1E293B" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Right Column: Pass Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <h2 id="landing-pass-heading" className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                Enroll in Test Series for Major Exams with
              </h2>

              {/* Brand Wordmark + PASS Ticket Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-[#ff0031] tracking-tight">
                  AspirantBook
                </span>

                <span className="relative inline-flex items-center justify-center bg-[#23B6F0] text-white text-xs font-black px-3.5 py-1 uppercase tracking-wider rounded-sm shadow-sm select-none">
                  {/* Scalloped ticket notches on left and right */}
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white dark:bg-gray-950" />
                  <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white dark:bg-gray-950" />
                  PASS
                </span>
              </div>
            </div>

            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl">
              Get unlimited access to authentic Previous Year Papers, verified solutions, full-length mock tests, and real CBT practice on India&apos;s structured online preparation platform.
            </p>

            {/* What you get label */}
            <div className="pt-2">
              <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                What you get with AspirantBook Pass
              </div>

              {/* 2x2 Grid of Pastel Icon Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Item 1: Yellow */}
                <div className="bg-[#FEF7E6] dark:bg-amber-950/30 border border-amber-100/80 dark:border-amber-800/30 p-3.5 rounded-2xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/80 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                    All India Rank &amp; Analytics
                  </span>
                </div>

                {/* Item 2: Lavender */}
                <div className="bg-[#F0EDFD] dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-800/30 p-3.5 rounded-2xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                    Latest Exam Patterns
                  </span>
                </div>

                {/* Item 3: Peach */}
                <div className="bg-[#FFF1EB] dark:bg-orange-950/30 border border-orange-100/80 dark:border-orange-800/30 p-3.5 rounded-2xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-100/80 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                    In-depth Performance Analysis
                  </span>
                </div>

                {/* Item 4: Mint */}
                <div className="bg-[#E8FAF0] dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-800/30 p-3.5 rounded-2xl flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Languages className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug">
                    Bilingual Mock Tests
                  </span>
                </div>
              </div>
            </div>

            {/* Sky-Blue Action CTA */}
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00BAF2] hover:bg-[#00a3d4] px-8 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-md shadow-sky-500/20 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                <span>Explore AspirantBook Pass</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
