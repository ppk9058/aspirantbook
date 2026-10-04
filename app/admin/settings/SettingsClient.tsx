"use client"

import React, { useState, useTransition } from "react"
import {
    updatePlatformSettings,
    resetPlatformSettings,
    purgeSystemCache
} from "@/lib/actions/admin/settings"
import { PlatformSettings } from "@/types/platform-settings"
import { Button } from "@/components/ui/button"
import {
    Settings,
    Globe,
    BookOpen,
    CreditCard,
    Video,
    Cpu,
    Shield,
    CheckCircle2,
    AlertTriangle,
    Save,
    RotateCcw,
    Sparkles,
    Trash2,
    Download,
    ExternalLink,
    Loader2,
    Server,
    Database,
    Zap,
    Bell,
    Check
} from "lucide-react"

interface SettingsClientProps {
    initialSettings: PlatformSettings
    diagnostics: {
        dbStatus: string
        dbLatencyMs: number
        s3Configured: boolean
        geminiConfigured: boolean
        stripeConfigured: boolean
        razorpayConfigured: boolean
        nodeEnv: string
        nextVersion: string
        timestamp: string
    }
    isAdmin: boolean
}

type TabKey = "general" | "courses" | "pricing" | "classroom" | "integrations"

export function SettingsClient({ initialSettings, diagnostics, isAdmin }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("general")
    const [settings, setSettings] = useState<PlatformSettings>(initialSettings)
    const [isPending, startTransition] = useTransition()
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [isPurging, setIsPurging] = useState(false)

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text })
        setTimeout(() => setToastMessage(null), 4000)
    }

    const handleSave = () => {
        startTransition(async () => {
            const res = await updatePlatformSettings(settings)
            if (res.success && res.settings) {
                setSettings(res.settings)
                showToast("success", "Platform settings successfully updated and saved!")
            } else {
                showToast("error", res.error || "Failed to save settings")
            }
        })
    }

    const handleReset = async () => {
        if (!confirm("Are you sure you want to restore all platform settings to system defaults?")) return
        startTransition(async () => {
            const res = await resetPlatformSettings()
            if (res.success && res.settings) {
                setSettings(res.settings)
                showToast("success", "All settings reset to default configurations.")
            } else {
                showToast("error", res.error || "Failed to reset settings")
            }
        })
    }

    const handlePurgeCache = async () => {
        setIsPurging(true)
        try {
            const res = await purgeSystemCache()
            if (res.success) {
                showToast("success", "Application cache purged and routes revalidated.")
            } else {
                showToast("error", res.error || "Failed to purge cache")
            }
        } finally {
            setIsPurging(false)
        }
    }

    const handleExportConfig = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2))
        const downloadAnchor = document.createElement("a")
        downloadAnchor.setAttribute("href", dataStr)
        downloadAnchor.setAttribute("download", `aspirantbook-settings-${new Date().toISOString().split("T")[0]}.json`)
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        downloadAnchor.remove()
        showToast("success", "Settings exported as JSON backup.")
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b-2 border-[#10162F] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-[#10162F] text-white flex items-center gap-1.5">
                            <Settings className="h-3 w-3" />
                            System Administration
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFD15C] text-black border border-[#10162F]">
                            Platform Configuration
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#10162F] tracking-tight">
                        Platform Settings
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Configure platform defaults, course rules, live classroom controls, monetization, and system integrations.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePurgeCache}
                        disabled={isPurging}
                        className="border-2 border-[#10162F] font-bold text-xs shadow-[2px_2px_0px_#10162F] hover:bg-gray-100 flex items-center gap-1.5"
                    >
                        {isPurging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-600" />}
                        <span>Purge Cache</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportConfig}
                        className="border-2 border-[#10162F] font-bold text-xs shadow-[2px_2px_0px_#10162F] hover:bg-gray-100 flex items-center gap-1.5"
                    >
                        <Download className="h-3.5 w-3.5 text-[#3A10E5]" />
                        <span>Export JSON</span>
                    </Button>
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div
                    className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                        toastMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-[3px_3px_0px_#065f46]"
                            : "bg-rose-50 border-rose-600 text-rose-900 shadow-[3px_3px_0px_#9f1239]"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-bold">{toastMessage.text}</span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b-2 border-[#10162F] pb-3">
                {[
                    { key: "general", label: "General & Branding", icon: Globe },
                    { key: "courses", label: "Courses & Curriculum", icon: BookOpen },
                    { key: "pricing", label: "Pricing & Payments", icon: CreditCard },
                    { key: "classroom", label: "Live Classroom", icon: Video },
                    { key: "integrations", label: "Integrations & Health", icon: Server },
                ].map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.key
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key as TabKey)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 border-[#10162F] transition-all ${
                                isActive
                                    ? "bg-[#3A10E5] text-white shadow-[3px_3px_0px_#10162F] translate-x-[-1px] translate-y-[-1px]"
                                    : "bg-white text-[#10162F] hover:bg-[#FFF5EB] shadow-[1px_1px_0px_#10162F]"
                            }`}
                        >
                            <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#3A10E5]"}`} />
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* TAB CONTENT */}

            {/* 1. GENERAL & BRANDING */}
            {activeTab === "general" && (
                <div className="space-y-6">
                    {/* Platform Identity Card */}
                    <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[4px_4px_0px_0px_#10162F] space-y-5">
                        <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                            <Globe className="h-5 w-5 text-[#3A10E5]" />
                            <h2 className="text-lg font-extrabold text-[#10162F]">Platform Identity & Contact</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                    Platform Brand Name *
                                </label>
                                <input
                                    type="text"
                                    value={settings.platformName}
                                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                    Support Email *
                                </label>
                                <input
                                    type="email"
                                    value={settings.supportEmail}
                                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                    Support Phone / WhatsApp
                                </label>
                                <input
                                    type="text"
                                    value={settings.supportPhone}
                                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                    Default Timezone
                                </label>
                                <select
                                    value={settings.timezone}
                                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                                >
                                    <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST - UTC+05:30)</option>
                                    <option value="America/New_York (EST)">America/New_York (EST - UTC-05:00)</option>
                                    <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST - UTC-08:00)</option>
                                    <option value="Europe/London (GMT)">Europe/London (GMT - UTC+00:00)</option>
                                    <option value="Asia/Singapore (SGT)">Asia/Singapore (SGT - UTC+08:00)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Platform Slogan & Tagline
                            </label>
                            <textarea
                                rows={2}
                                value={settings.tagline}
                                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3A10E5] bg-[#FFFDF9]"
                            />
                        </div>
                    </div>

                    {/* Announcement Banner Card */}
                    <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[4px_4px_0px_0px_#10162F] space-y-5">
                        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-amber-500" />
                                <h2 className="text-lg font-extrabold text-[#10162F]">Global Announcement Banner</h2>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.announcement.enabled}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            announcement: { ...settings.announcement, enabled: e.target.checked },
                                        })
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3A10E5]"></div>
                                <span className="ml-2 text-xs font-bold text-[#10162F]">
                                    {settings.announcement.enabled ? "Active" : "Disabled"}
                                </span>
                            </label>
                        </div>

                        {settings.announcement.enabled && (
                            <div className="p-3 bg-[#FFF5EB] rounded-xl border-2 border-[#10162F] space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#FFD15C] text-black rounded border border-[#10162F]">
                                        Live Preview
                                    </span>
                                    <span className="text-xs text-gray-500 font-semibold">How users see this banner</span>
                                </div>
                                <div className="p-3 bg-[#10162F] text-white rounded-lg flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FFD15C] text-black">
                                            {settings.announcement.badge || "ANNOUNCEMENT"}
                                        </span>
                                        <span>{settings.announcement.text}</span>
                                    </div>
                                    <span className="text-[#FFD15C] font-bold underline flex items-center gap-1 cursor-pointer">
                                        View Details <ExternalLink className="h-3 w-3" />
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                    Badge Text
                                </label>
                                <input
                                    type="text"
                                    value={settings.announcement.badge}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            announcement: { ...settings.announcement, badge: e.target.value },
                                        })
                                    }
                                    placeholder="NEW RELEASE, SALE, etc."
                                    className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                    Announcement Message
                                </label>
                                <input
                                    type="text"
                                    value={settings.announcement.text}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            announcement: { ...settings.announcement, text: e.target.value },
                                        })
                                    }
                                    className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Maintenance Mode Card */}
                    <div className="bg-[#FFF5EB] rounded-2xl border-2 border-[#10162F] p-6 shadow-[4px_4px_0px_0px_#10162F] flex items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 font-extrabold text-sm text-[#10162F] uppercase">
                                <Shield className="h-4 w-4 text-rose-600" />
                                Maintenance Mode
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                                When enabled, only administrators can access the site. Public visitors see a maintenance notice.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.maintenanceMode}
                                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                        </label>
                    </div>
                </div>
            )}

            {/* 2. COURSES & CURRICULUM */}
            {activeTab === "courses" && (
                <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[4px_4px_0px_0px_#10162F] space-y-6">
                    <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                        <BookOpen className="h-5 w-5 text-[#3A10E5]" />
                        <h2 className="text-lg font-extrabold text-[#10162F]">Curriculum & Grading Rules</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Default Passing Grade (%) *
                            </label>
                            <input
                                type="number"
                                min="50"
                                max="100"
                                value={settings.passingGradePercent}
                                onChange={(e) =>
                                    setSettings({ ...settings, passingGradePercent: parseInt(e.target.value) || 75 })
                                }
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">Minimum assessment score required to mark a lesson completed</p>
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Max Video Upload Size (MB) *
                            </label>
                            <input
                                type="number"
                                min="50"
                                max="2000"
                                value={settings.maxVideoUploadMb}
                                onChange={(e) =>
                                    setSettings({ ...settings, maxVideoUploadMb: parseInt(e.target.value) || 500 })
                                }
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">Maximum allowed video upload per lesson module</p>
                        </div>
                    </div>

                    {/* Switches */}
                    <div className="space-y-4 pt-4 border-t-2 border-gray-100">
                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-[#FFFDF9]">
                            <div>
                                <div className="text-xs font-extrabold text-[#10162F] uppercase">
                                    Allow Free Previews on Paid Courses
                                </div>
                                <div className="text-xs text-gray-500">
                                    Allow students to watch chapter 1 or intro lessons without an active subscription
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.allowFreePreview}
                                onChange={(e) => setSettings({ ...settings, allowFreePreview: e.target.checked })}
                                className="h-5 w-5 rounded border-2 border-black accent-[#3A10E5] cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-[#FFFDF9]">
                            <div>
                                <div className="text-xs font-extrabold text-[#10162F] uppercase">
                                    Auto-Issue Certificates of Completion
                                </div>
                                <div className="text-xs text-gray-500">
                                    Instantly generate shareable PDF credentials when a student hits 100% completion
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.autoIssueCertificates}
                                onChange={(e) => setSettings({ ...settings, autoIssueCertificates: e.target.checked })}
                                className="h-5 w-5 rounded border-2 border-black accent-[#3A10E5] cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-[#FFFDF9]">
                            <div>
                                <div className="text-xs font-extrabold text-[#10162F] uppercase flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-[#3A10E5]" />
                                    AI Coding Tutor Assistance
                                </div>
                                <div className="text-xs text-gray-500">
                                    Enable guided AI hints, bug explanation, and syntax checks in the student code editor
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.aiTutorEnabled}
                                onChange={(e) => setSettings({ ...settings, aiTutorEnabled: e.target.checked })}
                                className="h-5 w-5 rounded border-2 border-black accent-[#3A10E5] cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. PRICING & MONETIZATION */}
            {activeTab === "pricing" && (
                <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[4px_4px_0px_0px_#10162F] space-y-6">
                    <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                        <CreditCard className="h-5 w-5 text-[#3A10E5]" />
                        <h2 className="text-lg font-extrabold text-[#10162F]">Subscription Pricing & Gateways</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Default Currency
                            </label>
                            <select
                                value={settings.currency}
                                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            >
                                <option value="USD ($)">USD ($) - US Dollars</option>
                                <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                                <option value="EUR (€)">EUR (€) - Euros</option>
                                <option value="GBP (£)">GBP (£) - British Pounds</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Pro Monthly Plan ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={settings.proMonthlyPrice}
                                onChange={(e) =>
                                    setSettings({ ...settings, proMonthlyPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Pro Annual Plan ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={settings.proYearlyPrice}
                                onChange={(e) =>
                                    setSettings({ ...settings, proYearlyPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FFF8F0] border-2 border-[#10162F] space-y-4">
                        <div className="text-xs font-extrabold text-[#10162F] uppercase">
                            Payment Gateway Environment
                        </div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-[#10162F] cursor-pointer">
                                <input
                                    type="radio"
                                    name="gatewayMode"
                                    value="sandbox"
                                    checked={settings.paymentGatewayMode === "sandbox"}
                                    onChange={() => setSettings({ ...settings, paymentGatewayMode: "sandbox" })}
                                    className="accent-[#3A10E5]"
                                />
                                <span>Sandbox / Test Mode</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-[#10162F] cursor-pointer">
                                <input
                                    type="radio"
                                    name="gatewayMode"
                                    value="live"
                                    checked={settings.paymentGatewayMode === "live"}
                                    onChange={() => setSettings({ ...settings, paymentGatewayMode: "live" })}
                                    className="accent-[#3A10E5]"
                                />
                                <span>Live Production Mode</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-[#FFFDF9]">
                            <div>
                                <div className="text-xs font-bold text-[#10162F] uppercase">Stripe Checkout</div>
                                <div className="text-[11px] text-gray-500">Credit cards, Apple Pay, Google Pay</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.stripeEnabled}
                                onChange={(e) => setSettings({ ...settings, stripeEnabled: e.target.checked })}
                                className="h-5 w-5 rounded border-2 border-black accent-[#3A10E5] cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-[#FFFDF9]">
                            <div>
                                <div className="text-xs font-bold text-[#10162F] uppercase">Razorpay Checkout</div>
                                <div className="text-[11px] text-gray-500">UPI, NetBanking, Cards for India & Global</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.razorpayEnabled}
                                onChange={(e) => setSettings({ ...settings, razorpayEnabled: e.target.checked })}
                                className="h-5 w-5 rounded border-2 border-black accent-[#3A10E5] cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 4. LIVE CLASSROOM */}
            {activeTab === "classroom" && (
                <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[4px_4px_0px_0px_#10162F] space-y-6">
                    <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                        <Video className="h-5 w-5 text-[#3A10E5]" />
                        <h2 className="text-lg font-extrabold text-[#10162F]">Live Streaming & Classroom Controls</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Default Resolution
                            </label>
                            <select
                                value={settings.defaultClassResolution}
                                onChange={(e) => setSettings({ ...settings, defaultClassResolution: e.target.value })}
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            >
                                <option value="720p">720p HD (Low bandwidth)</option>
                                <option value="1080p">1080p Full HD (Recommended)</option>
                                <option value="1440p">1440p 2K (Ultra crisp)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Max Class Participants
                            </label>
                            <input
                                type="number"
                                min="10"
                                max="1000"
                                value={settings.maxClassParticipants}
                                onChange={(e) =>
                                    setSettings({ ...settings, maxClassParticipants: parseInt(e.target.value) || 100 })
                                }
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold text-[#10162F] uppercase mb-1.5">
                                Recording Retention (Days)
                            </label>
                            <input
                                type="number"
                                min="7"
                                max="365"
                                value={settings.recordingRetentionDays}
                                onChange={(e) =>
                                    setSettings({ ...settings, recordingRetentionDays: parseInt(e.target.value) || 60 })
                                }
                                className="w-full px-3.5 py-2.5 border-2 border-[#10162F] rounded-xl text-sm font-semibold bg-[#FFFDF9]"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t-2 border-gray-100">
                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-[#FFFDF9]">
                            <div>
                                <div className="text-xs font-extrabold text-[#10162F] uppercase">
                                    Interactive Whiteboard by Default
                                </div>
                                <div className="text-xs text-gray-500">
                                    Automatically initialize the drawing canvas when teacher starts a session
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.defaultWhiteboardEnabled}
                                onChange={(e) => setSettings({ ...settings, defaultWhiteboardEnabled: e.target.checked })}
                                className="h-5 w-5 rounded border-2 border-black accent-[#3A10E5] cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 bg-[#FFFDF9]">
                            <div>
                                <div className="text-xs font-extrabold text-[#10162F] uppercase">
                                    Real-time Chat & Q&A Moderation
                                </div>
                                <div className="text-xs text-gray-500">
                                    Allow teachers to mute participants and approve questions before posting
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.chatModerationEnabled}
                                onChange={(e) => setSettings({ ...settings, chatModerationEnabled: e.target.checked })}
                                className="h-5 w-5 rounded border-2 border-black accent-[#3A10E5] cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 5. INTEGRATIONS & HEALTH */}
            {activeTab === "integrations" && (
                <div className="space-y-6">
                    {/* System Status Grid */}
                    <div className="bg-white rounded-2xl border-2 border-[#10162F] p-6 sm:p-8 shadow-[4px_4px_0px_0px_#10162F] space-y-6">
                        <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                            <Server className="h-5 w-5 text-[#3A10E5]" />
                            <h2 className="text-lg font-extrabold text-[#10162F]">System Diagnostics & Health</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* DB Status */}
                            <div className="p-4 rounded-xl border-2 border-[#10162F] bg-[#FFFDF9] space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase text-[#10162F]">PostgreSQL Database</span>
                                    <Database className="h-4 w-4 text-[#3A10E5]" />
                                </div>
                                <div className="text-sm font-bold flex items-center gap-2 text-emerald-700">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>{diagnostics.dbStatus}</span>
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono">
                                    Ping Latency: {diagnostics.dbLatencyMs}ms (Supabase pooler)
                                </div>
                            </div>

                            {/* S3 Storage */}
                            <div className="p-4 rounded-xl border-2 border-[#10162F] bg-[#FFFDF9] space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase text-[#10162F]">AWS S3 Storage</span>
                                    <Server className="h-4 w-4 text-amber-600" />
                                </div>
                                <div className={`text-sm font-bold flex items-center gap-2 ${
                                    diagnostics.s3Configured ? "text-emerald-700" : "text-amber-700"
                                }`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${diagnostics.s3Configured ? "bg-emerald-500" : "bg-amber-500"}`} />
                                    <span>{diagnostics.s3Configured ? "Configured & Active" : "Fallback Storage"}</span>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                    Media assets, course illustrations, and videos
                                </div>
                            </div>

                            {/* Gemini AI */}
                            <div className="p-4 rounded-xl border-2 border-[#10162F] bg-[#FFFDF9] space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase text-[#10162F]">Google Gemini AI</span>
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className={`text-sm font-bold flex items-center gap-2 ${
                                    diagnostics.geminiConfigured ? "text-emerald-700" : "text-gray-500"
                                }`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${diagnostics.geminiConfigured ? "bg-emerald-500" : "bg-gray-400"}`} />
                                    <span>{diagnostics.geminiConfigured ? "Connected" : "Key Not Set"}</span>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                    Powers AI code explanations & hints
                                </div>
                            </div>
                        </div>

                        {/* Environment Info */}
                        <div className="p-4 rounded-xl bg-[#FFF8F0] border-2 border-[#10162F] text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-3 text-gray-700">
                            <div><span className="font-bold text-[#10162F]">Node Env:</span> {diagnostics.nodeEnv}</div>
                            <div><span className="font-bold text-[#10162F]">Next.js:</span> {diagnostics.nextVersion}</div>
                            <div><span className="font-bold text-[#10162F]">Stripe Key:</span> {diagnostics.stripeConfigured ? "Active" : "Not Set"}</div>
                            <div><span className="font-bold text-[#10162F]">Razorpay Key:</span> {diagnostics.razorpayConfigured ? "Active" : "Not Set"}</div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-rose-50 rounded-2xl border-2 border-rose-600 p-6 sm:p-8 shadow-[4px_4px_0px_0px_#9f1239] space-y-4">
                        <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm uppercase">
                            <AlertTriangle className="h-5 w-5 text-rose-600" />
                            Danger Zone & Reset
                        </div>
                        <p className="text-xs text-rose-800">
                            Resetting platform settings will revert all custom configurations back to system defaults. Existing user and course data in the database will NOT be deleted.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="border-2 border-rose-700 text-rose-700 hover:bg-rose-100 font-extrabold text-xs"
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Reset All Settings to Factory Defaults
                        </Button>
                    </div>
                </div>
            )}

            {/* ACTION BAR (Sticky at bottom) */}
            <div className="sticky bottom-4 z-40 p-4 bg-white rounded-2xl border-2 border-[#10162F] shadow-[4px_4px_0px_0px_#10162F] flex items-center justify-between gap-4">
                <div className="text-xs text-gray-600 font-semibold hidden sm:block">
                    Remember to click <strong className="text-[#10162F]">Save Changes</strong> to apply your settings across the platform.
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={isPending}
                        className="border-2 border-[#10162F] text-[#10162F] font-bold text-xs"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Reset
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending}
                        className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-xl border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                <span>Save Platform Settings</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
