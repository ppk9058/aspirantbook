"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Lock, Bell, Target, Moon, CheckCircle2 } from "lucide-react"
import { useTheme } from "@/components/providers/ThemeProvider"
import { useSession } from "next-auth/react"

export default function SettingsPage() {
    const { data: session } = useSession()
    const { theme, toggleTheme } = useTheme()
    const [activeTab, setActiveTab] = useState("learning")
    const [dailyGoal, setDailyGoal] = useState<number>(30)
    const [isSaved, setIsSaved] = useState(false)

    const handleSaveGoal = () => {
        localStorage.setItem("ts_daily_goal_minutes", String(dailyGoal))
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)
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
                        <TabsTrigger value="learning" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs">
                            <Target className="h-3.5 w-3.5" />
                            <span>Daily Goal</span>
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs">
                            <User className="h-3.5 w-3.5" />
                            <span>Profile</span>
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs">
                            <Moon className="h-3.5 w-3.5" />
                            <span>Appearance</span>
                        </TabsTrigger>
                        <TabsTrigger value="account" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2 min-h-[44px] data-[state=active]:bg-white dark:data-[state=active]:bg-teal-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white text-slate-700 dark:text-slate-300 shadow-2xs">
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
                                    {isSaved ? "Saved!" : "Save Daily Target"}
                                </Button>
                                {isSaved && (
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
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
                                <Input
                                    id="name"
                                    defaultValue={session?.user?.name || ""}
                                    placeholder="Enter your name"
                                    className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
                                <Input
                                    id="email"
                                    disabled
                                    defaultValue={session?.user?.email || ""}
                                    className="rounded-xl text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-slate-600 dark:text-slate-400"
                                />
                            </div>

                            <Button className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl px-5 min-h-[44px]">
                                Save Profile Changes
                            </Button>
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
                <TabsContent value="account">
                    <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Security & Password</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="currPass" className="text-xs font-semibold">Current Password</Label>
                                <Input
                                    id="currPass"
                                    type="password"
                                    placeholder="••••••••"
                                    className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="newPass" className="text-xs font-semibold">New Password</Label>
                                <Input
                                    id="newPass"
                                    type="password"
                                    placeholder="••••••••"
                                    className="rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700"
                                />
                            </div>

                            <Button className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl px-5 min-h-[44px]">
                                Update Password
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
