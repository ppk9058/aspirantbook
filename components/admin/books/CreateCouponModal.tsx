"use client"

import React, { useState } from "react"
import { Coupon } from "@/lib/books/types"
import { X, Tag, Plus, CheckCircle2, AlertCircle } from "lucide-react"

interface CreateCouponModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newCoupon: Coupon) => void
}

export default function CreateCouponModal({ isOpen, onClose, onSuccess }: CreateCouponModalProps) {
  const [code, setCode] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT")
  const [value, setValue] = useState(20)
  const [minCartValue, setMinCartValue] = useState(300)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!code.trim()) {
      setError("Coupon code is required.")
      return
    }

    if (value <= 0) {
      setError("Discount value must be greater than 0.")
      return
    }

    setLoading(true)
    try {
      const payload: Coupon = {
        code: code.trim().toUpperCase(),
        title: title.trim() || (discountType === "PERCENT" ? `${value}% OFF` : `₹${value} OFF`),
        description: description.trim() || `Save ${discountType === "PERCENT" ? `${value}%` : `₹${value}`} on orders above ₹${minCartValue}`,
        discountType,
        value: Number(value),
        minCartValue: Number(minCartValue),
      }

      const res = await fetch("/api/admin/books/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create coupon")
      }

      onSuccess(data.data)
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to create coupon")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in-50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-white">Create Bookstore Coupon</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Coupon Code (Uppercase)</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FESTIVE25"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-teal-500 text-sm font-black tracking-wider text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium"
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FLAT">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Discount Value {discountType === "PERCENT" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                required
                min={1}
                max={discountType === "PERCENT" ? 100 : 5000}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Cart Value (₹)</label>
            <input
              type="number"
              min={0}
              value={minCartValue}
              onChange={(e) => setMinCartValue(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Badge Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flat 25% Off Diwali Special"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 text-xs font-medium"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-teal-600/20"
            >
              {loading ? "Creating..." : "Save Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
