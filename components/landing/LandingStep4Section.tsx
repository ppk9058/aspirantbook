import Link from "next/link"
import { Award, CheckCircle2, ChevronRight, Compass, GraduationCap } from "lucide-react"

export default function LandingStep4Section() {
  return (
    <section aria-labelledby="step4-heading" className="w-full bg-[#0A4D2E] text-white py-16 sm:py-24 relative overflow-hidden">
      {/* Background Decorative Ribbons */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none">
          <path
            d="M-100 250C350 150 700 550 1200 200C1350 50 1500 450 1600 350"
            stroke="#6EE7B7"
            strokeWidth="56"
            strokeLinecap="round"
          />
          <path
            d="M-50 480C300 380 750 180 1250 480C1400 580 1550 220 1650 380"
            stroke="#A7F3D0"
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
              <span>Step 4: Transform boldly</span>
            </div>

            {/* Two-tone Heading */}
            <h2
              id="step4-heading"
              className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]"
            >
              Transform your <span className="text-[#6EE7B7]">exam outcomes</span>
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-emerald-100 leading-relaxed max-w-lg">
              Unlock complete syllabus coverage, authentic previous year papers, and structured practice to secure your dream rank.
            </p>

            {/* Two Stats with Divider */}
            <div className="flex items-center gap-8 py-2">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  365 Days
                </div>
                <div className="text-xs text-emerald-200 mt-1 font-medium">
                  All-Access Pass validity
                </div>
              </div>

              <div className="w-px h-12 bg-white/25" />

              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Full Syllabus
                </div>
                <div className="text-xs text-emerald-200 mt-1 font-medium">
                  Prelims &amp; Mains coverage
                </div>
              </div>
            </div>

            {/* Mint / Light-Green Action CTA */}
            <div className="pt-2">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5FE3A1] hover:bg-[#4dd490] px-8 py-3.5 text-sm sm:text-base font-extrabold text-[#05381F] shadow-lg shadow-black/15 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-600"
              >
                <span>Unlock AspirantBook Pass</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Collage of Floating Cards & Panel */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[380px] sm:min-h-[440px] pt-4 sm:pt-0">
            {/* Main Rounded Panel */}
            <div className="relative w-full max-w-[500px] aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-tr from-white/10 via-white/20 to-white/5 backdrop-blur-md border border-white/25 shadow-2xl p-6 sm:p-8 flex items-center justify-center">
              {/* Inline SVG Illustration of Successful Aspirant */}
              <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background Academy / University Columns */}
                <rect x="60" y="80" width="280" height="18" rx="4" fill="#063E23" />
                <rect x="80" y="98" width="16" height="150" fill="#063E23" fillOpacity="0.6" />
                <rect x="140" y="98" width="16" height="150" fill="#063E23" fillOpacity="0.6" />
                <rect x="244" y="98" width="16" height="150" fill="#063E23" fillOpacity="0.6" />
                <rect x="304" y="98" width="16" height="150" fill="#063E23" fillOpacity="0.6" />
                <rect x="50" y="248" width="300" height="12" rx="4" fill="#063E23" />

                {/* Aspirant Standing Confidently with Arms Crossed */}
                <circle cx="200" cy="115" r="32" fill="#FDBA74" />
                {/* Hair */}
                <path d="M174 110C174 88 226 88 226 110C226 118 218 122 200 122C182 122 174 118 174 110Z" fill="#1E293B" />
                {/* Torso & Crossed Arms */}
                <path d="M168 155C168 140 232 140 232 155V250H168V155Z" fill="#1E3A8A" />
                {/* Crossed Arms Overlay */}
                <path d="M160 175C160 170 175 195 200 195C225 195 240 170 240 175C240 195 225 210 200 210C175 210 160 195 160 175Z" fill="#1D4ED8" />
                <path d="M185 195H215" stroke="#FDBA74" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Floating Card 1: Center Left (Dark Journey Card) */}
            <div className="absolute -bottom-4 left-0 sm:-left-3 w-64 sm:w-72 bg-[#0D2619] text-white rounded-2xl p-3.5 shadow-2xl border border-white/15 z-20 transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white mb-2 pb-1.5 border-b border-white/10">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Preparation Pathway</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-200">
                <span className="p-1.5 rounded-lg bg-white/5">Foundation</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="p-1.5 rounded-lg bg-white/5">Mock Tests</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold">Selection</span>
              </div>
            </div>

            {/* Floating Card 2: Top Right (White Card with Dark Header) */}
            <div className="absolute -top-3 right-0 sm:right-2 w-56 sm:w-64 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-20 transition-transform hover:-translate-y-1">
              <div className="bg-[#0D2619] text-white px-3.5 py-2.5 text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  Exam Specialisations
                </span>
              </div>
              <div className="bg-white text-gray-900 p-3.5 space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-between">
                  <span className="font-bold text-gray-800">BPSC Combined State</span>
                  <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">CCE</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-between">
                  <span className="font-bold text-gray-800">UPSC Civil Services</span>
                  <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">CSE</span>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-between">
                  <span className="font-bold text-gray-800">Bihar Teacher TRE</span>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">TRE 3.0</span>
                </div>
              </div>
            </div>

            {/* Floating Dark Pill Badge: Bottom Right */}
            <div className="absolute -bottom-2 right-4 sm:right-8 bg-[#0D2619] text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl border border-white/20 z-30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Syllabus Coverage</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
