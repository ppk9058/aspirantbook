"use client"

import Image from "next/image"
import { GraduationCap, UserRound } from "lucide-react"
import { localized, type Lang } from "@/lib/i18n/localized"
import { stripUnsafeImageUrl } from "@/lib/courses/metadata-schema"
import type { DetailTeacher } from "./types"
import { fontStackFor } from "./theme"

interface TeachersSectionProps {
  lang: Lang
  teachers: DetailTeacher[]
}

export function TeachersSection({ lang, teachers }: TeachersSectionProps) {
  if (!teachers || teachers.length === 0) return null

  return (
    <section
      id="teachers"
      aria-labelledby="teachers-heading"
      className="scroll-mt-24 pt-8 pb-16"
      style={{ fontFamily: fontStackFor(lang) }}
    >
      <h2
        id="teachers-heading"
        className="text-3xl font-black tracking-tight text-[color:var(--cd-ink)] sm:text-4xl"
        style={{ fontFamily: "var(--cd-font-heading)" }}
        lang={lang}
      >
        {lang === "hi" ? "आपके शिक्षक" : "Teachers"}
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {teachers.map((teacher, index) => {
          const avatar = stripUnsafeImageUrl(teacher.avatar || teacher.photo)
          const name = localized(teacher as any, "name", lang) || teacher.name
          const bio = localized(teacher as any, "bio", lang) || teacher.bio

          const formatCred = (cred: any): string => {
            if (typeof cred === "string") return cred
            if (cred && typeof cred === "object") {
              return (lang === "hi" && cred.labelHi) ? cred.labelHi : (cred.label || "")
            }
            return ""
          }

          const credentials = (
            lang === "hi" && teacher.credentialsHi?.length
              ? teacher.credentialsHi
              : (teacher.credentials || [])
          ).map(formatCred).filter(Boolean)

          return (
            <div
              key={`${name}-${index}`}
              className="flex flex-col sm:flex-row gap-5 rounded-2xl border border-[color:var(--cd-cream-dark)] bg-[color:var(--cd-cream-card)] p-5 shadow-xs"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/40 shadow-sm">
                {avatar ? (
                  <Image src={avatar} alt={name} fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[color:var(--cd-navy)]/10">
                    <UserRound className="h-10 w-10 text-[color:var(--cd-navy)]/60" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="text-lg font-black text-gray-950 sm:text-xl"
                  style={{ fontFamily: "var(--cd-font-heading)" }}
                  lang={lang}
                >
                  {name}
                </p>

                {Boolean((teacher as any).role || (teacher as any).roleHi) && (
                  <p className="mt-0.5 text-xs font-semibold text-gray-600">
                    {lang === "hi" && (teacher as any).roleHi
                      ? (teacher as any).roleHi
                      : (teacher as any).role || (teacher as any).roleHi}
                  </p>
                )}

                {credentials.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {credentials.map((cred, cIdx) => (
                      <span
                        key={cIdx}
                        className="rounded-full bg-white/80 border border-[color:var(--cd-cream-dark)] px-2.5 py-0.5 text-[11px] font-semibold text-gray-800"
                      >
                        {cred}
                      </span>
                    ))}
                  </div>
                )}

                {bio && (
                  <p className="mt-3 text-xs sm:text-sm text-gray-700 leading-relaxed" lang={lang}>
                    {bio}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
