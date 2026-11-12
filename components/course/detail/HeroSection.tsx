"use client"

import Image from "next/image"
import { GraduationCap } from "lucide-react"
import { localized, type Lang } from "@/lib/i18n/localized"
import { stripUnsafeImageUrl } from "@/lib/courses/metadata-schema"
import { fontStackFor } from "./theme"
import type { DetailCourse, DetailTeacher, BadgeChip, LateJoinNote, HeroStat } from "./types"

interface HeroSectionProps {
  course: DetailCourse
  lang: Lang
  stats: HeroStat[]
  badges?: BadgeChip[]
  pillTags?: string[]
  teacher?: DetailTeacher | null
  lateJoinNote?: LateJoinNote | null
  goalLabel?: string
  goalLabelHi?: string | null
  hideIllustration?: boolean
  customIllustration?: React.ReactNode
  rightSlot?: React.ReactNode
}

export function WalkingKidsSvg({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Kid 1 (Left - girl with pigtails and pink backpack) */}
      <g id="kid1">
        {/* Head */}
        <circle cx="20" cy="14" r="6" fill="#F8B195" />
        {/* Hair */}
        <path d="M14 14C14 10 17 8 20 8C23 8 26 10 26 14C24 13 22 13 20 13C17 13 15 13 14 14Z" fill="#3D2314" />
        <circle cx="13" cy="13" r="2.5" fill="#3D2314" />
        <circle cx="27" cy="13" r="2.5" fill="#3D2314" />
        {/* Face */}
        <circle cx="18" cy="14" r="0.75" fill="#2C3E50" />
        <circle cx="22" cy="14" r="0.75" fill="#2C3E50" />
        <path d="M19 16.5C19.5 17 20.5 17 21 16.5" stroke="#2C3E50" strokeWidth="0.75" strokeLinecap="round" />
        {/* Body/Shirt */}
        <rect x="16" y="20" width="8" height="11" rx="2" fill="#E84A5F" />
        {/* Backpack */}
        <rect x="13" y="21" width="3.5" height="8" rx="1.5" fill="#FF847C" />
        {/* Skirt */}
        <path d="M15 31L16 36H24L25 31H15Z" fill="#99B898" />
        {/* Legs */}
        <rect x="17" y="36" width="2" height="7" fill="#F8B195" />
        <rect x="21" y="36" width="2" height="7" fill="#F8B195" />
        {/* Shoes */}
        <rect x="16" y="42" width="3.5" height="2" rx="1" fill="#2A363B" />
        <rect x="21" y="42" width="3.5" height="2" rx="1" fill="#2A363B" />
      </g>

      {/* Kid 2 (Right - boy with cap/hair and green backpack) */}
      <g id="kid2">
        {/* Head */}
        <circle cx="38" cy="13" r="6.5" fill="#F8B195" />
        {/* Hair */}
        <path d="M31.5 12C31.5 8 34.5 7 38 7C41.5 7 44.5 8 44.5 12C42 10.5 39 10.5 38 10.5C36 10.5 33 11 31.5 12Z" fill="#2C3E50" />
        {/* Face */}
        <circle cx="36" cy="13" r="0.75" fill="#2C3E50" />
        <circle cx="40" cy="13" r="0.75" fill="#2C3E50" />
        <path d="M37 15.5C37.5 16 38.5 16 39 15.5" stroke="#2C3E50" strokeWidth="0.75" strokeLinecap="round" />
        {/* Shirt */}
        <rect x="34" y="19" width="9" height="12" rx="2" fill="#2A9D8F" />
        {/* Backpack */}
        <rect x="42.5" y="20" width="3.5" height="9" rx="1.5" fill="#E76F51" />
        {/* Shorts */}
        <rect x="34.5" y="31" width="8" height="6" rx="1" fill="#264653" />
        {/* Legs */}
        <rect x="35.5" y="37" width="2" height="6" fill="#F8B195" />
        <rect x="39.5" y="37" width="2" height="6" fill="#F8B195" />
        {/* Shoes */}
        <rect x="35" y="42" width="3.5" height="2" rx="1" fill="#E76F51" />
        <rect x="39.5" y="42" width="3.5" height="2" rx="1" fill="#E76F51" />
      </g>
    </svg>
  )
}

/**
 * Pixel-faithful Hero according to spec & screenshot 1:
 * - Full-width navy background (--cd-navy)
 * - Large condensed bold H1 title (white)
 * - Subtitle ~22px light
 * - Teacher row: round photo (64px) with white ring + "Taught by Name" + credentials separated by dividers
 * - Thin horizontal divider
 * - Stats row: 4 columns separated by vertical dividers
 * - "Joining late?" gold bold label + normal text
 * - Badges: first outlined, rest filled translucent
 * - Bottom rolling hill in lighter navy (--cd-navy-light), dotted path, kids SVG, end goal label + half gold sun
 * - Right column: slot for the sticky floating card
 */
export function HeroSection({
  course,
  lang,
  stats,
  badges = [],
  pillTags = [],
  teacher,
  lateJoinNote,
  goalLabel,
  goalLabelHi,
  hideIllustration = false,
  customIllustration,
  rightSlot,
}: HeroSectionProps) {
  const title = localized(course, "title", lang)
  const metaSubtitle = (() => {
    try {
      if ((course as any)?.metadataJson) {
        const m = typeof (course as any).metadataJson === "string" ? JSON.parse((course as any).metadataJson) : (course as any).metadataJson
        return lang === "hi" && m.subtitleHi ? m.subtitleHi : (m.subtitle || "")
      }
    } catch {}
    return ""
  })()
  const subtitle =
    lang === "hi" && course.subtitleHi
      ? course.subtitleHi
      : localized(course, "subtitle", lang) || metaSubtitle
  const avatarUrl = stripUnsafeImageUrl(teacher?.avatar || teacher?.photo)
  const teacherName = teacher ? localized(teacher as any, "name", lang) || teacher.name : ""

  const formatCred = (cred: any): string => {
    if (typeof cred === "string") return cred
    if (cred && typeof cred === "object") {
      return (lang === "hi" && cred.labelHi) ? cred.labelHi : (cred.label || "")
    }
    return ""
  }

  const credentials = (
    lang === "hi" && teacher?.credentialsHi?.length
      ? teacher.credentialsHi
      : (teacher?.credentials || [])
  ).map(formatCred).filter(Boolean)

  const effectiveGoal = (lang === "hi" && goalLabelHi) ? goalLabelHi : (goalLabel || "")

  // If badges are empty, synthesize from pillTags
  const effectiveBadges: BadgeChip[] =
    badges.length > 0
      ? badges
      : pillTags.map((tag, idx) => ({
          label: tag,
          variant: idx === 0 ? "outlined" : "filled",
        }))

  return (
    <section
      aria-label="Course overview"
      className="relative w-full bg-[color:var(--cd-navy)] text-white"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Column (Hero Content) */}
          <div className="lg:col-span-8 lg:max-w-3xl">
            {/* H1 Title */}
            <h1
              className="text-3xl font-black uppercase tracking-tight text-white sm:text-5xl lg:text-[56px] lg:leading-[1.05]"
              style={{ fontFamily: "var(--cd-font-heading)" }}
              lang={lang}
            >
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p className="mt-3 text-base text-white/80 sm:text-lg lg:text-[21px] lg:leading-snug" lang={lang}>
                {subtitle}
              </p>
            )}

            {/* Teacher Row */}
            {teacherName && (
              <div className="mt-6 flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/20 sm:h-16 sm:w-16">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={teacherName} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/20">
                      <GraduationCap className="h-7 w-7 text-white/90" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm text-white/90 sm:text-base">
                    {lang === "hi" ? "शिक्षक: " : "Taught by "}
                    <span className="font-bold text-white">{teacherName}</span>
                  </p>
                  {credentials.length > 0 && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-white/70 sm:text-sm">
                      {credentials.map((cred, idx) => (
                        <span key={idx} className="inline-flex items-center">
                          {idx > 0 && <span className="mr-2 text-white/40">|</span>}
                          {cred}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Horizontal divider rule */}
            <hr className="my-6 border-white/20" />

            {/* Stats Row (Up to 4 Columns with thin vertical dividers) */}
            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 divide-y divide-white/15 sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:divide-white/20 sm:gap-0 mt-6">
                {stats.slice(0, 4).map((stat, idx) => {
                  const statVal = lang === "hi" && stat.valueHi ? stat.valueHi : stat.value
                  const rawCap = lang === "hi" && stat.captionHi ? stat.captionHi : stat.caption
                  const statCap = (() => {
                    if (lang === "hi") {
                      if (stat.captionHi && stat.captionHi.trim()) return stat.captionHi
                      const lower = (stat.caption || "").toLowerCase().trim()
                      if (lower === "batch starts" || lower === "starts") return "बैच प्रारंभ"
                      if (lower === "first class") return "प्रथम कक्षा"
                      if (lower === "live classes" || lower === "live sessions") return "लाइव कक्षाएं"
                      if (lower === "recorded classes" || lower === "recordings") return "रिकॉर्डेड कक्षाएं"
                      if (lower === "validity" || lower === "till exam") return "परीक्षा तक वैध"
                    }
                    return rawCap
                  })()
                  return (
                    <div key={idx} className="pt-2 sm:pt-0 sm:px-4 sm:first:pl-0 sm:last:pr-0 min-w-0">
                      <div
                        className="text-xl sm:text-2xl lg:text-[26px] font-black tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ fontFamily: "var(--cd-font-heading)" }}
                        data-testid={`stat-value-${idx}`}
                      >
                        {statVal}
                      </div>
                      <div className="mt-0.5 text-xs text-white/70 sm:text-sm leading-snug break-words">
                        {statCap}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Late Join Note */}
            {lateJoinNote?.enabled && (lateJoinNote.text || lateJoinNote.textHi) && (
              <div
                data-testid="hero-late-join-note"
                className="mt-6 flex flex-wrap items-baseline gap-2 text-xs sm:text-sm text-white/85 pr-14 sm:pr-0 pb-3 sm:pb-0"
              >
                <span className="font-extrabold text-[color:var(--cd-gold)]">
                  {lang === "hi" ? lateJoinNote.labelHi || lateJoinNote.label || "देर से जुड़ रहे हैं?" : lateJoinNote.label || "Joining late?"}
                </span>
                <span>
                  {lang === "hi" ? lateJoinNote.textHi || lateJoinNote.text : lateJoinNote.text}
                </span>
              </div>
            )}

            {/* Badges Row */}
            {effectiveBadges.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                {effectiveBadges.map((badge, idx) => {
                  const badgeLabel = lang === "hi" && badge.labelHi ? badge.labelHi : badge.label
                  const isOutlined = badge.variant === "outlined" || idx === 0
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold ${
                        isOutlined
                          ? "border border-white/80 text-white"
                          : "bg-white/15 text-white backdrop-blur-xs"
                      }`}
                    >
                      {badgeLabel}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column (Floating Sticky Card slot on desktop) */}
          <div className="lg:col-span-4 lg:relative lg:z-20">
            {rightSlot}
          </div>
        </div>
      </div>

      {/* Bottom Rolling Hill & Kid Illustration Decoration */}
      <div className="relative mt-8 w-full">
        {/* Rolling hill background shape */}
        <div className="relative h-20 w-full overflow-hidden sm:h-24">
          <svg
            viewBox="0 0 1440 96"
            fill="none"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <path
              d="M0 96L0 48C240 24 480 16 720 32C960 48 1200 40 1440 20L1440 96L0 96Z"
              fill="var(--cd-navy-light)"
            />
          </svg>

          {/* Dotted path running horizontally across the hill */}
          <svg
            viewBox="0 0 1440 96"
            fill="none"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <path
              d="M0 56C240 32 480 26 720 40C960 54 1200 46 1440 26"
              stroke="white"
              strokeWidth="2.5"
              strokeDasharray="4 6"
              strokeOpacity="0.75"
            />
          </svg>

          {/* Kids and goal label aligned to the content container */}
          <div className="mx-auto flex h-full max-w-7xl items-end justify-between px-4 pb-2 sm:px-6 lg:px-8">
            {/* Walking Kids Illustration on the left */}
            {!hideIllustration && (
              <div className="relative z-10 -mb-1 flex items-end">
                {customIllustration || <WalkingKidsSvg className="h-10 w-auto sm:h-12" />}
              </div>
            )}

            {/* Goal label and half gold sun on the path end (placed to the left of desktop purchase card) */}
            <div className="relative z-10 flex items-end gap-3 self-end pr-4 lg:mr-[380px]">
              {effectiveGoal ? (
                <span className="text-xs font-bold text-white/90 sm:text-sm tracking-wide">
                  {effectiveGoal}
                </span>
              ) : null}
              {/* Half gold sun rising from hill */}
              <div
                className="relative -mb-1 flex h-7 w-14 items-center justify-center overflow-hidden rounded-t-full bg-[color:var(--cd-gold)] shadow-[0_-4px_12px_rgba(245,200,66,0.5)]"
                aria-hidden="true"
              >
                <div className="h-full w-full bg-gradient-to-t from-amber-400 to-[color:var(--cd-gold)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
