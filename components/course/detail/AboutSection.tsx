"use client"

import { Check } from "lucide-react"
import { localized, type Lang } from "@/lib/i18n/localized"
import type { DetailCourse, DetailTeacher } from "./types"
import { fontStackFor } from "./theme"

interface AboutSectionProps {
  course: DetailCourse
  lang: Lang
  teacher?: DetailTeacher | null
  whatYouGet: Array<{ en: string; hi?: string | null; icon?: string }>
  howItWorks: Array<{ en: string; hi?: string | null }>
}

export function AboutSection({
  course,
  lang,
  teacher,
  whatYouGet,
  howItWorks,
}: AboutSectionProps) {
  const teacherName = teacher ? localized(teacher as any, "name", lang) || teacher.name : ""
  const courseTitle = localized(course, "title", lang) || course.title

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

  const effectiveWhatYouGet = Array.isArray(whatYouGet) ? whatYouGet.filter((item) => item?.en) : []
  const effectiveHowItWorks = Array.isArray(howItWorks) ? howItWorks.filter((item) => item?.en) : []

  const hasWhatYouGet = effectiveWhatYouGet.length > 0
  const hasAboutCourse = credentials.length > 0 || effectiveHowItWorks.length > 0 || Boolean(teacherName)

  if (!hasWhatYouGet && !hasAboutCourse) {
    return null
  }

  const gridCols = hasWhatYouGet && hasAboutCourse ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-3xl"

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-24 pt-8 pb-12"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      <div className={`grid grid-cols-1 gap-10 ${gridCols} lg:gap-14`}>
        {/* Left Column: What you get */}
        {hasWhatYouGet && (
          <div>
            <h2
              id="about-heading"
              className="text-2xl font-black uppercase tracking-tight text-[color:var(--cd-olive)] sm:text-3xl"
              style={{ fontFamily: "var(--cd-font-heading)" }}
              lang={lang}
            >
              {lang === "hi" ? "आपको क्या मिलता है" : "What you get"}
            </h2>

            <div className="mt-5 space-y-3">
              {effectiveWhatYouGet.map((item, index) => {
                const text = lang === "hi" && item.hi ? item.hi : item.en
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3.5 rounded-2xl border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] p-4 shadow-xs"
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--cd-gold)] text-[color:var(--cd-olive)]"
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold text-gray-900 sm:text-base leading-snug" lang={lang}>
                      {text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Right Column: About this course */}
        {hasAboutCourse && (
          <div>
            <h2
              className="text-2xl font-black uppercase tracking-tight text-[color:var(--cd-olive)] sm:text-3xl"
              style={{ fontFamily: "var(--cd-font-heading)" }}
              lang={lang}
            >
              {lang === "hi" ? "इस कोर्स के बारे में" : "About this course"}
            </h2>

            <div className="mt-5">
              <h3
                className="text-lg font-black text-gray-900 sm:text-xl"
                style={{ fontFamily: "var(--cd-font-heading)" }}
                lang={lang}
              >
                {courseTitle}
              </h3>

              {teacherName && (
                <p className="mt-1 text-sm text-gray-700">
                  {lang === "hi" ? "शिक्षक: " : "Taught by "}
                  <span className="font-bold text-gray-900">{teacherName}</span>
                </p>
              )}

              {/* Credential chips with gold checks */}
              {credentials.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {credentials.map((cred, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] px-3 py-1 text-xs font-semibold text-gray-800 shadow-2xs"
                    >
                      <Check className="h-3 w-3 text-amber-500 stroke-[3]" aria-hidden="true" />
                      <span>{cred}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* How the course works */}
              {effectiveHowItWorks.length > 0 && (
                <div className="mt-6">
                  <h4
                    className="text-base font-black text-gray-900"
                    style={{ fontFamily: "var(--cd-font-heading)" }}
                    lang={lang}
                  >
                    {lang === "hi" ? "यह कोर्स कैसे काम करता है" : "How the course works"}
                  </h4>

                  <ol className="mt-3 space-y-2.5">
                    {effectiveHowItWorks.map((step, idx) => {
                      const stepText = lang === "hi" && step.hi ? step.hi : step.en
                      return (
                        <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed text-gray-800">
                          <span
                            className="font-black text-gray-950 shrink-0"
                            style={{ fontFamily: "var(--cd-font-heading)" }}
                          >
                            {idx + 1}.
                          </span>
                          <span lang={lang}>{stepText}</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
