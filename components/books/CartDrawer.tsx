"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useBookCart } from "@/lib/books/cartContext"
import { useSession } from "next-auth/react"
import { useBookCheckout } from "@/lib/books/useBookCheckout"
import dynamic from "next/dynamic"

const PaymentSuccessModal = dynamic(() => import("./PaymentSuccessModal"), { ssr: false })
import {
  X,
  Plus,
  Minus,
  Trash2,
  Bookmark,
  ArrowRight,
  ShieldCheck,
  Tag,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  BookOpen,
} from "lucide-react"
import Image from "next/image"

export default function CartDrawer() {
  const { data: session } = useSession()
  const {
    items,
    savedForLater,
    appliedCoupon,
    couponDiscount,
    isCartOpen,
    setIsCartOpen,
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
    isOwned,
  } = useBookCart()

  const [couponInput, setCouponInput] = useState("")
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const router = useRouter()
  const {
    initiateCheckout,
    isCheckingOut,
    completedOrder,
    isSuccessModalOpen,
    closeSuccessModal,
    alreadyOwnedBook,
    clearAlreadyOwned,
  } = useBookCheckout()

  if (!isCartOpen && !isSuccessModalOpen) return null

  // "Already Owned" is driven by the SAME server-derived ownership list that
  // gates the storefront, falling back to the checkout 409 payload.
  const ownedCartItem = items.find((item) => isOwned(item.bookId)) || null
  const ownedNotice = alreadyOwnedBook
    ? { bookId: alreadyOwnedBook.bookId, bookTitle: alreadyOwnedBook.bookTitle }
    : ownedCartItem
    ? { bookId: ownedCartItem.bookId, bookTitle: ownedCartItem.book.title }
    : null

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = codeToApply || couponInput
    if (!code.trim()) return
    const res = applyCoupon(code)
    setCouponMessage({ text: res.message, isError: !res.success })
    if (res.success) setCouponInput("")
  }

  const handlePlaceOrder = () => {
    if (items.length === 0) return
    initiateCheckout()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {isCartOpen && (
        <div className="pointer-events-auto">
          {/* Backdrop */}
          <div
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity duration-200"
          />

          {/* Slide-over Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 z-50">
            <div data-testid="cart-drawer-panel" className="w-screen max-w-xl bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900">
                My Cart
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-800">
                {totalCount} {totalCount === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <Link
                  href="/books/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 mr-2"
                >
                  <span>Full View</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Contents */}
          {items.length === 0 && savedForLater.length === 0 ? (
            /* Empty Cart View */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Your Cart is Empty</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Explore our curated collection of Class 10th, 12th, BPSC, and UPSC solved papers and eBooks.
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors shadow-sm"
              >
                Browse eBook Store
              </button>
            </div>
          ) : (
            /* Cart Content List */
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-4 space-y-4">
              {/* Active Cart Items */}
              {items.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-black text-gray-400 tracking-wider uppercase">
                    Cart Items ({items.length})
                  </span>

                  {items.map((item) => (
                    <div
                      key={item.bookId}
                      className="p-3.5 bg-gray-50/70 border border-gray-200/90 rounded-2xl flex gap-3 sm:gap-4 transition-all"
                    >
                      {/* Thumbnail */}
                      <Link
                        href={`/books/${item.book.slug}`}
                        onClick={() => setIsCartOpen(false)}
                        className="w-16 h-22 sm:w-20 sm:h-26 shrink-0 bg-white rounded-lg p-1 border border-gray-200 flex items-center justify-center overflow-hidden"
                      >
                        <Image
                          src={item.book.coverImage}
                          alt={item.book.title}
                          width={64}
                          height={88}
                          className="h-full w-full object-contain"
                        />
                      </Link>

                      {/* Info & Controls */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <Link
                            href={`/books/${item.book.slug}`}
                            onClick={() => setIsCartOpen(false)}
                            className="text-xs sm:text-sm font-bold text-gray-900 hover:text-indigo-600 line-clamp-2 leading-snug"
                          >
                            {item.book.title}
                          </Link>
                          <span className="text-[11px] text-gray-500 block mt-0.5">
                            {item.book.edition} &bull; eBook PDF
                          </span>
                        </div>

                        {/* Pricing */}
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-sm sm:text-base font-black text-gray-900">
                            ₹{(item.book.price * item.quantity).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            ₹{(item.book.originalPrice * item.quantity).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-bold text-emerald-600">
                            {item.book.discountPercent}% Off
                          </span>
                        </div>

                        {/* Stepper & Actions (Flipkart style) */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-200/80">
                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2 py-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-black font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black px-1.5 text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-black font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Save For Later & Remove */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => saveForLater(item.bookId)}
                              className="text-[11px] font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                              SAVE FOR LATER
                            </button>
                            <span className="text-gray-300">&bull;</span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.bookId)}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors"
                            >
                              REMOVE
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Saved For Later Section (Flipkart Signature Feature) */}
              {savedForLater.length > 0 && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-700 uppercase tracking-wider">
                      Saved For Later ({savedForLater.length})
                    </span>
                  </div>

                  {savedForLater.map((saved) => (
                    <div
                      key={saved.bookId}
                      className="p-3 bg-amber-50/40 border border-amber-200/80 rounded-xl flex gap-3 items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Image
                          src={saved.book.coverImage}
                          alt={saved.book.title}
                          width={40}
                          height={56}
                          className="h-14 w-10 shrink-0 rounded border bg-white object-contain p-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {saved.book.title}
                          </p>
                          <span className="text-xs font-black text-gray-900 block mt-0.5">
                            ₹{saved.book.price}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveToCart(saved.bookId)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition-colors"
                        >
                          MOVE TO CART
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSaved(saved.bookId)}
                          className="p-1 text-gray-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Coupons & Promo Codes Section */}
              {items.length > 0 && (
                <div className="pt-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Apply Coupon Code</span>
                  </div>

                  {appliedCoupon ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="text-xs font-black text-emerald-900">
                            {appliedCoupon.code} Applied!
                          </span>
                          <span className="text-[11px] text-emerald-700 block">
                            You saved ₹{couponDiscount}
                          </span>
                        </div>
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
                          placeholder="e.g. EBOOK20, FIRST50"
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

                      {/* Quick Coupon Suggestions */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-gray-400">Available:</span>
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
              )}

              {/* Flipkart Style "PRICE DETAILS" Box */}
              {items.length > 0 && (
                <div className="pt-4">
                  <div className="bg-gray-50 border border-gray-200/90 rounded-2xl p-4 space-y-2.5 text-xs">
                    <span className="font-black text-gray-500 uppercase tracking-wider block border-b border-gray-200 pb-2">
                      PRICE DETAILS
                    </span>

                    <div className="flex justify-between text-gray-600">
                      <span>Price ({totalCount} items)</span>
                      <span>₹{totalOriginalPrice.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount</span>
                      <span>- ₹{totalDiscount.toLocaleString("en-IN")}</span>
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Coupon ({appliedCoupon?.code})</span>
                        <span>- ₹{couponDiscount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Charges</span>
                      <span className="text-emerald-600 font-bold">FREE (eBook Download)</span>
                    </div>

                    <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between text-sm font-black text-gray-900">
                      <span>Total Amount</span>
                      <span className="text-base font-extrabold text-sky-950">
                        ₹{finalPayable.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {totalSavings > 0 && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center">
                        🎉 You will save ₹{totalSavings.toLocaleString("en-IN")} on this order
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Already Owned Alert Banner */}
          {ownedNotice && (
            <div className="mx-5 mb-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
              <div className="min-w-0">
                <p className="font-extrabold truncate">Already Owned</p>
                <p className="text-[11px] text-amber-700 truncate">
                  You already own &quot;{ownedNotice.bookTitle}&quot;.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    clearAlreadyOwned()
                    setIsCartOpen(false)
                    router.push(`/books/read/${encodeURIComponent(ownedNotice.bookId)}`)
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] transition-colors"
                >
                  Read Now
                </button>
                <button
                  type="button"
                  onClick={clearAlreadyOwned}
                  className="p-1 text-amber-500 hover:text-amber-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Drawer Footer with Sticky Checkout Bar */}
          {items.length > 0 && (
            <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-4 shadow-lg">
              <div>
                <span className="text-[11px] text-gray-400 block font-semibold">Total Payable</span>
                <span className="text-lg font-black text-gray-900">
                  ₹{finalPayable.toLocaleString("en-IN")}
                </span>
              </div>

              <button
                type="button"
                data-testid="cart-drawer-checkout-btn"
                disabled={isCheckingOut}
                onClick={handlePlaceOrder}
                className="flex-1 py-3 px-6 bg-[#fb641b] hover:bg-[#e85813] text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>PLACE ORDER</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={closeSuccessModal}
        order={completedOrder}
        onReadNow={(bookId) => {
          setIsCartOpen(false)
          closeSuccessModal()
          router.push(`/books/read/${encodeURIComponent(bookId)}`)
        }}
      />
    </div>
  )
}
