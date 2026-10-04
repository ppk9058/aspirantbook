"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { ArrowRight, User } from "lucide-react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

interface CuriousNavbarProps {
  activeTab?: string
}

export default function CuriousNavbar({ activeTab }: CuriousNavbarProps) {
  const { data: session } = useSession()
  const { openMobileAuth } = useMobileAuth()
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
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
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-gray-700">
          {/* Skills -> navigates to existing aspirantbook dashboard */}
          <Link
            href="/dashboard"
            className="hover:text-[#F26522] transition-colors flex items-center gap-1 text-[#F26522] font-bold"
          >
            <span>Skills</span>
            <span className="text-[10px] bg-orange-100 text-[#F26522] px-2 py-0.5 rounded-full font-bold">
              App
            </span>
          </Link>
          <Link
            href="/#all-courses-container"
            className={`hover:text-[#F26522] transition-colors ${
              activeTab === "school-prep" ? "text-[#F26522] font-bold" : ""
            }`}
          >
            School Prep
          </Link>
          <Link
            href="/#section-upsc"
            className={`hover:text-[#F26522] transition-colors ${
              activeTab === "upsc" ? "text-[#F26522] font-bold" : ""
            }`}
          >
            UPSC
          </Link>
          <Link
            href="/#section-bpsc"
            className={`hover:text-[#F26522] transition-colors ${
              activeTab === "bpsc" ? "text-[#F26522] font-bold" : ""
            }`}
          >
            BPSC
          </Link>
          {/* Coding Practice menu in distinct vibrant accent */}
          <Link
            href="/practice"
            className={`hover:text-[#4a36ea] transition-colors flex items-center gap-1.5 font-bold ${
              activeTab === "practice" ? "text-[#4a36ea]" : "text-[#5B47FB]"
            }`}
          >
            <span>Coding Practice</span>
            <span className="text-[10px] bg-[#EEECFF] text-[#5B47FB] px-2 py-0.5 rounded-full font-bold">
              Live
            </span>
          </Link>
        </nav>

        {/* Right Actions: Admin Link + User State / Login CTA */}
        <div className="flex items-center gap-3">
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin/batches"
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              Admin Batches
            </Link>
          )}

          {session?.user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={session.user.role === "ADMIN" ? "/admin" : session.user.role === "TEACHER" ? "/teacher" : "/dashboard"}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#F26522] to-[#FF7A00] text-white font-bold text-xs sm:text-sm hover:opacity-95 transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                title={session.user.name || "Profile"}
              >
                <div className="w-8 h-8 rounded-lg bg-[#05192D] text-white flex items-center justify-center font-bold text-xs">
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="hidden sm:flex flex-col text-left pr-1.5">
                  <span className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[120px]">
                    {session.user.name || "User"}
                  </span>
                  <span className="text-[10px] text-gray-500 capitalize leading-tight">
                    {session.user.role === "ADMIN" ? "Admin" : session.user.role === "TEACHER" ? "Teacher" : "Student"}
                  </span>
                </div>
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openMobileAuth({ actionType: "login" })}
              className="px-6 py-2.5 rounded-xl border-2 border-[#F26522] text-[#F26522] hover:bg-[#F26522] hover:text-white font-bold text-sm transition-all duration-200 shadow-2xs cursor-pointer"
            >
              Login/Register
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center gap-5 px-4 py-2.5 overflow-x-auto no-scrollbar border-t border-gray-100 bg-gray-50/80 text-xs font-semibold text-gray-700">
        <Link
          href="/dashboard"
          className="text-[#F26522] font-bold flex items-center gap-1 shrink-0"
        >
          <span>Skills</span>
          <span className="text-[9px] bg-orange-100 text-[#F26522] px-1.5 py-0.2 rounded-full font-bold">
            App
          </span>
        </Link>
        <Link href="/#all-courses-container" className="hover:text-[#F26522] transition-colors shrink-0">
          School Prep
        </Link>
        <Link href="/#section-upsc" className="hover:text-[#F26522] transition-colors shrink-0">
          UPSC
        </Link>
        <Link href="/#section-bpsc" className="hover:text-[#F26522] transition-colors shrink-0">
          BPSC
        </Link>
        <Link
          href="/practice"
          className="text-[#5B47FB] font-bold flex items-center gap-1 shrink-0"
        >
          <span>Coding Practice</span>
          <span className="text-[9px] bg-[#EEECFF] text-[#5B47FB] px-1.5 py-0.2 rounded-full font-bold">
            Live
          </span>
        </Link>
        <Link
          href="/admin/batches"
          className="text-gray-600 hover:text-gray-900 font-semibold shrink-0"
        >
          Admin
        </Link>
      </div>
    </header>
  )
}
