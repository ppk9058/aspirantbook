import Link from "next/link"
import Image from "next/image"
import { Video, Headphones, CalendarCheck, Award, ArrowRight, Sparkles, BookOpen } from "lucide-react"
import ClassesCoursesSection from "@/components/home/ClassesCoursesSection"
import HomeHeaderUserCTA from "@/components/home/HomeHeaderUserCTA"
import { auth } from "@/auth"
import { getDashboardHref } from "@/lib/auth/roles"
import { LANDING_NAV_ITEMS } from "@/lib/navigation/landing-nav"

export const revalidate = 60

// Colourful, mobile-first value pillars. One accent per pillar keeps the grid
// vibrant without inventing any metrics or fake numbers.
const VALUE_PILLARS = [
    {
        Icon: Video,
        title: "Live Interactive",
        subtitle: "Classes",
        tile: "from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border-orange-100 dark:border-orange-500/20",
        chip: "from-orange-500 to-amber-500",
    },
    {
        Icon: Headphones,
        title: "24 x 7",
        subtitle: "Mentor Support",
        tile: "from-indigo-50 to-sky-50 dark:from-indigo-500/10 dark:to-sky-500/10 border-indigo-100 dark:border-indigo-500/20",
        chip: "from-indigo-500 to-sky-500",
    },
    {
        Icon: CalendarCheck,
        title: "Daily",
        subtitle: "Progress Tracking",
        tile: "from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-emerald-100 dark:border-emerald-500/20",
        chip: "from-emerald-500 to-teal-500",
    },
    {
        Icon: Award,
        title: "Practice Led",
        subtitle: "Learning",
        tile: "from-fuchsia-50 to-rose-50 dark:from-fuchsia-500/10 dark:to-rose-500/10 border-fuchsia-100 dark:border-fuchsia-500/20",
        chip: "from-fuchsia-500 to-rose-500",
    },
] as const

const AUDIENCE_CHIPS = [
    { label: "UPSC", className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30" },
    { label: "BPSC", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30" },
    { label: "Class 6–10", className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30" },
    { label: "Coding Skills", className: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-500/30" },
] as const

const navTint = (href: string) =>
    href === "/courses"
        ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30"
        : href === "/test-series"
        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
        : href === "/tutorials"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
        : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30"

export default async function LandingHomePage() {
    const session = await auth()
    const logoHref = getDashboardHref(session?.user?.role, !!session?.user)

    const homeJsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": "https://aspirantbook.com/#organization",
                "name": "aspirantbook",
                "url": "https://aspirantbook.com",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://aspirantbook.com/aspirant-logo.jpg"
                }
            },
            {
                "@type": "WebSite",
                "@id": "https://aspirantbook.com/#website",
                "url": "https://aspirantbook.com",
                "name": "aspirantbook",
                "publisher": {
                    "@id": "https://aspirantbook.com/#organization"
                },
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://aspirantbook.com/courses?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                }
            }
        ]
    }

    return (
        <div className="min-h-dvh bg-white text-gray-900 font-sans antialiased selection:bg-orange-100 selection:text-orange-900 dark:bg-gray-950 dark:text-gray-50">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
            />

            {/* Top Navigation Bar — sticky, compact on phones */}
            <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-lg dark:border-white/10 dark:bg-gray-950/85">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-8">
                    {/* Brand Logo */}
                    <Link href={logoHref} className="group flex min-w-0 items-center gap-2 sm:gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ECDCC9] bg-[#F7EFE4] p-0.5 shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 sm:h-11 sm:w-11">
                            <Image
                                src="/aspirant-logo.jpg"
                                alt="aspirantbook"
                                width={44}
                                height={44}
                                className="h-full w-full rounded-full object-contain"
                                priority
                            />
                        </div>
                        <span className="truncate text-lg font-black tracking-tight text-gray-900 sm:text-2xl dark:text-white">
                            aspirant<span className="ml-0.5 font-black text-[#F26522]">book</span>
                        </span>
                    </Link>

                    {/* Desktop Menu Links */}
                    <nav className="hidden items-center gap-5 text-sm font-semibold lg:gap-7 md:flex">
                        {LANDING_NAV_ITEMS.map((item) => {
                            const isCoursesOrTest = item.href === "/courses" || item.href === "/test-series" || item.href === "/tutorials"
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-1.5 transition-colors ${
                                        isCoursesOrTest
                                            ? "font-bold text-gray-800 hover:text-[#F26522] dark:text-gray-100"
                                            : item.href === "/practice"
                                            ? "font-bold text-[#5B47FB] hover:text-[#4a36ea]"
                                            : "text-gray-600 hover:text-[#F26522] dark:text-gray-300"
                                    }`}
                                >
                                    <span>{item.name}</span>
                                    {item.badge && (
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                    <div className="flex flex-shrink-0 items-center gap-3">
                        <HomeHeaderUserCTA initialSession={session} />
                    </div>
                </div>
            </header>

            {/* Mobile Sub-Navigation — colourful, scrollable chips (scrolls away, not sticky) */}
            <div
                data-scroll-x="true"
                className="md:hidden flex items-center gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 no-scrollbar dark:border-white/10 dark:bg-gray-900/60"
            >
                {LANDING_NAV_ITEMS.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-transform active:scale-95 ${navTint(item.href)}`}
                    >
                        <span>{item.name}</span>
                        {item.badge && (
                            <span className="rounded-full bg-white/70 px-1.5 text-[9px] font-black dark:bg-white/10">
                                {item.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Main Hero Section */}
            <main className="relative overflow-hidden">
                {/* Decorative colour blobs (vibrant, no fake data) */}
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-orange-300/40 blur-3xl dark:bg-orange-500/20" />
                    <div className="absolute -right-24 top-8 h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-500/20" />
                    <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/15" />
                </div>

                <div className="mx-auto max-w-7xl px-4 pb-4 pt-8 sm:px-8 sm:pt-14">
                    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
                        {/* Left Column Text & CTAs */}
                        <div className="space-y-5 lg:col-span-7">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                                <Sparkles className="h-3.5 w-3.5" />
                                Learn · Understand · Succeed
                            </span>

                            <h1
                                data-testid="landing-hero-heading"
                                className="text-balance text-3xl font-black leading-[1.15] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white"
                            >
                                Not just learn,{" "}
                                <span className="bg-gradient-to-r from-orange-600 via-rose-500 to-fuchsia-600 bg-clip-text text-transparent">
                                    Understand
                                </span>{" "}
                                and make your study{" "}
                                <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
                                    Result Oriented.
                                </span>
                            </h1>

                            <p className="max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg dark:text-gray-300">
                                Let&apos;s start learning and excel in GS, Current Affairs, CSAT, Coding Skills, Math, Science &amp; English.
                            </p>

                            {/* Audience chips — real product lines only */}
                            <div className="flex flex-wrap gap-2 pt-1">
                                {AUDIENCE_CHIPS.map((chip) => (
                                    <span
                                        key={chip.label}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${chip.className}`}
                                    >
                                        {chip.label}
                                    </span>
                                ))}
                            </div>

                            {/* Primary + secondary actions */}
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                                <a
                                    href="#all-courses-container"
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F26522] to-rose-500 px-8 py-3.5 text-base font-extrabold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:from-[#E05310] hover:to-rose-600 hover:shadow-xl active:scale-95 sm:text-lg"
                                >
                                    <span>View Learning Programs</span>
                                    <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                                </a>
                                <Link
                                    href="/courses"
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-indigo-200 bg-white/70 px-6 py-3.5 text-sm font-bold text-indigo-700 transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 sm:text-base dark:border-indigo-500/30 dark:bg-transparent dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                >
                                    <BookOpen className="h-5 w-5" />
                                    <span>Explore All Courses</span>
                                </Link>
                            </div>
                        </div>

                        {/* Right Column Illustration */}
                        <div className="flex justify-center lg:col-span-5 lg:justify-end">
                            <div className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[380px] lg:max-w-[420px]">
                                {/* Organic multi-colour circle background */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-200 via-amber-100 to-rose-200 dark:from-orange-500/25 dark:via-amber-500/15 dark:to-rose-500/25" />
                                <Image
                                    src="/curious-hero-child.svg"
                                    alt="Child learning on a device"
                                    fill
                                    priority
                                    sizes="(max-width: 640px) 300px, (max-width: 1024px) 380px, 420px"
                                    className="relative z-10 object-contain"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Value Pillars — 4 vibrant tiles (2×2 on phones, 4 across on desktop) */}
                    <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-4 lg:grid-cols-4">
                        {VALUE_PILLARS.map(({ Icon, title, subtitle, tile, chip }) => (
                            <div
                                key={title}
                                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${tile}`}
                            >
                                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${chip}`}>
                                    <Icon className="h-6 w-6 stroke-[2]" />
                                </div>
                                <h3 className="text-sm font-extrabold leading-tight text-gray-900 sm:text-base dark:text-white">
                                    {title}
                                </h3>
                                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {subtitle}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Class 6 to 12 & Skills Batches Section */}
            <ClassesCoursesSection />
        </div>
    )
}
