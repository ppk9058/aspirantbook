"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
    Ticket,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Eye,
    Loader2,
    Sparkles,
    Calendar,
    Percent,
    Tag,
} from "lucide-react"
import { CoursePromoBadge } from "@/components/course/CoursePromoBadge"

interface CouponItem {
    id: string
    code: string
    courseId: string | null
    courseTitle: string
    coursePrice: number | null
    discountType: "PERCENT" | "FLAT" | string
    discountValue: number
    maxDiscountAmount: number | null
    maxRedemptions: number | null
    perUserLimit: number
    validFrom: string | null
    validUntil: string | null
    isActive: boolean
    offerAfterDemo: boolean
    showOnThumbnail: boolean
    badgeLabel: string | null
    badgeShape: string | null
    badgeColor: string | null
    redeemedCount: number
    createdAt: string
}

interface CourseCouponsManagerProps {
    courseId: string
    courseSlug: string
    courseTitle: string
    coursePrice: number
    thumbnailUrl?: string
}

const COLOR_PRESETS = [
    { label: "Emerald", hex: "#10B981" },
    { label: "Crimson", hex: "#EF4444" },
    { label: "Royal Purple", hex: "#8B5CF6" },
    { label: "Amber Gold", hex: "#F59E0B" },
    { label: "Sky Blue", hex: "#0EA5E9" },
    { label: "Rose Pink", hex: "#F43F5E" },
]

export function CourseCouponsManager({
    courseId,
    courseSlug,
    courseTitle,
    coursePrice,
    thumbnailUrl = "/placeholder-course.svg",
}: CourseCouponsManagerProps) {
    const [coupons, setCoupons] = useState<CouponItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editingCouponId, setEditingCouponId] = useState<string | null>(null)

    // Form fields
    const [code, setCode] = useState("")
    const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT")
    const [discountValue, setDiscountValue] = useState<number>(20)
    const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>("")
    const [maxRedemptions, setMaxRedemptions] = useState<string>("")
    const [perUserLimit, setPerUserLimit] = useState<number>(1)
    const [validFrom, setValidFrom] = useState<string>("")
    const [validUntil, setValidUntil] = useState<string>("")
    const [isActive, setIsActive] = useState<boolean>(true)
    const [offerAfterDemo, setOfferAfterDemo] = useState<boolean>(false)
    const [showOnThumbnail, setShowOnThumbnail] = useState<boolean>(false)
    const [badgeLabel, setBadgeLabel] = useState<string>("Special Offer")
    const [badgeShape, setBadgeShape] = useState<"STARBURST" | "RIBBON" | "CIRCLE" | "PILL">("PILL")
    const [badgeColor, setBadgeColor] = useState<string>("#10B981")

    const fetchCoupons = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/admin/coupons?courseId=${courseId}`)
            const json = await res.json()
            if (json.success && Array.isArray(json.coupons)) {
                setCoupons(json.coupons)
            }
        } catch (err) {
            console.error("Failed to load coupons:", err)
            toast.error("Failed to load coupons.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchCoupons()
    }, [courseId])

    const resetForm = () => {
        setIsEditing(false)
        setEditingCouponId(null)
        setCode("")
        setDiscountType("PERCENT")
        setDiscountValue(20)
        setMaxDiscountAmount("")
        setMaxRedemptions("")
        setPerUserLimit(1)
        setValidFrom("")
        setValidUntil("")
        setIsActive(true)
        setOfferAfterDemo(false)
        setShowOnThumbnail(false)
        setBadgeLabel("Special Offer")
        setBadgeShape("PILL")
        setBadgeColor("#10B981")
    }

    const handleEdit = (coupon: CouponItem) => {
        setIsEditing(true)
        setEditingCouponId(coupon.id)
        setCode(coupon.code)
        setDiscountType(coupon.discountType as any)
        setDiscountValue(coupon.discountValue)
        setMaxDiscountAmount(coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : "")
        setMaxRedemptions(coupon.maxRedemptions ? String(coupon.maxRedemptions) : "")
        setPerUserLimit(coupon.perUserLimit)
        setValidFrom(coupon.validFrom ? coupon.validFrom.slice(0, 16) : "")
        setValidUntil(coupon.validUntil ? coupon.validUntil.slice(0, 16) : "")
        setIsActive(coupon.isActive)
        setOfferAfterDemo(coupon.offerAfterDemo)
        setShowOnThumbnail(coupon.showOnThumbnail)
        setBadgeLabel(coupon.badgeLabel || "Special Offer")
        setBadgeShape((coupon.badgeShape as any) || "PILL")
        setBadgeColor(coupon.badgeColor || "#10B981")
    }

    // Live price calculation
    const numericPrice = coursePrice || 0
    let discountPaise = 0
    if (discountType === "PERCENT") {
        discountPaise = Math.floor((numericPrice * 100 * (discountValue || 0)) / 100)
        if (maxDiscountAmount) {
            discountPaise = Math.min(discountPaise, Math.round(Number(maxDiscountAmount) * 100))
        }
    } else {
        discountPaise = Math.round((discountValue || 0) * 100)
    }
    const computedFinalPaise = Math.max(0, Math.round(numericPrice * 100) - discountPaise)
    const isUnderOneRupee = numericPrice > 0 && computedFinalPaise < 100

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const payload: any = {
                code: code.trim().toUpperCase(),
                courseId,
                discountType,
                discountValue: Number(discountValue),
                maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
                maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
                perUserLimit: Number(perUserLimit) || 1,
                validFrom: validFrom ? new Date(validFrom).toISOString() : null,
                validUntil: validUntil ? new Date(validUntil).toISOString() : null,
                isActive,
                offerAfterDemo,
                showOnThumbnail,
                badgeLabel: showOnThumbnail ? badgeLabel.trim().slice(0, 24) : null,
                badgeShape: showOnThumbnail ? badgeShape : null,
                badgeColor: showOnThumbnail ? badgeColor : null,
            }

            const url = isEditing ? `/api/admin/coupons/${editingCouponId}` : "/api/admin/coupons"
            const method = isEditing ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const json = await res.json()

            if (!res.ok) {
                toast.error(json.error || "Failed to save coupon.")
                return
            }

            toast.success(isEditing ? "Coupon updated successfully!" : "Coupon created successfully!")
            resetForm()
            fetchCoupons()
        } catch (err: any) {
            console.error("Error saving coupon:", err)
            toast.error("Network error saving coupon.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeactivateOrDelete = async (coupon: CouponItem) => {
        const confirmMsg =
            coupon.redeemedCount > 0
                ? `Deactivate coupon ${coupon.code}? (It cannot be deleted because it has ${coupon.redeemedCount} redemptions).`
                : `Delete coupon ${coupon.code}?`

        if (!window.confirm(confirmMsg)) return

        try {
            const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" })
            const json = await res.json()
            if (res.ok) {
                toast.success(json.message || "Coupon updated.")
                fetchCoupons()
            } else {
                toast.error(json.error || "Failed to remove coupon.")
            }
        } catch (err) {
            toast.error("Failed to delete coupon.")
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Coupons & Promotions</h2>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Manage course discounts, demo completion vouchers, and visual thumbnail promotional badges.
                    </p>
                </div>
                {!isEditing && (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New Coupon</span>
                    </button>
                )}
            </div>

            {/* Create / Edit Form */}
            {isEditing && (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-emerald-200 shadow-md p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>{editingCouponId ? "Edit Coupon" : "Create New Coupon"}</span>
                        </h3>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Coupon Code */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Coupon Code *</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                                placeholder="e.g. DIWALI50"
                                maxLength={20}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <span className="text-[10px] text-gray-400">3-20 characters (A-Z, 0-9, _, -)</span>
                        </div>

                        {/* Discount Type */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Discount Type *</label>
                            <select
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            >
                                <option value="PERCENT">Percentage Discount (%)</option>
                                <option value="FLAT">Flat Rupee Discount (₹)</option>
                            </select>
                        </div>

                        {/* Discount Value */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">
                                {discountType === "PERCENT" ? "Discount Percentage (1-99%) *" : "Discount Amount (₹) *"}
                            </label>
                            <input
                                type="number"
                                min={discountType === "PERCENT" ? 1 : 1}
                                max={discountType === "PERCENT" ? 99 : coursePrice}
                                value={discountValue}
                                onChange={(e) => setDiscountValue(Number(e.target.value))}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        {/* Max Discount Cap (for percent) */}
                        {discountType === "PERCENT" && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">Max Discount Cap (₹ Optional)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={maxDiscountAmount}
                                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        )}

                        {/* Max Redemptions */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Max Total Redemptions (Optional)</label>
                            <input
                                type="number"
                                min={1}
                                value={maxRedemptions}
                                onChange={(e) => setMaxRedemptions(e.target.value)}
                                placeholder="Unlimited if empty"
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        {/* Per User Limit */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Per-User Limit</label>
                            <input
                                type="number"
                                min={1}
                                value={perUserLimit}
                                onChange={(e) => setPerUserLimit(Number(e.target.value))}
                                required
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        {/* Valid From / Valid Until */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Valid From</label>
                            <input
                                type="datetime-local"
                                value={validFrom}
                                onChange={(e) => setValidFrom(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Valid Until</label>
                            <input
                                type="datetime-local"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-gray-700">Coupon Active</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={offerAfterDemo}
                                onChange={(e) => setOfferAfterDemo(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-gray-700">Offer After Demo Class</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showOnThumbnail}
                                onChange={(e) => setShowOnThumbnail(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-gray-700">Show Badge on Course Thumbnail</span>
                        </label>
                    </div>

                    {/* Promo Badge Customizer & Live Preview */}
                    {showOnThumbnail && (
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-emerald-600" />
                                    <span>Thumbnail Promo Badge Design</span>
                                </h4>
                                <span className="text-[11px] text-slate-500">Live preview below</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                {/* Badge Label */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Badge Label * (Max 24 chars)</label>
                                    <input
                                        type="text"
                                        maxLength={24}
                                        value={badgeLabel}
                                        onChange={(e) => setBadgeLabel(e.target.value)}
                                        placeholder="e.g. Diwali Sale"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                {/* Badge Shape */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Badge Shape</label>
                                    <select
                                        value={badgeShape}
                                        onChange={(e) => setBadgeShape(e.target.value as any)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    >
                                        <option value="PILL">Pill Badge</option>
                                        <option value="STARBURST">Starburst Badge</option>
                                        <option value="RIBBON">Ribbon Corner</option>
                                        <option value="CIRCLE">Circle Badge</option>
                                    </select>
                                </div>

                                {/* Badge Color */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Color (Hex code)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={badgeColor}
                                            onChange={(e) => setBadgeColor(e.target.value.toUpperCase())}
                                            className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                                        />
                                        <input
                                            type="text"
                                            value={badgeColor}
                                            onChange={(e) => setBadgeColor(e.target.value.toUpperCase())}
                                            maxLength={7}
                                            className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-mono font-bold"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        {COLOR_PRESETS.map((p) => (
                                            <button
                                                key={p.hex}
                                                type="button"
                                                onClick={() => setBadgeColor(p.hex)}
                                                className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer"
                                                style={{ backgroundColor: p.hex }}
                                                title={p.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Live Badge Preview Card */}
                            <div className="pt-3 border-t border-slate-200">
                                <span className="text-[11px] font-bold text-slate-500 block mb-2">
                                    Live Thumbnail Preview on Course Card:
                                </span>
                                <div className="relative w-64 h-36 rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-slate-900 group">
                                    <img
                                        src={thumbnailUrl}
                                        alt={courseTitle}
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                                    {/* The Badge */}
                                    <div className="absolute top-2.5 left-2.5">
                                        <CoursePromoBadge
                                            badgeLabel={badgeLabel || "Promo"}
                                            badgeShape={badgeShape}
                                            badgeColor={badgeColor}
                                            discountType={discountType}
                                            discountValue={discountValue}
                                        />
                                    </div>

                                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                                        <p className="text-xs font-bold text-white truncate">{courseTitle}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs font-extrabold text-emerald-400">
                                                ₹{(computedFinalPaise / 100).toFixed(0)}
                                            </span>
                                            <span className="text-[10px] line-through text-gray-400">₹{numericPrice}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Price Calculation and Warnings */}
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div>
                            <span className="text-gray-500">Original Price: </span>
                            <span className="font-bold text-gray-900">₹{numericPrice}</span>
                            <span className="mx-2 text-gray-300">|</span>
                            <span className="text-gray-500">Computed Discount: </span>
                            <span className="font-bold text-emerald-600">
                                -₹{(discountPaise / 100).toFixed(2)}
                            </span>
                            <span className="mx-2 text-gray-300">|</span>
                            <span className="text-gray-500">Student Final Price: </span>
                            <span className="font-black text-gray-950 text-sm">
                                ₹{(computedFinalPaise / 100).toFixed(2)}
                            </span>
                        </div>
                        {isUnderOneRupee && (
                            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-bold">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Warning: Computed final price is under ₹1. Coupon will be rejected!</span>
                            </div>
                        )}
                    </div>

                    {/* Form Submit */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isUnderOneRupee}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>{isEditing && editingCouponId ? "Update Coupon" : "Create Coupon"}</span>
                        </button>
                    </div>
                </form>
            )}

            {/* Coupons Table List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Configured Coupons</h3>
                        <p className="text-xs text-gray-500">
                            {coupons.length} total coupons ({coupons.filter((c) => c.courseId === courseId).length} course-specific,{" "}
                            {coupons.filter((c) => !c.courseId).length} global)
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading coupons...</span>
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 space-y-2">
                        <Ticket className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="text-xs font-bold">No coupons configured for this course yet.</p>
                        <p className="text-[11px] text-gray-400">Click &ldquo;Create New Coupon&rdquo; above to add a promotional discount.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                                <tr>
                                    <th className="py-3 px-4 font-bold">Code</th>
                                    <th className="py-3 px-4 font-bold">Discount</th>
                                    <th className="py-3 px-4 font-bold">Scope</th>
                                    <th className="py-3 px-4 font-bold">Redeemed</th>
                                    <th className="py-3 px-4 font-bold">Badge</th>
                                    <th className="py-3 px-4 font-bold">Status</th>
                                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {coupons.map((c) => {
                                    const isGlobal = !c.courseId
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                                                        {c.code}
                                                    </span>
                                                    {c.offerAfterDemo && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            DEMO
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-emerald-700">
                                                {c.discountType === "FLAT" ? `₹${c.discountValue} OFF` : `${c.discountValue}% OFF`}
                                                {c.maxDiscountAmount && (
                                                    <span className="text-[10px] text-gray-400 font-normal block">
                                                        Cap: ₹{c.maxDiscountAmount}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        isGlobal
                                                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                            : "bg-blue-50 text-blue-700 border border-blue-200"
                                                    }`}
                                                >
                                                    {isGlobal ? "Global" : "This Course"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-bold text-gray-900">{c.redeemedCount}</span>
                                                {c.maxRedemptions && (
                                                    <span className="text-gray-400 text-[10px]"> / {c.maxRedemptions}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {c.showOnThumbnail ? (
                                                    <CoursePromoBadge
                                                        badgeLabel={c.badgeLabel || "Promo"}
                                                        badgeShape={c.badgeShape || "PILL"}
                                                        badgeColor={c.badgeColor || "#10B981"}
                                                        discountType={c.discountType}
                                                        discountValue={c.discountValue}
                                                    />
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        c.isActive
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : "bg-gray-100 text-gray-500 border border-gray-200"
                                                    }`}
                                                >
                                                    {c.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(c)}
                                                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                                                        title="Edit coupon"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeactivateOrDelete(c)}
                                                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                                        title={c.redeemedCount > 0 ? "Deactivate coupon" : "Delete coupon"}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
