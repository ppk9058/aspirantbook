"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { User, ShoppingBag, Settings, LogOut } from "lucide-react"
import { safeSignOut } from "@/lib/auth-client"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"

export interface ProfileDropdownProps {
  hideMyPurchase?: boolean
  className?: string
}

export default function ProfileDropdown({
  hideMyPurchase = false,
  className = "",
}: ProfileDropdownProps) {
  const { data: session, status } = useSession()
  const { openMobileAuth } = useMobileAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      window.addEventListener("pointerdown", handleClickOutside)
      return () => {
        window.removeEventListener("pointerdown", handleClickOutside)
      }
    }
  }, [showProfileMenu])

  // Close on Esc key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [showProfileMenu])

  if (status === "loading") {
    return (
      <div className={`flex items-center gap-2 p-1 sm:p-1.5 ${className}`} aria-label="Loading profile skeleton">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="hidden md:flex flex-col gap-1 text-left">
          <div className="w-16 h-2.5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="w-10 h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        data-testid="profile-login-btn"
        onClick={() => openMobileAuth({ actionType: "login" })}
        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-sm transition-all cursor-pointer min-h-[36px]"
      >
        Login / Register
      </button>
    )
  }

  const roleLabel =
    session.user.role === "ADMIN"
      ? "Admin"
      : session.user.role === "TEACHER"
      ? "Teacher"
      : "Student"

  const displayName = session.user.name || session.user.email?.split("@")[0] || "Learner"
  const initial = session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        data-testid="profile-dropdown-trigger"
        onClick={() => setShowProfileMenu((prev) => !prev)}
        className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
        aria-label="User menu"
        aria-expanded={showProfileMenu}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-[#1448d8] to-[#1DB954] rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
          {initial}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] text-gray-500 capitalize leading-tight">
            {roleLabel}
          </span>
        </div>
      </button>

      {showProfileMenu && (
        <div
          data-testid="profile-dropdown-menu"
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0a2540] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate" data-testid="profile-dropdown-user-name">
                {displayName}
              </p>
              <span
                data-testid="profile-dropdown-role-badge"
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              >
                {roleLabel}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate" data-testid="profile-dropdown-user-email">
              {session.user.email}
            </p>
          </div>

          <Link
            href="/profile"
            data-testid="profile-menu-my-profile"
            onClick={() => setShowProfileMenu(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <User className="h-4 w-4 text-gray-400" />
            <span>My Profile</span>
          </Link>

          {!hideMyPurchase && (
            <Link
              href="/purchases"
              data-testid="profile-menu-my-purchase"
              onClick={() => setShowProfileMenu(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors font-semibold"
            >
              <ShoppingBag className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>My Purchase</span>
            </Link>
          )}

          <Link
            href="/settings"
            data-testid="profile-menu-settings"
            onClick={() => setShowProfileMenu(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <Settings className="h-4 w-4 text-gray-400" />
            <span>Settings</span>
          </Link>

          <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

          <button
            type="button"
            data-testid="profile-menu-signout"
            onClick={() => {
              setShowProfileMenu(false)
              safeSignOut("/")
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}
