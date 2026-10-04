"use client"

import React, { useState, useEffect } from "react"
import { AppRole } from "@/lib/auth/roles"
import { Shield, GraduationCap, School, ChevronDown, Check } from "lucide-react"

export default function RoleSwitcher() {
  const [currentRole, setCurrentRole] = useState<AppRole>("STUDENT")
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Read current role from API
    fetch("/api/auth/role")
      .then((res) => res.json())
      .then((data) => {
        if (data.role) setCurrentRole(data.role)
      })
      .catch(() => {})
  }, [])

  const handleSelectRole = async (role: AppRole) => {
    setIsUpdating(true)
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setCurrentRole(role)
        setIsOpen(false)
        // Redirect to appropriate landing page
        if (role === "TEACHER") {
          window.location.href = "/teacher"
        } else if (role === "ADMIN") {
          window.location.href = "/admin"
        } else {
          window.location.href = "/dashboard"
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  const roleConfig: Record<AppRole, { label: string; icon: any; color: string; badge: string }> = {
    STUDENT: {
      label: "Student View",
      icon: GraduationCap,
      color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      badge: "Learner",
    },
    TEACHER: {
      label: "Teacher Studio",
      icon: School,
      color: "bg-[#5B47FB]/15 border-[#5B47FB]/30 text-[#5B47FB]",
      badge: "Faculty",
    },
    ADMIN: {
      label: "Admin Authority",
      icon: Shield,
      color: "bg-red-500/15 border-red-500/30 text-red-400",
      badge: "Super Admin",
    },
  }

  const current = roleConfig[currentRole] || roleConfig.STUDENT
  const CurrentIcon = current.icon

  return (
    <div className="relative select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${current.color}`}
        title="Switch Platform Role"
      >
        <CurrentIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0F172A] border border-gray-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-gray-800">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                Platform RBAC Role
              </span>
              <span className="text-xs text-gray-300">Test different authorization views</span>
            </div>

            <div className="p-1 space-y-1">
              {(["STUDENT", "TEACHER", "ADMIN"] as AppRole[]).map((role) => {
                const conf = roleConfig[role]
                const Icon = conf.icon
                const isSelected = currentRole === role

                return (
                  <button
                    key={role}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[#5B47FB] text-white font-bold"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{conf.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
