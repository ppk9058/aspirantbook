"use client"

import Link from "next/link"
import Image from "next/image"
import { safeSignOut } from "@/lib/auth-client"
import {
    User,
    Settings,
    LogOut,
    LayoutDashboard,
    ChevronDown,
    Shield
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HomeUserDropdownProps {
    user: {
        id?: string
        name?: string | null
        email?: string | null
        image?: string | null
        role?: string | null
    }
}

export default function HomeUserDropdown({ user }: HomeUserDropdownProps) {
    const dashboardHref =
        user.role === "ADMIN"
            ? "/admin"
            : user.role === "TEACHER"
            ? "/teacher"
            : "/dashboard"

    const roleLabel =
        user.role === "ADMIN"
            ? "Admin"
            : user.role === "TEACHER"
            ? "Teacher"
            : "Student"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F26522]/30 transition-all cursor-pointer group"
                    aria-label="User menu"
                >
                    {user.image ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden relative flex-shrink-0">
                            <Image
                                src={user.image}
                                alt={user.name || "User"}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#05192D] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                            {user.name?.[0]?.toUpperCase() || "U"}
                        </div>
                    )}
                    <div className="hidden sm:flex flex-col text-left pr-1">
                        <span className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[120px]">
                            {user.name || "User"}
                        </span>
                        <span className="text-[10px] text-gray-500 capitalize leading-tight">
                            {roleLabel}
                        </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-transform duration-200" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border border-gray-100 bg-white">
                {/* User Info Header */}
                <DropdownMenuLabel className="p-2 font-normal">
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-gray-900 truncate">
                                {user.name || "User"}
                            </p>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-[#F26522] border border-orange-200">
                                {roleLabel}
                            </span>
                        </div>
                        {user.email && (
                            <p className="text-[11px] text-gray-500 truncate">
                                {user.email}
                            </p>
                        )}
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-1 bg-gray-100" />

                {/* Navigation Options */}
                <DropdownMenuItem asChild>
                    <Link
                        href="/profile"
                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                        <User className="h-4 w-4 text-gray-500" />
                        <span>My Profile</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href="/settings"
                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span>Settings</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        href={dashboardHref}
                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    >
                        <LayoutDashboard className="h-4 w-4 text-gray-500" />
                        <span>Dashboard</span>
                    </Link>
                </DropdownMenuItem>

                {user.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                        <Link
                            href="/admin"
                            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                        >
                            <Shield className="h-4 w-4 text-purple-600" />
                            <span>Admin Portal</span>
                        </Link>
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="my-1 bg-gray-100" />

                {/* Logout Option */}
                <DropdownMenuItem
                    onClick={() => safeSignOut("/")}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer transition-colors"
                >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
