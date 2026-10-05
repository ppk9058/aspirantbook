"use client"

import React, { useState } from "react"
import Image from "next/image"
import { GraduationCap, CheckCircle2 } from "lucide-react"
import { LaurelSealEmblem } from "./LaurelSealEmblem"

export interface TeacherProfile {
  id?: string
  name: string
  role?: string
  subject: string
  experience?: string
  qualification?: string
  avatar: string
  bio?: string
  followers?: string
}

interface CourseTeachersSectionProps {
  teachers?: TeacherProfile[]
  courseId?: string
  courseSlug?: string
  batchSlug?: string
  userRole?: string
  title?: string
  subtitle?: string
}

// Default faculty lineup matching the reference image
const DEFAULT_REFERENCE_TEACHERS: TeacherProfile[] = [
  {
    name: "Ashish Kumar",
    role: "Senior Mentor",
    subject: "Quant & Aptitude",
    experience: "8+ Years",
    qualification: "Ex-Faculty Specialist",
    avatar: "/images/teachers/ashish-kumar.png",
    followers: "85k followers",
  },
  {
    name: "Chahat Aggrawal",
    role: "Lead Educator",
    subject: "General Studies & CS",
    experience: "7+ Years",
    qualification: "Senior Analyst",
    avatar: "/images/teachers/chahat-aggrawal.png",
    followers: "94k followers",
  },
  {
    name: "Akhilesh Jat",
    role: "Lead Strategist",
    subject: "Index Strategies",
    experience: "10+ Years",
    qualification: "Certified Market Strategist",
    avatar: "/images/teachers/akhilesh-jat.png",
    followers: "119k followers",
  },
  {
    name: "Palak Jain",
    role: "Senior Faculty",
    subject: "Corporate Law & CS",
    experience: "6+ Years",
    qualification: "Legal Specialist",
    avatar: "/images/teachers/palak-jain.png",
    followers: "105k followers",
  },
  {
    name: "Priyank Sharma",
    role: "Quant Specialist",
    subject: "Data & Index Modeling",
    experience: "9+ Years",
    qualification: "Senior Quant Analyst",
    avatar: "/images/teachers/priyank-sharma.png",
    followers: "98k followers",
  },
]

export function CourseTeachersSection({
  teachers: initialTeachers,
  title = "Meet Your Mentors",
  subtitle = "Learn directly from India's most accomplished educators & industry experts",
}: CourseTeachersSectionProps) {
  // Normalize initial list: if empty or single placeholder, use default 5 teachers
  const teachers: TeacherProfile[] =
    initialTeachers && initialTeachers.length >= 2
      ? initialTeachers
      : initialTeachers && initialTeachers.length === 1 && initialTeachers[0].name !== "Academic Lead & Faculty"
      ? initialTeachers
      : DEFAULT_REFERENCE_TEACHERS

  // Activate the middle teacher (Akhilesh Jat if 5 items) to mirror the reference image
  const defaultIndex = Math.min(2, Math.max(0, Math.floor((teachers.length - 1) / 2)))
  const [activeTeacherIndex, setActiveTeacherIndex] = useState<number>(defaultIndex)

  const activeTeacher = teachers[activeTeacherIndex] || teachers[0]

  return (
    <section
      id="teachers"
      className="relative scroll-mt-32 w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-purple-500/20 text-white select-none transition-all"
      style={{
        background:
          "radial-gradient(ellipse at 50% 20%, rgba(132, 90, 223, 0.4) 0%, rgba(84, 60, 172, 0.95) 50%, #352568 100%)",
      }}
    >
      {/* Decorative ambient background glows matching screenshot */}
      <div data-scroll-x="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-6 pb-2 md:px-8 md:pt-7 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-300" />
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {title}
            </h2>
          </div>
          <p className="text-xs text-purple-200/80 mt-0.5 hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* TEACHERS ROW CONTAINER */}
      <div data-scroll-x="true" className="relative z-10 px-4 md:px-8 pt-4 pb-2 md:pt-6 overflow-hidden">
        <div data-scroll-x="true" className="flex items-end justify-start sm:justify-center gap-3 sm:gap-6 md:gap-10 lg:gap-14 overflow-x-auto no-scrollbar py-6">
          {teachers.map((teacher, idx) => {
            const isActive = activeTeacherIndex === idx

            return (
              <div
                key={teacher.id || idx}
                onMouseEnter={() => setActiveTeacherIndex(idx)}
                onClick={() => setActiveTeacherIndex(idx)}
                className="group relative flex flex-col items-center cursor-pointer transition-all duration-300 shrink-0"
                style={{ width: isActive ? "160px" : "110px" }}
              >
                {/* TEACHER PORTRAIT STAGE */}
                <div className="relative flex flex-col items-center justify-end h-40 md:h-48 w-full">
                  {/* Laurel Emblem Seal behind the teacher (Radiates when active/hovered) */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 z-0 ${
                      isActive
                        ? "opacity-85 scale-110 -translate-y-2 text-purple-200"
                        : "opacity-0 scale-75 text-purple-300/40"
                    }`}
                  >
                    <LaurelSealEmblem className="w-36 h-36 md:w-44 md:h-44 drop-shadow-[0_0_15px_rgba(192,132,252,0.35)]" />
                  </div>

                  {/* Teacher Portrait Image (Gets bigger on moving mouse / hover) */}
                  <div
                    className={`relative z-10 transition-all duration-300 ease-out origin-bottom ${
                      isActive
                        ? "scale-125 md:scale-135 -translate-y-3 md:-translate-y-4 filter-none drop-shadow-[0_15px_20px_rgba(0,0,0,0.45)]"
                        : "scale-100 opacity-85 grayscale contrast-110 brightness-95 group-hover:opacity-100 group-hover:scale-105"
                    }`}
                  >
                    <div
                      className="relative w-24 h-32 md:w-28 md:h-36 overflow-visible"
                      style={{
                        WebkitMaskImage:
                          "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
                        maskImage:
                          "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
                      }}
                    >
                      <Image
                        src={teacher.avatar || "/curious-avatar.svg"}
                        alt={teacher.name}
                        fill
                        sizes="(max-width: 768px) 120px, 160px"
                        className="object-contain object-bottom select-none pointer-events-none"
                        priority={idx === defaultIndex}
                      />
                    </div>
                  </div>
                </div>

                {/* TEACHER NAME BELOW (in normal state) */}
                {!isActive && (
                  <div className="mt-2 text-center transition-opacity duration-200">
                    <span className="font-semibold text-xs md:text-sm text-white/90 drop-shadow-sm line-clamp-1">
                      {teacher.name}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ACTIVE TEACHER FLOATING DETAIL CARD (Matches Akhilesh Jat's card in image) */}
      <div className="relative z-10 flex justify-center px-4 pb-7 pt-1">
        <div
          className="w-full max-w-sm sm:max-w-md rounded-2xl p-4 md:p-5 border border-purple-400/25 shadow-2xl backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: "#4f349c",
            boxShadow: "0 20px 40px -15px rgba(26, 16, 60, 0.7)",
          }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-lg font-extrabold text-white tracking-tight">
                {activeTeacher.name}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-purple-200 border border-purple-300/20">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                Verified
              </span>
            </div>

            <p className="text-xs md:text-sm font-semibold text-purple-200 leading-snug">
              {activeTeacher.subject}
            </p>

            <div className="flex items-center gap-2 text-xs text-purple-200 font-medium pt-0.5">
              {activeTeacher.followers && (
                <span>{activeTeacher.followers}</span>
              )}
              {activeTeacher.followers && activeTeacher.experience && (
                <span>&bull;</span>
              )}
              {activeTeacher.experience && (
                <span>{activeTeacher.experience}</span>
              )}
              {activeTeacher.qualification && (
                <>
                  <span>&bull;</span>
                  <span className="hidden sm:inline">{activeTeacher.qualification}</span>
                </>
              )}
            </div>

            {activeTeacher.bio && (
              <p className="text-[11px] text-purple-200/80 pt-1 leading-relaxed line-clamp-2">
                &ldquo;{activeTeacher.bio}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
