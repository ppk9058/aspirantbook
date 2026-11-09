import Link from "next/link"
import { Globe, Award, CheckCircle2, ChevronRight, Laptop } from "lucide-react"

export default function LandingStep3Section() {
  return (
    <section aria-labelledby="step3-heading" className="w-full bg-[#1254D6] text-white py-16 sm:py-24 relative overflow-hidden">
      {/* Background Decorative Ribbons */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <path
            d="M-100 200C300 100 600 500 1100 150C1300 0 1500 400 1600 300"
            stroke="#93C5FD"
            strokeWidth="56"
            strokeLinecap="round"
          />
          <path
            d="M-50 450C250 350 700 150 1200 450C1350 550 1550 200 1650 350"
            stroke="#60A5FA"
            strokeWidth="32"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Step Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-white tracking-wide">
              <span>Step 3: Practice confidently</span>
            </div>

            {/* Two-tone Heading */}
            <h2
              id="step3-heading"
              className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]"
            >
              Flourish with <span className="text-[#93C5FD]">precision practice</span>
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-blue-100 leading-relaxed max-w-lg">
              Simulate real exam pressure, solve official question papers, and build exam stamina with structured mock tests.
            </p>

            {/* Two Stats with Divider */}
            <div className="flex items-center gap-8 py-2">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Official Pattern
                </div>
                <div className="text-xs text-blue-200 mt-1 font-medium">
                  Real exam simulation
                </div>
              </div>

              <div className="w-px h-12 bg-white/25" />

              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Instant Analysis
                </div>
                <div className="text-xs text-blue-200 mt-1 font-medium">
                  Detailed score breakdown
                </div>
              </div>
            </div>

            {/* Light-Blue Action CTA */}
            <div className="pt-2">
              <Link
                href="/test-series"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C5E4FF] hover:bg-[#b0d8ff] px-8 py-3.5 text-sm sm:text-base font-extrabold text-[#0B3B7A] shadow-lg shadow-black/15 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
              >
                <span>Explore Test Series</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Collage of Floating Cards & Panel */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[380px] sm:min-h-[440px] pt-4 sm:pt-0">
            {/* Main Rounded Panel */}
            <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-tr from-white/10 via-white/20 to-white/5 backdrop-blur-md border border-white/25 shadow-2xl p-6 sm:p-8 flex items-center justify-center">
              {/* Inline SVG Illustration of Aspirant with Laptop */}
              <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Desk and Lamp */}
                <ellipse cx="200" cy="270" rx="160" ry="20" fill="#0A3690" />
                <rect x="80" y="240" width="240" height="10" rx="5" fill="#1E40AF" />

                {/* Candidate */}
                <circle cx="200" cy="120" r="34" fill="#FDBA74" />
                <path d="M170 110C170 85 230 85 230 110C230 118 220 124 200 124C180 124 170 118 170 110Z" fill="#1E293B" />
                <path d="M165 170C165 150 235 150 235 170V240H165V170Z" fill="#F8FAFC" />
                <path d="M160 178L130 220" stroke="#F8FAFC" strokeWidth="18" strokeLinecap="round" />
                <path d="M240 178L270 220" stroke="#F8FAFC" strokeWidth="18" strokeLinecap="round" />

                {/* Laptop on Desk */}
                <rect x="150" y="200" width="100" height="60" rx="6" fill="#0F172A" />
                <rect x="156" y="206" width="88" height="48" rx="4" fill="#38BDF8" fillOpacity="0.8" />
                <rect x="135" y="258" width="130" height="8" rx="4" fill="#64748B" />
                {/* Chart on Laptop Screen */}
                <path d="M164 242L180 230L200 236L220 216L234 222" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Floating Card 1: Top Right (White Card with Dark Header) */}
            <div className="absolute -top-3 right-0 sm:right-2 w-56 sm:w-64 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-20 transition-transform hover:-translate-y-1">
              <div className="bg-[#0B1E38] text-white px-3.5 py-2.5 text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-sky-400" />
                  Mock Test Evaluation
                </span>
              </div>
              <div className="bg-white text-gray-900 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified by Experts
                  </span>
                  <span className="text-xs font-black text-gray-950">85/100</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Syllabus Accuracy</span>
                    <span className="font-bold text-gray-900">92%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "92%" }} />
                  </div>
                  <div className="flex items-center justify-between text-gray-600 pt-0.5">
                    <span>Time Management</span>
                    <span className="font-bold text-gray-900">78%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Card 2: Bottom Left (Dark Card) */}
            <div className="absolute -bottom-4 left-0 sm:-left-3 w-56 sm:w-60 bg-[#0B1E38] text-white rounded-2xl p-3.5 shadow-2xl border border-white/15 z-20 transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white mb-2 pb-1.5 border-b border-white/10">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Exam Practice Portal</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <span className="font-semibold text-gray-200">BPSC Prelims Mock</span>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <span className="font-semibold text-gray-200">UPSC CSAT Simulator</span>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
                </div>
              </div>
            </div>

            {/* Floating Dark Pill Badge: Bottom Right */}
            <div className="absolute -bottom-2 right-4 sm:right-8 bg-[#0B1E38] text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl border border-white/20 z-30">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>National Ranks</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
