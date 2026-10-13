"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useBookCart } from "./cartContext"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import { useRazorpayCheckout } from "@/lib/payments/useRazorpayCheckout"
import { Book, BookOrder } from "./types"
import { toast } from "sonner"

const PENDING_INTENT_KEY = "ts_pending_book_checkout"

export function useBookCheckout() {
  const { data: session } = useSession()
  const { items, appliedCoupon, clearCart, recordCompletedOrder } = useBookCart()
  const { openMobileAuth } = useMobileAuth()

  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [completedOrder, setCompletedOrder] = useState<BookOrder | null>(null)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [alreadyOwnedBook, setAlreadyOwnedBook] = useState<{ bookId: string; bookTitle: string } | null>(null)

  // Reader state for "Read Now" action
  const [activeReaderBook, setActiveReaderBook] = useState<{
    bookId: string
    title: string
    author?: string
  } | null>(null)

  // 1. Verify Payment Helper
  const verifyPayment = useCallback(
    async (
      paymentResponse: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      },
      orderId: string
    ) => {
      try {
        const verifyRes = await fetch("/api/books/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          }),
        })

        const verifyData = await verifyRes.json()

        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Payment signature verification failed")
        }

        const verifiedOrder: BookOrder = verifyData.order

        // Clear local storage cart
        clearCart()
        localStorage.removeItem(PENDING_INTENT_KEY)

        // Register order in context and display success modal
        if (recordCompletedOrder) {
          recordCompletedOrder(verifiedOrder)
        }
        setCompletedOrder(verifiedOrder)
        setIsSuccessModalOpen(true)
        toast.success("Payment verified! Your eBook is ready to read.")
      } catch (err: any) {
        console.error("Verification error:", err)
        setCheckoutError(err.message || "Failed to verify payment")
        toast.error(`Verification error: ${err.message || "Please contact support"}`)
      } finally {
        setIsCheckingOut(false)
      }
    },
    [clearCart, recordCompletedOrder]
  )

  const { openCheckout } = useRazorpayCheckout()

  // 2. Launch Razorpay window
  const launchRazorpay = useCallback(
    async (checkoutData: any) => {
      await openCheckout({
        key: checkoutData.keyId,
        amount: checkoutData.amountPaise,
        currency: checkoutData.currency || "INR",
        name: "TrillionSkill eBook Store",
        description: (checkoutData.bookNames || []).join(", ").slice(0, 250) || "eBook Purchase",
        order_id: checkoutData.razorpayOrderId,
        prefill: {
          name: checkoutData.user?.name || session?.user?.name || "",
          email: checkoutData.user?.email || session?.user?.email || "",
          contact: (session?.user as any)?.phone || "",
        },
        themeColor: "#1448d8",
        onSuccess: async (response) => {
          await verifyPayment(response, checkoutData.orderId)
        },
        onDismiss: () => {
          setIsCheckingOut(false)
          toast.info("Payment was cancelled. Your cart has been saved.")
        },
        onError: (desc) => {
          setIsCheckingOut(false)
          setCheckoutError(desc)
          toast.error(`Payment failed: ${desc}`)
        },
      })
    },
    [session, verifyPayment, openCheckout]
  )

  // 3. Initiate Checkout Handler
  const initiateCheckout = useCallback(
    async (singleBook?: Book) => {
      setCheckoutError(null)

      // Target items to purchase
      const targetItems = singleBook
        ? [{ bookId: singleBook.id, quantity: 1 }]
        : items.map((i) => ({ bookId: i.bookId, quantity: i.quantity }))

      if (targetItems.length === 0) {
        toast.error("Your cart is empty. Please add an eBook.")
        return
      }

      // If user is not logged in: Store pending checkout intent & open login modal
      if (!session?.user) {
        try {
          localStorage.setItem(
            PENDING_INTENT_KEY,
            JSON.stringify({
              items: targetItems,
              couponCode: appliedCoupon?.code,
              timestamp: Date.now(),
            })
          )
        } catch (e) {}

        openMobileAuth({
          actionType: "buy",
          callbackUrl: typeof window !== "undefined" ? window.location.pathname : "/books",
          onSuccess: () => {
            // Flow will resume automatically upon session hydration
          },
        })
        return
      }

      setIsCheckingOut(true)

      try {
        const createRes = await fetch("/api/books/checkout/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: targetItems,
            couponCode: appliedCoupon?.code,
          }),
        })

        const createData = await createRes.json()

        if (createRes.status === 409 && createData.error === "ALREADY_OWNED") {
          setIsCheckingOut(false)
          setAlreadyOwnedBook({
            bookId: createData.bookId,
            bookTitle: createData.bookTitle,
          })
          toast.info(createData.message || "You already own this eBook.")
          return
        }

        if (!createRes.ok || !createData.success) {
          throw new Error(createData.error || "Failed to initialize book order")
        }

        // Open Razorpay Checkout Window
        await launchRazorpay(createData)
      } catch (err: any) {
        setIsCheckingOut(false)
        setCheckoutError(err.message || "Checkout failed")
        toast.error(err.message || "Checkout failed")
      }
    },
    [session, items, appliedCoupon, openMobileAuth, launchRazorpay]
  )

  // 4. Auto-resume checkout intent after successful login
  useEffect(() => {
    if (!session?.user) return

    try {
      const savedIntent = localStorage.getItem(PENDING_INTENT_KEY)
      if (savedIntent) {
        const parsed = JSON.parse(savedIntent)
        // Only resume if intent is fresh (< 30 minutes)
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          localStorage.removeItem(PENDING_INTENT_KEY)
          // Initiate checkout with saved items
          setIsCheckingOut(true)
          fetch("/api/books/checkout/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: parsed.items,
              couponCode: parsed.couponCode,
            }),
          })
            .then(async (res) => {
              const data = await res.json()
              if (res.status === 409 && data.error === "ALREADY_OWNED") {
                setIsCheckingOut(false)
                setAlreadyOwnedBook({
                  bookId: data.bookId,
                  bookTitle: data.bookTitle,
                })
                toast.info(data.message)
                return
              }
              if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to initialize order")
              }
              await launchRazorpay(data)
            })
            .catch((err) => {
              setIsCheckingOut(false)
              setCheckoutError(err.message)
              toast.error(err.message)
            })
        } else {
          localStorage.removeItem(PENDING_INTENT_KEY)
        }
      }
    } catch (e) {}
  }, [session, launchRazorpay])

  return {
    initiateCheckout,
    isCheckingOut,
    checkoutError,
    completedOrder,
    isSuccessModalOpen,
    closeSuccessModal: () => setIsSuccessModalOpen(false),
    alreadyOwnedBook,
    clearAlreadyOwned: () => setAlreadyOwnedBook(null),
    activeReaderBook,
    openReaderForBook: (bookId: string, title: string, author?: string) =>
      setActiveReaderBook({ bookId, title, author }),
    closeReader: () => setActiveReaderBook(null),
  }
}
