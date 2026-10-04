"use client"

import React, { createContext, useContext, useState, useEffect, useMemo } from "react"
import { Book, CartItem, SavedItem, Coupon, BookOrder } from "./types"
import { AVAILABLE_COUPONS } from "./data"

interface CartContextType {
  items: CartItem[]
  savedForLater: SavedItem[]
  appliedCoupon: Coupon | null
  couponDiscount: number
  orders: BookOrder[]
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  addToCart: (book: Book, qty?: number) => void
  removeFromCart: (bookId: string) => void
  updateQuantity: (bookId: string, qty: number) => void
  saveForLater: (bookId: string) => void
  moveToCart: (bookId: string) => void
  removeSaved: (bookId: string) => void
  applyCoupon: (code: string) => { success: boolean; message: string }
  removeCoupon: () => void
  clearCart: () => void
  placeOrder: (paymentMethod?: string) => BookOrder
  totalCount: number
  totalOriginalPrice: number
  totalPrice: number
  totalDiscount: number
  finalPayable: number
  totalSavings: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = "trillion_book_cart_items"
const SAVED_STORAGE_KEY = "trillion_book_saved_items"
const ORDERS_STORAGE_KEY = "trillion_book_orders_history"
const COUPON_STORAGE_KEY = "trillion_book_applied_coupon"

export function BookCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [savedForLater, setSavedForLater] = useState<SavedItem[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [orders, setOrders] = useState<BookOrder[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY)
      const storedSaved = localStorage.getItem(SAVED_STORAGE_KEY)
      const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY)
      const storedCoupon = localStorage.getItem(COUPON_STORAGE_KEY)

      if (storedCart) setItems(JSON.parse(storedCart))
      if (storedSaved) setSavedForLater(JSON.parse(storedSaved))
      if (storedOrders) setOrders(JSON.parse(storedOrders))
      if (storedCoupon) setAppliedCoupon(JSON.parse(storedCoupon))
    } catch (e) {
      console.error("Failed to hydrate book cart:", e)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // Sync to localStorage
  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (e) {}
  }, [items, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedForLater))
    } catch (e) {}
  }, [savedForLater, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
    } catch (e) {}
  }, [orders, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon))
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY)
      }
    } catch (e) {}
  }, [appliedCoupon, isHydrated])

  // Calculations
  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])

  const totalOriginalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.book.originalPrice * i.quantity, 0),
    [items]
  )

  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.book.price * i.quantity, 0),
    [items]
  )

  const totalDiscount = useMemo(
    () => Math.max(0, totalOriginalPrice - totalPrice),
    [totalOriginalPrice, totalPrice]
  )

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0
    if (totalPrice < appliedCoupon.minCartValue) return 0
    if (appliedCoupon.discountType === "PERCENT") {
      return Math.round((totalPrice * appliedCoupon.value) / 100)
    }
    return Math.min(totalPrice, appliedCoupon.value)
  }, [appliedCoupon, totalPrice])

  const finalPayable = useMemo(
    () => Math.max(0, totalPrice - couponDiscount),
    [totalPrice, couponDiscount]
  )

  const totalSavings = useMemo(
    () => totalDiscount + couponDiscount,
    [totalDiscount, couponDiscount]
  )

  // Actions
  const addToCart = (book: Book, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.bookId === book.id)
      if (existing) {
        return prev.map((i) =>
          i.bookId === book.id ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { bookId: book.id, book, quantity: qty, addedAt: new Date().toISOString() }]
    })
    // Also remove from savedForLater if it was there
    setSavedForLater((prev) => prev.filter((i) => i.bookId !== book.id))
  }

  const removeFromCart = (bookId: string) => {
    setItems((prev) => prev.filter((i) => i.bookId !== bookId))
  }

  const updateQuantity = (bookId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(bookId)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.bookId === bookId ? { ...i, quantity: qty } : i))
    )
  }

  const saveForLater = (bookId: string) => {
    const item = items.find((i) => i.bookId === bookId)
    if (!item) return
    setItems((prev) => prev.filter((i) => i.bookId !== bookId))
    setSavedForLater((prev) => {
      if (prev.some((s) => s.bookId === bookId)) return prev
      return [...prev, { bookId, book: item.book, savedAt: new Date().toISOString() }]
    })
  }

  const moveToCart = (bookId: string) => {
    const item = savedForLater.find((s) => s.bookId === bookId)
    if (!item) return
    setSavedForLater((prev) => prev.filter((s) => s.bookId !== bookId))
    addToCart(item.book, 1)
  }

  const removeSaved = (bookId: string) => {
    setSavedForLater((prev) => prev.filter((s) => s.bookId !== bookId))
  }

  const applyCoupon = (code: string) => {
    const trimmed = code.trim().toUpperCase()
    const found = AVAILABLE_COUPONS.find((c) => c.code.toUpperCase() === trimmed)
    if (!found) {
      return { success: false, message: `Coupon code "${code}" is invalid or expired.` }
    }
    if (totalPrice < found.minCartValue) {
      return {
        success: false,
        message: `Min order value for "${found.code}" is ₹${found.minCartValue}. Add ₹${found.minCartValue - totalPrice} more.`,
      }
    }
    setAppliedCoupon(found)
    return { success: true, message: `Coupon "${found.code}" applied! You saved ₹${found.discountType === "PERCENT" ? Math.round((totalPrice * found.value) / 100) : found.value}.` }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
  }

  const clearCart = () => {
    setItems([])
    setAppliedCoupon(null)
  }

  const placeOrder = (paymentMethod = "UPI / Instant NetBanking"): BookOrder => {
    const orderNumber = `AB-ORD-${Math.floor(100000 + Math.random() * 900000)}`
    const newOrder: BookOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      date: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: [...items],
      originalTotal: totalOriginalPrice,
      discountTotal: totalDiscount,
      couponDiscount,
      finalTotal: finalPayable,
      couponCode: appliedCoupon?.code,
      status: "COMPLETED",
      paymentMethod,
    }

    setOrders((prev) => [newOrder, ...prev])
    clearCart()

    // Sync to server store for Admin Online Bookstore view
    try {
      fetch("/api/books/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      }).catch(() => {})
    } catch (e) {}

    return newOrder
  }

  return (
    <CartContext.Provider
      value={{
        items,
        savedForLater,
        appliedCoupon,
        couponDiscount,
        orders,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        saveForLater,
        moveToCart,
        removeSaved,
        applyCoupon,
        removeCoupon,
        clearCart,
        placeOrder,
        totalCount,
        totalOriginalPrice,
        totalPrice,
        totalDiscount,
        finalPayable,
        totalSavings,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useBookCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useBookCart must be used within a BookCartProvider")
  }
  return context
}
