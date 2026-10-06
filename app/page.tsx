import Link from "next/link"
import Image from "next/image"
import { Video, Headphones, CalendarCheck, Award, ArrowRight } from "lucide-react"
import ClassesCoursesSection from "@/components/home/ClassesCoursesSection"
import HomeHeaderUserCTA from "@/components/home/HomeHeaderUserCTA"
import { auth } from "@/auth"
import { getDashboardHref } from "@/lib/auth/roles"
import { LANDING_NAV_ITEMS } from "@/lib/navigation/landing-nav"

export const revalidate = 60

export default async function LandingHomePage() {
    const session = await auth()
    const logoHref = getDashboardHref(session?.user?.role, !!session?.user)

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
            {/* Top Navigation Bar - Exact aspirantbook style */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
                    {/* Brand Logo */}
                    <Link href={logoHref} className="flex items-center gap-2.5 sm:gap-3 group">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden flex-shrink-0 bg-[#F7EFE4] border border-[#ECDCC9] shadow-xs ring-1 ring-black/5 flex items-center justify-center transition-transform group-hover:scale-105 p-0.5">
                            <Image
                                src="/aspirant-logo.jpg"
                                alt="aspirantbook"
                                width={44}
                                height={44}
                                className="w-full h-full object-contain rounded-full"
                                priority
                            />
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center">
                            aspirant<span className="text-[#F26522] ml-0.5 font-black">book</span>
                        </span>
                    </Link>

                    {/* Header Menu Links */}
                    <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-semibold text-gray-700">
                        {LANDING_NAV_ITEMS.map((item) => {
                            const isCoursesOrTest = item.href === "/courses" || item.href === "/test-series" || item.href === "/tutorials"
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`transition-colors flex items-center gap-1.5 ${
                                        isCoursesOrTest
                                            ? "hover:text-[#F26522] text-gray-800 font-bold"
                                            : item.href === "/practice"
                                            ? "hover:text-[#4a36ea] text-[#5B47FB] font-bold"
                                            : "hover:text-[#F26522] text-gray-600"
                                    }`}
                                >
                                    <span>{item.name}</span>
                                    {item.badge && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                            item.href === "/practice" ? "bg-[#EEECFF] text-[#5B47FB]" : "bg-orange-100 text-[#F26522]"
                                        }`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Right Login / User State CTA */}
                    <div className="flex items-center gap-3">
                        <HomeHeaderUserCTA initialSession={session} />
                    </div>
                </div>

                {/* Mobile Sub-Navigation Bar */}
                <div data-scroll-x="true" className="md:hidden flex items-center gap-4 px-4 py-2.5 overflow-x-auto no-scrollbar border-t border-gray-100 bg-gray-50/80 text-xs font-semibold text-gray-700">
                    {LANDING_NAV_ITEMS.map((item) => {
                        const isCoursesOrTest = item.href === "/courses" || item.href === "/test-series" || item.href === "/tutorials"
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`shrink-0 flex items-center gap-1 transition-colors ${
                                    isCoursesOrTest
                                        ? "text-gray-900 font-bold hover:text-orange-700"
                                        : item.href === "/practice"
                                        ? "text-indigo-700 font-bold"
                                        : "hover:text-orange-700 text-gray-600"
                                }`}
                            >
                                <span>{item.name}</span>
                                {item.badge && (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                        item.href === "/practice" ? "bg-indigo-100 text-indigo-800" : "bg-orange-100 text-orange-800"
                                    }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </div>
            </header>

            {/* Main Hero Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Left Column Text & CTAs */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.15] tracking-tight">
                                Not just learn, Understand and <br />
                                <span className="text-gray-900">Make your study Result Oriented.</span>
                            </h1>

                            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed pt-2">
                                Let&apos;s start learning and excel in GS, Current Affairs, CSAT, Coding Skills, Math, Science &amp; English.
                            </p>
                        </div>

                        {/* Grade / Audience selection indicator */}
                        <div className="pt-2">
                            <span className="text-sm sm:text-base font-bold text-gray-900 border-b-2 border-[#F26522] pb-1 inline-block">
                                For UPSC, BPSC, Coding Skills &amp; School Prep
                            </span>
                        </div>

                        {/* Primary Orange Action CTA Button */}
                        <div className="pt-4">
                            <a
                                href="#all-courses-container"
                                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-[#F26522] to-[#FF7A38] hover:from-[#E05310] hover:to-[#F26522] text-white font-extrabold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 gap-2"
                            >
                                <span>View Learning Programs</span>
                                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                            </a>
                        </div>
                    </div>

                    {/* Right Column Illustration */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
                        <div className="relative w-[340px] sm:w-[420px] h-[340px] sm:h-[420px]">
                            {/* Organic peach/cream circle background */}
                            <div className="absolute inset-0 bg-[#FEE9DA] rounded-full" />

                            <Image
                                src="/curious-hero-child.svg"
                                alt="Child learning on device"
                                fill
                                priority
                                className="object-contain relative z-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom 4 Feature Value Pillars Card */}
                <div className="mt-16 sm:mt-20 bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6 sm:p-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        {/* Feature 1: Live Interactive Classes */}
                        <div className="flex flex-col items-center text-center p-2">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-3">
                                <Video className="h-7 w-7 stroke-[2]" />
                            </div>
                            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                                Live Interactive
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">Classes</p>
                        </div>

                        {/* Feature 2: 24 x 7 Mentor Support */}
                        <div className="flex flex-col items-center text-center p-2">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                                <Headphones className="h-7 w-7 stroke-[2]" />
                            </div>
                            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                                24 x 7
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">Mentor Support</p>
                        </div>

                        {/* Feature 3: Daily Progress Tracking */}
                        <div className="flex flex-col items-center text-center p-2">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                                <CalendarCheck className="h-7 w-7 stroke-[2]" />
                            </div>
                            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                                Daily
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">Progress Tracking</p>
                        </div>

                        {/* Feature 4: Practice Led Learning */}
                        <div className="flex flex-col items-center text-center p-2">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                                <Award className="h-7 w-7 stroke-[2]" />
                            </div>
                            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                                Practice Led
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">Learning</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Class 6 to 12 & Skills Batches Section - Exact PW style layout & color richness */}
            <ClassesCoursesSection />
        </div>
    )
}
