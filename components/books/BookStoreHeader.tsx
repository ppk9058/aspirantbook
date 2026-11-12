"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Search, ShoppingCart, PackageCheck, Heart, Menu } from "lucide-react"
import { useBookCart } from "@/lib/books/cartContext"
import { useWishlist } from "@/lib/books/wishlistContext"
import { useSession } from "next-auth/react"
import ProfileDropdown from "@/components/layout/ProfileDropdown"
import BrandLogo from "@/components/brand/BrandLogo"
import MobileDrawer from "@/components/layout/MobileDrawer"

interface BookStoreHeaderProps {
  searchQuery?: string
  onSearchChange?: (val: string) => void
}

export default function BookStoreHeader({
  searchQuery = "",
  onSearchChange,
}: BookStoreHeaderProps) {
  const { totalCount, orders, setIsCartOpen } = useBookCart()
  const { wishlistIds } = useWishlist()
  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated" && Boolean(session?.user?.id)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // One search field, one wishlist entry, one cart button, one profile menu —
  // composed into a two-row phone header and the original single-row desktop
  // header. Nothing is duplicated, so the store keeps a single source of truth.
  const searchField = (
    <div className="relative flex-1 min-w-0 max-w-2xl">
      <div className="relative flex items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search Products..."
          aria-label="Search products in the bookstore"
          className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs min-h-[44px]"
        />
        <span className="absolute right-3 text-slate-400">
          <Search className="w-4 h-4" />
        </span>
      </div>
    </div>
  )

  const wishlistLink = (
    <Link
      href="/books/wishlist"
      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-xs sm:text-sm font-bold relative group"
      title="Saved Books & Wishlist"
      aria-label="Saved books and wishlist"
    >
      <div className="relative flex items-center">
        <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300 group-hover:text-rose-500 transition-colors" />
        {isLoggedIn && wishlistIds.length > 0 && (
          <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 min-w-4 text-[10px] font-black rounded-full bg-rose-600 text-white flex items-center justify-center leading-none shadow-xs">
            {wishlistIds.length}
          </span>
        )}
      </div>
      <span className="hidden sm:inline">Wishlist</span>
    </Link>
  )

  const ordersLink = (
    <Link
      href="/books/orders"
      className="hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-xs font-bold relative group"
      title="View My Purchased eBooks & Orders"
      aria-label="My purchased books and orders"
    >
      <div className="relative">
        <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300 group-hover:text-sky-600 transition-colors" />
        {isLoggedIn && orders.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-700 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center">
            {orders.length}
          </span>
        )}
      </div>
      <span>My Orders</span>
    </Link>
  )

  const cartButton = (
    <button
      type="button"
      data-testid="header-cart-btn"
      onClick={() => setIsCartOpen(true)}
      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 min-h-[44px] rounded-xl text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-all text-xs sm:text-sm font-bold relative group border border-transparent hover:border-sky-200"
      title="Open My Cart"
      aria-label="Open my cart"
    >
      <div className="relative">
        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 dark:text-slate-300 group-hover:text-sky-600 transition-colors" />
        {isLoggedIn && totalCount > 0 && (
          <span className="absolute -top-2 -right-2.5 min-w-5 h-5 px-1 bg-sky-700 text-white rounded-full text-[11px] font-extrabold flex items-center justify-center animate-in zoom-in-75 shadow-xs">
            {totalCount}
          </span>
        )}
      </div>
      <span className="hidden sm:inline">My Cart</span>
    </button>
  )

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-gray-200/90 dark:border-slate-700 shadow-2xs">
      {/* ── Phone / tablet header (<lg): two compact rows ─────────────────
          Row 1: hamburger + full wordmark + profile (same profile features as
          every other page). Row 2: the store search + wishlist + cart. */}
      <div className="lg:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              data-testid="books-header-hamburger"
              aria-label="Open navigation menu"
              className="-ml-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-gray-100 active:scale-95 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo
              size="sm"
              href="/books"
              wordmarkClassName="shrink-0 whitespace-nowrap"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* User Profile Dropdown (hideMyPurchase={true} because /books has My Orders) */}
            <ProfileDropdown hideMyPurchase={true} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 pb-2.5">
          {searchField}
          {wishlistLink}
          {cartButton}
        </div>
      </div>

      {/* ── Desktop header (lg+): the original single row, unchanged ────── */}
      <div className="hidden lg:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 items-center justify-between gap-6">
        {/* Brand / Logo: desktop uses the sidebar BrandLogo */}
        <div className="flex items-center shrink-0 lg:hidden">
          <BrandLogo size="md" href="/books" />
        </div>

        {searchField}

        <div className="flex items-center gap-4 shrink-0">
          {wishlistLink}
          {ordersLink}
          {cartButton}
          <ProfileDropdown hideMyPurchase={true} />
        </div>
      </div>

      {mounted && isDrawerOpen && typeof document !== "undefined"
        ? createPortal(
            <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />,
            document.body
          )
        : null}
    </header>
  )
}
