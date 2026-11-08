"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BookStoreHeader from "@/components/books/BookStoreHeader"
import { BookCartProvider, useBookCart } from "@/lib/books/cartContext"
import { WishlistProvider } from "@/lib/books/wishlistContext"
import { useSession } from "next-auth/react"
import { useMobileAuth } from "@/components/auth/MobileAuthContext"
import {
  Plus,
  Minus,
  Trash2,
  Bookmark,
  ShieldCheck,
  Tag,
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  Zap,
  Lock,
} from "lucide-react"
import { useBookCheckout } from "@/lib/books/useBookCheckout"
import dynamic from "next/dynamic"
import Image from "next/image"

const PaymentSuccessModal = dynamic(() => import("@/components/books/PaymentSuccessModal"), { ssr: false })

function CartPageContent() {
  const router = useRouter()
  const { data: session } = useSession()
  const {
    items,
    savedForLater,
    appliedCoupon,
    couponDiscount,
    removeFromCart,
    updateQuantity,
    saveForLater,
    moveToCart,
    removeSaved,
    applyCoupon,
    removeCoupon,
    placeOrder,
    totalCount,
    totalOriginalPrice,
    totalPrice,
    totalDiscount,
    finalPayable,
    totalSavings,
  } = useBookCart()

  const [couponInput, setCouponInput] = useState("")
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const {
    initiateCheckout,
    isCheckingOut,
    completedOrder,
    isSuccessModalOpen,
    closeSuccessModal,
    alreadyOwnedBook,
    clearAlreadyOwned,
  } = useBookCheckout()

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = codeToApply || couponInput
    if (!code.trim()) return
    const res = applyCoupon(code)
    setCouponMessage({ text: res.message, isError: !res.success })
    if (res.success) setCouponInput("")
  }

  const handleCheckout = () => {
    if (items.length === 0) return
    initiateCheckout()
  }

  if (completedOrder) {
    return (
      <div className="min-h-screen bg-gray-50/50 pb-20">
        <BookStoreHeader />
        <div className="max-w-2xl mx-auto px-4 pt-16 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in-75">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Order Confirmed!</h1>
          <p className="text-sm text-gray-600">
            Thank you for purchasing! Your eBooks are now permanently added to your library with instant PDF download and interactive web reader access.
          </p>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold max-w-md mx-auto">
            ⚡ Instant Digital Delivery Active &bull; No physical shipment wait!
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/books/orders"
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-colors"
            >
              Go to My Orders &amp; Read Online
            </Link>
            <Link
              href="/books"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition-colors"
            >
              Browse More eBooks
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <BookStoreHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {items.length === 0 && savedForLater.length === 0 ? (
          <div className="max-w-md mx-auto py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your Cart is Empty</h2>
            <p className="text-xs text-gray-500">
              Browse our verified solved papers, Class 10th &amp; 12th board series, and BPSC/UPSC eBooks.
            </p>
            <Link
              href="/books"
              className="inline-block px-6 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 shadow-sm"
            >
              Explore eBook Store
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ======================================================== */}
            {/* LEFT COLUMN: Cart Items & Saved For Later */}
            {/* ======================================================== */}
            <div className="lg:col-span-8 space-y-6">
              {/* Cart Items Box */}
              <div className="bg-white border border-gray-200/90 rounded-2xl shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
                  <h1 className="text-base sm:text-lg font-black text-gray-900">
                    My Cart ({totalCount})
                  </h1>
                  <span className="text-xs text-emerald-600 font-bold">
                    ⚡ Instant Digital Delivery
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div
                      key={item.bookId}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5"
                    >
                      {/* Book Thumbnail */}
                      <Link
                        href={`/books/${item.book.slug}`}
                        className="w-20 h-28 sm:w-24 sm:h-32 shrink-0 bg-gray-50 rounded-xl p-1.5 border border-gray-200 flex items-center justify-center"
                      >
                        <Image
                          src={item.book.coverImage}
                          alt={item.book.title}
                          width={96}
                          height={128}
                          className="h-full w-full object-contain"
                        />
                      </Link>

                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <Link
                            href={`/books/${item.book.slug}`}
                            className="text-sm sm:text-base font-bold text-gray-900 hover:text-indigo-600 line-clamp-2 leading-snug"
                          >
                            {item.book.title}
                          </Link>
                          <span className="text-xs text-gray-500 block mt-1">
                            {item.book.edition} &bull; Seller: aspirantbook Official Store
                          </span>
                        </div>

                        {/* Price Row */}
                        <div className="flex items-baseline gap-2.5 pt-1">
                          <span className="text-lg font-black text-gray-900">
                            ₹{(item.book.price * item.quantity).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            ₹{(item.book.originalPrice * item.quantity).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-bold text-emerald-600">
                            {item.book.discountPercent}% Off
                          </span>
                        </div>

                        {/* Flipkart Actions Row: Stepper + Save for Later + Remove */}
                        <div className="flex items-center gap-4 pt-2 border-t border-gray-100 flex-wrap">
                          {/* Stepper */}
                          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-black font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-black px-2 text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-black font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => saveForLater(item.bookId)}
                            className="text-xs font-extrabold text-gray-700 hover:text-indigo-600 transition-colors"
                          >
                            SAVE FOR LATER
                          </button>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.bookId)}
                            className="text-xs font-extrabold text-rose-600 hover:text-rose-800 transition-colors"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Place Order Bar */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    disabled={isCheckingOut}
                    onClick={handleCheckout}
                    className="py-3 px-8 bg-[#fb641b] hover:bg-[#e85813] text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCheckingOut ? "Processing Payment..." : "PLACE ORDER"}
                  </button>
                </div>
              </div>

              {/* Saved For Later Section (Flipkart Signature Feature) */}
              {savedForLater.length > 0 && (
                <div className="bg-white border border-gray-200/90 rounded-2xl shadow-2xs overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-gray-200">
                    <h2 className="text-base font-black text-amber-900">
                      Saved For Later ({savedForLater.length})
                    </h2>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {savedForLater.map((saved) => (
                      <div
                        key={saved.bookId}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          <Image
                            src={saved.book.coverImage}
                            alt={saved.book.title}
                            width={48}
                            height={64}
                            className="h-16 w-12 rounded border bg-gray-50 object-contain p-1"
                          />
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1">
                              {saved.book.title}
                            </h3>
                            <span className="text-xs font-black text-gray-900 block mt-1">
                              ₹{saved.book.price}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveToCart(saved.bookId)}
                            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-2xs"
                          >
                            MOVE TO CART
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSaved(saved.bookId)}
                            className="text-xs font-bold text-rose-600 hover:underline"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: Coupons & Flipkart "PRICE DETAILS" */}
            {/* ======================================================== */}
            <div className="lg:col-span-4 space-y-6">
              {/* Coupons Card */}
              <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  COUPONS &amp; OFFERS
                </span>

                {appliedCoupon ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-emerald-900 block">
                        {appliedCoupon.code} Applied
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Saved ₹{couponDiscount}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="ENTER COUPON CODE"
                        className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        APPLY
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon("EBOOK20")}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                      >
                        EBOOK20 (20% OFF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon("FIRST50")}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                      >
                        FIRST50 (₹50 OFF)
                      </button>
                    </div>

                    {couponMessage && (
                      <p
                        className={`text-xs font-semibold ${
                          couponMessage.isError ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {couponMessage.text}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Flipkart Style "PRICE DETAILS" Box */}
              <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5 text-xs">
                <span className="font-black text-gray-500 uppercase tracking-wider block border-b border-gray-200 pb-2.5">
                  PRICE DETAILS
                </span>

                <div className="flex justify-between text-gray-700 text-sm">
                  <span>Price ({totalCount} items)</span>
                  <span>₹{totalOriginalPrice.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex justify-between text-emerald-600 font-semibold text-sm">
                  <span>Discount</span>
                  <span>- ₹{totalDiscount.toLocaleString("en-IN")}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold text-sm">
                    <span>Coupon Discount</span>
                    <span>- ₹{couponDiscount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-700 text-sm">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-600 font-bold">FREE (eBook Access)</span>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-3 flex justify-between text-base font-black text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-lg font-black text-sky-950">
                    ₹{finalPayable.toLocaleString("en-IN")}
                  </span>
                </div>

                {totalSavings > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
                    🎉 You will save ₹{totalSavings.toLocaleString("en-IN")} on this order
                  </div>
                )}

                <button
                  type="button"
                  disabled={isCheckingOut}
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-[#fb641b] hover:bg-[#e85813] text-white font-black text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2"
                >
                  {isCheckingOut ? "Processing Payment..." : "PLACE ORDER"}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 pt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Safe and Secure Digital Checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={closeSuccessModal}
        order={completedOrder}
        onReadNow={(bookId) => {
          closeSuccessModal()
          router.push(`/books/read/${encodeURIComponent(bookId)}`)
        }}
      />
    </div>
  )
}

export default function CartPage() {
  return (
    <BookCartProvider>
      {/* The store header reads the wishlist; without this provider the page
          threw "useWishlist must be used within a WishlistProvider" on render. */}
      <WishlistProvider>
        <CartPageContent />
      </WishlistProvider>
    </BookCartProvider>
  )
}
