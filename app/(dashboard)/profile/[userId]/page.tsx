import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  User as UserIcon,
  Award,
  Zap,
  Flame,
  Calendar,
  ChevronLeft,
  ExternalLink,
  Shield,
  CheckCircle2,
} from "lucide-react"
import Image from "next/image"

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const { userId } = await params
  if (!userId) {
    notFound()
  }

  const isSelf = session.user.id === userId
  const isAdmin = (session.user as any)?.role === "ADMIN"

  // Strict projection: NEVER expose email, phoneNumber, password or financial data to teachers/students
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      xp: true,
      level: true,
      streak: true,
      createdAt: true,
      selectedGoal: true,
      achievements: {
        include: {
          achievement: true,
        },
        orderBy: { unlockedAt: "desc" },
        take: 10,
      },
    },
  })

  if (!user) {
    notFound()
  }

  // Count submitted attempts for academic track record
  const attemptsCount = await prisma.examAttempt.count({
    where: {
      userId: user.id,
      status: "SUBMITTED",
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] p-4 sm:p-6 lg:p-10 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="javascript:history.back()"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs shadow-xs hover:border-gray-300 transition-colors min-h-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        {isAdmin && (
          <Link
            href={`/admin/users/${user.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors min-h-[44px]"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>View Full Admin Record</span>
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </Link>
        )}
      </div>

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 lg:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "Student"}
              width={80}
              height={80}
              className="h-20 w-20 rounded-2xl border-2 border-primary/20 object-cover shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00A8FF]/20 to-blue-600/20 text-[#00A8FF] flex items-center justify-center font-black text-2xl border border-[#00A8FF]/30 shadow-md">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-10 w-10" />}
            </div>
          )}

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                {user.name || "Learner Candidate"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                {user.role}
              </span>
              {isSelf && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  You
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
              {user.selectedGoal && (
                <span className="flex items-center gap-1 font-semibold text-[#00A8FF]">
                  Target: {user.selectedGoal}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Public Learner Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase">
            <Award className="h-3.5 w-3.5 text-sky-500" />
            <span>Tests Taken</span>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {attemptsCount}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Total XP</span>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {user.xp.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span>Day Streak</span>
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            {user.streak}
          </p>
        </div>

        <div className="bg-white dark:bg-[#0a1628] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Level</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            Lvl {user.level}
          </p>
        </div>
      </div>

      {/* Unlocked Badges & Achievements */}
      <div className="bg-white dark:bg-[#0a1628] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Award className="h-4 w-4 text-[#00A8FF]" />
          <span>Achievements ({user.achievements.length})</span>
        </h3>

        {user.achievements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {user.achievements.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 flex items-center gap-3 text-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 dark:text-white">
                    {item.achievement.name}
                  </p>
                  <p className="text-[11px] text-gray-500 line-clamp-1">
                    {item.achievement.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            No public achievements unlocked yet.
          </p>
        )}
      </div>
    </div>
  )
}
