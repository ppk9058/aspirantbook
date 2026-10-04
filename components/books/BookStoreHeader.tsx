"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, PackageCheck, BookOpen, User } from "lucide-react"
import { useBookCart } from "@/lib/books/cartContext"
import { useSession } from "next-auth/react"

interface BookStoreHeaderProps {
  searchQuery?: string
  onSearchChange?: (val: string) => void
}

export default function BookStoreHeader({
  searchQuery = "",
  onSearchChange,
}: BookStoreHeaderProps) {
  const router = useRouter()
  const { totalCount, orders, setIsCartOpen } = useBookCart()
  const { data: session } = useSession()

  const userName = session?.user?.name || "Student"
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-gray-200/90 dark:border-slate-700 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand / Logo */}
        <Link
          href="/books"
          className="flex items-center gap-2.5 shrink-0 group focus:outline-none min-h-[44px]"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-600 dark:bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-amber-400 font-serif text-base">T</span>S
          </div>
          <div className="hidden xs:flex flex-col">
            <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Store
            </span>
          </div>
        </Link>

        {/* Wide Search Products Bar matching Image 1 */}
        <div className="flex-1 max-w-2xl relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search Products..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs min-h-[44px]"
            />
            <button
              type="button"
              className="absolute right-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>

        {/* Right Actions: My Orders, My Cart, Profile */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* My Orders Button */}
          <Link
            href="/books/orders"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-xs sm:text-sm font-bold relative group"
            title="View My Purchased eBooks & Orders"
          >
            <div className="relative">
              <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300 group-hover:text-sky-600 transition-colors" />
              {orders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-700 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
                  {orders.length}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">My Orders</span>
          </Link>

          {/* My Cart Button (User requirement: "My cart (instead of My bag)") */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all text-xs sm:text-sm font-bold relative group border border-transparent hover:border-sky-200"
            title="Open Flipkart-style My Cart"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300 group-hover:text-sky-600 transition-colors" />
              {totalCount > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-5 h-5 px-1 bg-sky-700 text-white rounded-full text-[11px] font-extrabold flex items-center justify-center animate-in zoom-in-75 shadow-xs">
                  {totalCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">My Cart</span>
          </button>

          {/* User Initial Avatar */}
          <Link
            href="/profile"
            className="w-8 h-8 sm:w-9 sm:h-9 min-h-[36px] min-w-[36px] rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-2xs hover:scale-105 transition-transform"
            title={userName}
          >
            {userInitial}
          </Link>
        </div>
      </div>
    </header>
  )
}
