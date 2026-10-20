"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    User,
    Lock,
    Target,
    Moon,
    CheckCircle2,
    AlertCircle,
    Loader2,
    LogOut,
    Trash2,
    ShieldAlert,
    ShieldCheck,
    X,
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "@/components/providers/ThemeProvider"
import { updateProfile, changePassword, deleteAccount } from "@/lib/actions/user/profile"
import { logoutAllDevicesAction } from "@/lib/actions/auth"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

interface SettingsClientProps {
    user: {
        id: string
        name: string | null
        email: string
        phoneNumber: string | null
        selectedGoal: string | null
        image: string | null
        role: string
        sessionVersion: number
    }
}

export default function SettingsClient({ user }: SettingsClientProps) {
    const router = useRouter()
    const { theme, toggleTheme } = useTheme()
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState("learning")

    // Daily Goal
    const [dailyGoal, setDailyGoal] = useState<number>(30)
    const [goalSaved, setGoalSaved] = useState(false)

    // Profile state
    const [name, setName] = useState(user.name || "")
    const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || "")
    const [selectedGoal, setSelectedGoal] = useState(user.selectedGoal || "")
    const [profileSuccess, setProfileSuccess] = useState("")
    const [profileError, setProfileError] = useState("")

    // Password state
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordSuccess, setPasswordSuccess] = useState("")
    const [passwordError, setPasswordError] = useState("")

    // Logout all / Delete account modals
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletePass, setDeletePass] = useState("")
    const [deleteError, setDeleteError] = useState("")
    const [sessionMessage, setSessionMessage] = useState("")

    const handleSaveGoal = () => {
        localStorage.setItem("ts_daily_goal_minutes", String(dailyGoal))
        setGoalSaved(true)
        setTimeout(() => setGoalSaved(false), 2000)
    }

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault()
        setProfileSuccess("")
        setProfileError("")

        const formData = new FormData()
        formData.append("name", name)
        formData.append("phoneNumber", phoneNumber)
        formData.append("selectedGoal", selectedGoal)

        startTransition(async () => {
            const res = await updateProfile(formData)
            if (res.success) {
                setProfileSuccess("Profile updated successfully!")
                router.refresh()
            } else {
                setProfileError(res.error || "Failed to update profile")
            }
        })
    }

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordSuccess("")
        setPasswordError("")

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match")
            return
        }

        const formData = new FormData()
        formData.append("currentPassword", currentPassword)
        formData.append("newPassword", newPassword)
        formData.append("confirmPassword", confirmPassword)

        startTransition(async () => {
            const res = await changePassword(formData)
            if (res.success) {
                setPasswordSuccess("Password updated successfully! Other active sessions have been invalidated.")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                setPasswordError(res.error || "Failed to change password")
            }
        })
    }

    const handleLogoutAllDevices = () => {
        if (confirm("Are you sure you want to log out from all devices? You will need to log in again.")) {
            startTransition(async () => {
                const res = await logoutAllDevicesAction()
                if (res.success) {
                    await signOut({ callbackUrl: "/login?message=logged_out_all" })
                } else {
                    setSessionMessage(res.error || "Failed to logout from all devices")
                }
            })
        }
    }

    const handleDeleteAccount = (e: React.FormEvent) => {
        e.preventDefault()
        setDeleteError("")

        startTransition(async () => {
            const res = await deleteAccount(deletePass)
            if (res.success) {
                await signOut({ callbackUrl: "/login?message=account_deleted" })
            } else {
                setDeleteError(res.error || "Failed to delete account")
            }
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-32 sm:pb-24 lg:pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Account & Preferences
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Manage your daily learning pace, profile credentials, and theme
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="overflow-x-auto pb-1" data-scroll-x="true">
                    <TabsList className="flex min-w-[340px] sm:min-w-0 sm:grid sm:grid-cols-4 bg-gray-100 dark:bg-[#05192D] p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                        <TabsTrigger
                            value="learning"
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs"
                        >
                            <Target className="h-3.5 w-3.5" />
                            <span>Daily Goal</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="profile"
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs"
                        >
                            <User className="h-3.5 w-3.5" />
                            <span>Profile</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="appearance"
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs"
                        >
                            <Moon className="h-3.5 w-3.5" />
                            <span>Appearance</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="account"
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs"
                        >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Security</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Daily Goal Tab */}
                <TabsContent value="learning">
                    <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Target className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                                Learning Target Pace
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Set how much time you want to commit each day to keep your streak active.
                            </p>

                            <div className="grid grid-cols-3 gap-3">
                                {[15, 30, 60].map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => setDailyGoal(mins)}
                                        className={`p-4 rounded-xl border text-center transition-all min-h-[44px] ${
                                            dailyGoal === mins
                                                ? "border-teal-700 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-bold shadow-xs"
                                                : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-gray-100"
                                        }`}
                                    >
                                        <div className="text-lg font-black">{mins} mins</div>
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                            {mins === 15 ? "Casual" : mins === 30 ? "Recommended" : "Intensive"}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="pt-2 flex items-center gap-3">
                                <Button
                                    onClick={handleSaveGoal}
                                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl px-5 min-h-[44px]"
                                >
                                    {goalSaved ? "Saved!" : "Save Daily Target"}
                                </Button>
                                {goalSaved && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Target updated
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Profile Tab */}
                <TabsContent value="profile">
                    <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Profile Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                {profileError && (
                                    <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {profileError}
                                    </div>
                                )}
                                {profileSuccess && (
                                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        {profileSuccess}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                        required
                                        className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
                                    <Input
                                        id="email"
                                        disabled
                                        value={user.email}
                                        className="rounded-xl text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-slate-600 dark:text-slate-400"
                                    />
                                    <p className="text-[11px] text-gray-500">Contact support if you need to transfer your account to a new email.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-xs font-semibold">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="10-digit mobile number"
                                        maxLength={10}
                                        className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="goal" className="text-xs font-semibold">Target Exam / Learning Goal</Label>
                                    <select
                                        id="goal"
                                        value={selectedGoal}
                                        onChange={(e) => setSelectedGoal(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">Select your goal...</option>
                                        <option value="UPSC CSE">UPSC Civil Services Examination</option>
                                        <option value="SSC CGL">SSC CGL / CHSL</option>
                                        <option value="Banking">Banking & Insurance (IBPS, SBI)</option>
                                        <option value="State PSC">State Public Service Commission</option>
                                        <option value="General Skills">General Skill Development</option>
                                    </select>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl px-5 min-h-[44px]"
                                >
                                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Profile Changes
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Appearance Tab */}
                <TabsContent value="appearance">
                    <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Theme & Display</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Choose between high-contrast dark mode or clean daylight view.
                            </p>

                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">
                                        <Moon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">Dark Mode</h4>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400">Currently set to {theme === "dark" ? "Dark" : "Light"}</p>
                                    </div>
                                </div>

                                <Button
                                    onClick={toggleTheme}
                                    variant="outline"
                                    className="text-xs font-semibold rounded-xl min-h-[44px]"
                                >
                                    Toggle to {theme === "dark" ? "Light" : "Dark"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="account" className="space-y-6">
                    {/* Password Change */}
                    <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Change Password</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                {passwordError && (
                                    <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {passwordError}
                                    </div>
                                )}
                                {passwordSuccess && (
                                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        {passwordSuccess}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="currPass" className="text-xs font-semibold">Current Password</Label>
                                    <Input
                                        id="currPass"
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="newPass" className="text-xs font-semibold">New Password (min 8 chars)</Label>
                                    <Input
                                        id="newPass"
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="confirmPass" className="text-xs font-semibold">Confirm New Password</Label>
                                    <Input
                                        id="confirmPass"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl px-5 min-h-[44px]"
                                >
                                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Update Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Active Sessions */}
                    <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-between">
                                <span>Active Sessions</span>
                                <span className="text-xs font-mono font-normal text-gray-500">
                                    Token Version: v{user.sessionVersion}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {sessionMessage && (
                                <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-medium">
                                    {sessionMessage}
                                </div>
                            )}
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Log out of all mobile and browser devices immediately. All other sessions will be terminated.
                            </p>
                            <Button
                                variant="outline"
                                onClick={handleLogoutAllDevices}
                                disabled={isPending}
                                className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-semibold text-xs rounded-xl min-h-[44px] flex items-center gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Log Out From All Devices
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Danger Zone: Delete Account */}
                    <Card className="rounded-2xl border-2 border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                Danger Zone &bull; Delete Account
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xs text-red-600 dark:text-red-400">
                                Deleting your account will anonymize your personal records and revoke active course access.
                            </p>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteModal(true)}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl min-h-[44px] flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete My Account
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Legal, Privacy & Policies */}
                    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                Legal &amp; Compliance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            <p className="text-slate-600 dark:text-slate-400 mb-3">
                                Review our terms of service, data privacy rules, and student data protection standards.
                            </p>
                            <div className="flex flex-wrap gap-4 pt-1">
                                <Link
                                    href="/privacy"
                                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                                >
                                    <span>Privacy Policy &rarr;</span>
                                </Link>
                                <Link
                                    href="/terms"
                                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                                >
                                    <span>Terms &amp; Conditions &rarr;</span>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5" /> Confirm Account Deletion
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            Please enter your password to confirm account deletion. This action cannot be undone.
                        </p>

                        {deleteError && (
                            <div className="p-3 mt-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
                                {deleteError}
                            </div>
                        )}

                        <form onSubmit={handleDeleteAccount} className="space-y-4 mt-4">
                            <div>
                                <Label htmlFor="delPass" className="text-xs font-semibold">Your Password</Label>
                                <Input
                                    id="delPass"
                                    type="password"
                                    required
                                    value={deletePass}
                                    onChange={(e) => setDeletePass(e.target.value)}
                                    placeholder="••••••••"
                                    className="rounded-xl text-xs sm:text-sm mt-1"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={isPending}
                                >
                                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Confirm Delete
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
