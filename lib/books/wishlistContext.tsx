"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  WISHLIST_STORAGE_KEY_PREFIX,
  getWishlistStorageKey,
  parseStoredList,
  writeStoredList,
} from "./storageKeys"

// Re-exported so existing importers keep working; the single implementation
// lives in ./storageKeys so it can be unit-tested without React.
export { WISHLIST_STORAGE_KEY_PREFIX, getWishlistStorageKey }

interface WishlistContextType {
  wishlistIds: string[]
  isWishlisted: (bookId: string) => boolean
  toggleWishlist: (bookId: string) => void
  addToWishlist: (bookId: string) => void
  removeFromWishlist: (bookId: string) => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const { data: session, status } = useSession()
  const userId = session?.user?.id
  const isLoggedIn = status === "authenticated" && Boolean(userId)

  // 1. Hydrate from localStorage strictly scoped to userId
  useEffect(() => {
    try {
      if (isLoggedIn && userId) {
        const userWishlistKey = getWishlistStorageKey(userId)
        const stored = localStorage.getItem(userWishlistKey)
        if (stored) {
          setWishlistIds(parseStoredList<string>(stored))
        } else {
          const legacy = localStorage.getItem(WISHLIST_STORAGE_KEY_PREFIX)
          if (legacy) {
            const parsed = parseStoredList<string>(legacy)
            if (parsed.length > 0) {
              setWishlistIds(parsed)
              localStorage.setItem(userWishlistKey, legacy)
            }
          }
        }
      } else {
        // Guests must see 0 wishlist items and no badges
        setWishlistIds([])
      }
    } catch (e) {
      console.error("Failed to hydrate wishlist:", e)
    } finally {
      setIsHydrated(true)
    }
  }, [isLoggedIn, userId])

  // 2. Sync with server if logged in
  useEffect(() => {
    if (!isHydrated) return

    if (isLoggedIn && userId) {
      // Fetch server wishlist and merge
      fetch("/api/books/wishlist")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.bookIds)) {
            setWishlistIds((prev) => {
              const merged = Array.from(new Set([...prev, ...data.bookIds]))
              writeStoredList(localStorage, getWishlistStorageKey(userId), merged)
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
  }, [isHydrated, isLoggedIn, userId])

  // 3. Persist to localStorage (scoped to logged-in user only)
  useEffect(() => {
    if (!isHydrated) return
    if (isLoggedIn && userId) {
      writeStoredList(localStorage, getWishlistStorageKey(userId), wishlistIds)
    }
  }, [wishlistIds, isHydrated, isLoggedIn, userId])

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
