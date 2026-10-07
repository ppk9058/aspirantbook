import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    User,
    Mail,
    Calendar,
    Award,
    BookOpen,
    Clock,
    TrendingUp,
    Crown,
    Flame,
    Zap,
    ArrowRight,
    ShoppingBag
} from "lucide-react"
import Link from "next/link"

export default async function ProfilePage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    let user = null
    let isDbError = false

    try {
        user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                enrollments: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                thumbnailUrl: true,
                                difficulty: true,
                                chapters: {
                                    include: {
                                        lessons: {
                                            select: { id: true }
                                        }
                                    }
                                }
                            },
                        },
                    },
                },
                progress: true,
                achievements: {
                    include: {
                        achievement: true,
                    },
                    orderBy: { unlockedAt: "desc" },
                    take: 6,
                },
                subscriptions: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                _count: {
                    select: {
                        enrollments: true,
                        submissions: true,
                        achievements: true,
                    },
                },
            },
        })
    } catch (error) {
        console.error("Failed to load user profile from database:", error)
        isDbError = true
    }

    if (isDbError) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl text-red-600 dark:text-red-400 font-bold">
                    Database Temporarily Unavailable
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                    We could not retrieve your profile due to a temporary database connection issue. Please refresh or try again in a moment.
                </p>
                <Link
                    href="/profile"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                    Retry Loading Profile
                </Link>
            </div>
        )
    }

    // If session exists but user row does not exist in the database, clear session cookies and send to /login
    // to prevent infinite redirect loops.
    if (!user) {
        redirect("/api/auth/logout?callbackUrl=%2Flogin")
    }

    const userData = user

    const totalEnrollments = userData._count.enrollments
    const totalSubmissions = userData._count.submissions
    const totalAchievements = userData._count.achievements

    const enrollmentsWithProgress = userData.enrollments.map((enrollment) => {
        const courseLessonIds = enrollment.course.chapters.flatMap(c => c.lessons.map(l => l.id))
        const totalLessons = courseLessonIds.length

        const completedLessons = userData.progress.filter(p =>
            courseLessonIds.includes(p.lessonId) && p.completed
        ).length

        const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

        return {
            ...enrollment,
            totalLessons,
            completedLessons,
            progressPercentage,
        }
    })

    const activeSubscription = userData.subscriptions?.[0]
    const hasActiveSubscription = activeSubscription &&
        activeSubscription.status === "ACTIVE" &&
        new Date(activeSubscription.endDate) > new Date()

    const subscriptionPlan = hasActiveSubscription
        ? activeSubscription.plan
        : "FREE"

    return (
        <div className="space-y-6 sm:space-y-8 pb-32 sm:pb-24 lg:pb-12">
            {isDbError && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs sm:text-sm flex items-center justify-between">
                    <span>⚠️ Database server is temporarily unreachable or waking up. Displaying your active session profile.</span>
                </div>
            )}

            {/* Header / Hero Profile Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#05192D] via-[#0a2540] to-[#0d2f52] p-6 sm:p-8 text-white border border-gray-800 shadow-xl">
                <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left min-w-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-extrabold text-3xl shadow-lg border-2 border-white/20 flex-shrink-0">
                        {userData.name?.[0]?.toUpperCase() || "U"}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-white truncate max-w-full">{userData.name || "Learner"}</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                                {userData.role === "ADMIN" ? "Admin" : subscriptionPlan}
                            </span>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-300 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <span className="flex items-center gap-1.5 truncate max-w-full">
                                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{userData.email}</span>
                            </span>
                            <span className="text-gray-500 hidden sm:inline">•</span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span>Member since {new Date(userData.createdAt).getFullYear()}</span>
                            </span>
                        </p>

                        {/* Gamification Strip */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 mt-4 pt-4 border-t border-white/10 text-xs">
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                                <span className="font-bold text-white">{userData.xp} XP</span>
                                <span className="text-gray-400">(Level {userData.level})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                                <span className="font-bold text-white">{userData.streak} Day Streak</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-emerald-400" />
                                <span className="font-bold text-white">{totalAchievements} Badges</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 self-center sm:self-start">
                        <Link href="/purchases">
                            <button className="px-4 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5">
                                <ShoppingBag className="h-3.5 w-3.5" />
                                <span>My Purchases</span>
                            </button>
                        </Link>
                        <Link href="/settings">
                            <button className="px-4 py-2.5 min-h-[44px] bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors">
                                Edit Profile
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Courses Joined</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalEnrollments}</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl">
                            <BookOpen className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Code Submissions</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalSubmissions}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Achievements</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalAchievements}</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
                            <Award className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Enrolled Courses Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Courses</h2>
                    <Link href="/courses" className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 min-h-[44px]">
                        <span>Browse Catalog</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {enrollmentsWithProgress.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {enrollmentsWithProgress.map((enrollment) => (
                            <div
                                key={enrollment.id}
                                className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                                            {enrollment.course.title}
                                        </h3>
                                        <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                                            {Math.round(enrollment.progressPercentage)}%
                                        </span>
                                    </div>

                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mb-3">
                                        <div
                                            className="bg-gradient-to-r from-teal-600 to-emerald-600 h-full rounded-full"
                                            style={{ width: `${enrollment.progressPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                                    <span>{enrollment.completedLessons} / {enrollment.totalLessons} lessons</span>
                                    <Link
                                        href={`/learn/${enrollment.course.slug}`}
                                        className="text-teal-700 dark:text-teal-400 font-semibold hover:underline min-h-[44px] flex items-center"
                                    >
                                        Continue →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] text-center text-slate-600 dark:text-slate-400">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-400 stroke-[1.5]" />
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No active course enrollments</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Start your journey by enrolling in an interactive track.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
