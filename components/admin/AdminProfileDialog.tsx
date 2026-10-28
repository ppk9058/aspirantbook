"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { safeSignOut } from "@/lib/auth-client"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    User,
    Lock,
    Settings,
    LogOut,
    Shield,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Moon,
    Sun,
    ExternalLink,
} from "lucide-react"
import { updateAdminProfile, updateAdminPassword } from "@/lib/actions/admin/profile"
import { useTheme } from "@/components/providers/ThemeProvider"
import Image from "next/image"

interface AdminProfileDialogProps {
    isOpen: boolean
    onClose: () => void
    initialUser?: {
        name?: string | null
        email?: string | null
        image?: string | null
        role?: string | null
    }
}

export function AdminProfileDialog({ isOpen, onClose, initialUser }: AdminProfileDialogProps) {
    const { data: session, update: updateSession } = useSession()
    const { theme, toggleTheme } = useTheme()

    const currentUser = initialUser || session?.user

    const [activeTab, setActiveTab] = useState<string>("profile")

    // Profile form state
    const [name, setName] = useState(currentUser?.name || "")
    const [image, setImage] = useState(currentUser?.image || "")
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
    const [profileError, setProfileError] = useState<string | null>(null)

    // Password form state
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
    const [passwordError, setPasswordError] = useState<string | null>(null)

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || "")
            setImage(currentUser.image || "")
        }
    }, [currentUser])

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSavingProfile(true)
        setProfileError(null)
        setProfileSuccess(null)

        try {
            const res = await updateAdminProfile({
                name,
                image: image.trim() ? image.trim() : null,
            })

            if (res.success) {
                setProfileSuccess("Profile updated successfully!")
                if (updateSession) {
                    await updateSession()
                }
                setTimeout(() => setProfileSuccess(null), 3000)
            } else {
                setProfileError(res.error || "Failed to update profile")
            }
        } catch (err: any) {
            setProfileError(err.message || "Something went wrong")
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSavingPassword(true)
        setPasswordError(null)
        setPasswordSuccess(null)

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match")
            setIsSavingPassword(false)
            return
        }

        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters")
            setIsSavingPassword(false)
            return
        }

        try {
            const res = await updateAdminPassword({
                currentPassword,
                newPassword,
                confirmPassword,
            })

            if (res.success) {
                setPasswordSuccess("Password updated successfully!")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                setTimeout(() => setPasswordSuccess(null), 3500)
            } else {
                setPasswordError(res.error || "Failed to update password")
            }
        } catch (err: any) {
            setPasswordError(err.message || "Failed to change password")
        } finally {
            setIsSavingPassword(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl bg-white">
                {/* Header with Dark Slate Admin Theme */}
                <div className="bg-slate-900 p-6 text-white border-b border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg border border-purple-400/30 overflow-hidden flex-shrink-0">
                            {image ? (
                                <Image src={image} alt={name || "Admin"} width={56} height={56} className="h-full w-full object-cover" />
                            ) : (
                                <span>{(name || currentUser?.email || "A").slice(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white truncate">{name || "Admin User"}</h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                    <Shield className="h-3 w-3" />
                                    SUPER ADMIN
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser?.email || "admin@aspirantbook.com"}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs for Profile / Security / Settings */}
                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger
                                value="profile"
                                className="flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
                            >
                                <User className="h-3.5 w-3.5" />
                                <span>Profile</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="security"
                                className="flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
                            >
                                <Lock className="h-3.5 w-3.5" />
                                <span>Security</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs"
                            >
                                <Settings className="h-3.5 w-3.5" />
                                <span>Preferences</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="space-y-4 focus:outline-none">
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                {profileSuccess && (
                                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                        <span>{profileSuccess}</span>
                                    </div>
                                )}
                                {profileError && (
                                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                                        <span>{profileError}</span>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-name" className="text-xs font-bold text-slate-700">
                                        Display Name
                                    </Label>
                                    <Input
                                        id="admin-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Admin Authority"
                                        className="rounded-xl text-sm border-slate-200"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-email" className="text-xs font-bold text-slate-700">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="admin-email"
                                        value={currentUser?.email || ""}
                                        disabled
                                        className="rounded-xl text-sm bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                    />
                                    <p className="text-[11px] text-slate-400">Email is linked to platform RBAC credentials.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-image" className="text-xs font-bold text-slate-700">
                                        Avatar Image URL (Optional)
                                    </Label>
                                    <Input
                                        id="admin-image"
                                        value={image}
                                        onChange={(e) => setImage(e.target.value)}
                                        placeholder="https://example.com/avatar.jpg"
                                        className="rounded-xl text-sm border-slate-200"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className="rounded-xl text-xs font-semibold"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold px-5"
                                    >
                                        {isSavingProfile ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Profile"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        {/* Security Tab */}
                        <TabsContent value="security" className="space-y-4 focus:outline-none">
                            <form onSubmit={handleSavePassword} className="space-y-4">
                                {passwordSuccess && (
                                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                        <span>{passwordSuccess}</span>
                                    </div>
                                )}
                                {passwordError && (
                                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                                        <span>{passwordError}</span>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-curr-pass" className="text-xs font-bold text-slate-700">
                                        Current Password
                                    </Label>
                                    <Input
                                        id="admin-curr-pass"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="rounded-xl text-sm border-slate-200"
                                    />
                                    <p className="text-[11px] text-slate-400">Default test password is often Test@123</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-new-pass" className="text-xs font-bold text-slate-700">
                                        New Password
                                    </Label>
                                    <Input
                                        id="admin-new-pass"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="rounded-xl text-sm border-slate-200"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="admin-confirm-pass" className="text-xs font-bold text-slate-700">
                                        Confirm New Password
                                    </Label>
                                    <Input
                                        id="admin-confirm-pass"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-type new password"
                                        className="rounded-xl text-sm border-slate-200"
                                        required
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        className="rounded-xl text-xs font-semibold"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSavingPassword}
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold px-5"
                                    >
                                        {isSavingPassword ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                Updating...
                                            </>
                                        ) : (
                                            "Update Password"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        {/* Preferences Tab */}
                        <TabsContent value="settings" className="space-y-4 focus:outline-none">
                            <div className="space-y-3">
                                {/* Theme toggle */}
                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                                    <div className="flex items-center gap-2.5">
                                        {theme === "dark" ? (
                                            <Moon className="h-4 w-4 text-purple-600" />
                                        ) : (
                                            <Sun className="h-4 w-4 text-amber-500" />
                                        )}
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">Platform Theme</p>
                                            <p className="text-[11px] text-slate-500">
                                                Current: <span className="font-semibold capitalize">{theme} mode</span>
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={toggleTheme}
                                        className="rounded-lg text-xs font-semibold h-8"
                                    >
                                        Switch to {theme === "dark" ? "Light" : "Dark"}
                                    </Button>
                                </div>

                                {/* System Settings Link */}
                                <a
                                    href="/admin/settings"
                                    onClick={onClose}
                                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50/60 hover:border-purple-200 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Settings className="h-4 w-4 text-slate-500 group-hover:text-purple-600" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                                                System & Platform Settings
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Maintenance mode, system diagnostics & cache
                                            </p>
                                        </div>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600" />
                                </a>

                                {/* Sign Out Section */}
                                <div className="pt-2 border-t border-slate-100">
                                    <Button
                                        variant="destructive"
                                        onClick={() => safeSignOut("/")}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold h-10 shadow-xs"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span>Sign Out from Admin</span>
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
