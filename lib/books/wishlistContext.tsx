"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface WishlistContextType {
  wishlistIds: string[]
  isWishlisted: (bookId: string) => boolean
  toggleWishlist: (bookId: string) => void
  addToWishlist: (bookId: string) => void
  removeFromWishlist: (bookId: string) => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

const WISHLIST_STORAGE_KEY = "trillion_books_wishlist_ids"

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const { data: session } = useSession()

  // 1. Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY)
      if (stored) {
        setWishlistIds(JSON.parse(stored))
      }
    } catch (e) {
      console.error("Failed to hydrate wishlist:", e)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // 2. Sync with server if logged in
  useEffect(() => {
    if (!isHydrated) return

    if (session?.user?.id) {
      // Fetch server wishlist and merge
      fetch("/api/books/wishlist")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.bookIds)) {
            setWishlistIds((prev) => {
              const merged = Array.from(new Set([...prev, ...data.bookIds]))
              try {
                localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(merged))
              } catch {}
              // Also sync any local-only items up to server
              if (prev.length > 0) {
                fetch("/api/books/wishlist", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ bookIds: prev }),
                }).catch(() => {})
              }
              return merged
            })
          }
        })
        .catch(() => {})
    }
  }, [isHydrated, session?.user?.id])

  // 3. Persist to localStorage
  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds))
    } catch {}
  }, [wishlistIds, isHydrated])

  const isWishlisted = (bookId: string) => wishlistIds.includes(bookId)

  const addToWishlist = (bookId: string) => {
    setWishlistIds((prev) => {
      if (prev.includes(bookId)) return prev
      const next = [...prev, bookId]
      syncServer(bookId, "add")
      return next
    })
  }

  const removeFromWishlist = (bookId: string) => {
    setWishlistIds((prev) => {
      const next = prev.filter((id) => id !== bookId)
      syncServer(bookId, "remove")
      return next
    })
  }

  const toggleWishlist = (bookId: string) => {
    if (isWishlisted(bookId)) {
      removeFromWishlist(bookId)
    } else {
      addToWishlist(bookId)
    }
  }

  const syncServer = (bookId: string, action: "add" | "remove") => {
    if (session?.user?.id) {
      fetch("/api/books/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, action }),
      }).catch(() => {})
    }
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        isWishlisted,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}
