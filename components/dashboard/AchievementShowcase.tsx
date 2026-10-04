"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Lock, Star, Award, Target, Zap } from "lucide-react"
import { motion } from "framer-motion"

interface Achievement {
    id: string
    title: string
    description: string
    icon: string
    unlocked: boolean
    unlockedAt?: Date
    progress?: number
    maxProgress?: number
}

interface AchievementShowcaseProps {
    achievements?: Achievement[]
}

export default function AchievementShowcase({ achievements }: AchievementShowcaseProps) {
    // Mock achievements if not provided
    const mockAchievements: Achievement[] = [
        {
            id: "1",
            title: "First Steps",
            description: "Complete your first lesson",
            icon: "star",
            unlocked: true,
            unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
            id: "2",
            title: "Code Master",
            description: "Complete 10 coding exercises",
            icon: "trophy",
            unlocked: true,
            unlockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
            id: "3",
            title: "Streak Hero",
            description: "Maintain a 7-day learning streak",
            icon: "zap",
            unlocked: true,
            unlockedAt: new Date()
        },
        {
            id: "4",
            title: "Course Champion",
            description: "Complete your first course",
            icon: "award",
            unlocked: false,
            progress: 8,
            maxProgress: 10
        },
        {
            id: "5",
            title: "Assessment Ace",
            description: "Pass all assessments with 90%+",
            icon: "target",
            unlocked: false,
            progress: 2,
            maxProgress: 5
        },
        {
            id: "6",
            title: "Marathon Learner",
            description: "Learn for 30 consecutive days",
            icon: "trophy",
            unlocked: false,
            progress: 7,
            maxProgress: 30
        },
    ]

    const displayAchievements = achievements || mockAchievements
    const unlockedCount = displayAchievements.filter(a => a.unlocked).length

    const getIcon = (iconName: string) => {
        const icons: Record<string, any> = {
            star: Star,
            trophy: Trophy,
            award: Award,
            target: Target,
            zap: Zap,
        }
        return icons[iconName] || Trophy
    }

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-[#3AAFA9]" />
                        <CardTitle className="text-lg">Achievements</CardTitle>
                    </div>
                    <div className="text-sm text-gray-600">
                        {unlockedCount}/{displayAchievements.length} unlocked
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {displayAchievements.map((achievement, index) => {
                        const Icon = getIcon(achievement.icon)
                        const isLocked = !achievement.unlocked

                        return (
                            <motion.div
                                key={achievement.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: isLocked ? 1 : 1.05 }}
                                className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${isLocked
                                    ? 'border-gray-200 bg-gray-50'
                                    : 'border-[#3AAFA9]/30 bg-gradient-to-br from-[#3AAFA9]/5 to-[#1DB954]/5'
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`mb-3 ${isLocked ? 'grayscale opacity-40' : ''}`}>
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${isLocked
                                        ? 'bg-gray-200'
                                        : 'bg-gradient-to-br from-[#3AAFA9] to-[#2d8a85]'
                                        }`}>
                                        {isLocked ? (
                                            <Lock className="h-6 w-6 text-gray-400" />
                                        ) : (
                                            <Icon className="h-6 w-6 text-white" />
                                        )}
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className={`font-semibold text-sm mb-1 ${isLocked ? 'text-gray-400' : 'text-gray-900'
                                    }`}>
                                    {achievement.title}
                                </h3>

                                {/* Description */}
                                <p className={`text-xs ${isLocked ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                    {achievement.description}
                                </p>

                                {/* Progress bar for locked achievements */}
                                {isLocked && achievement.progress !== undefined && achievement.maxProgress && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                            <span>Progress</span>
                                            <span>{achievement.progress}/{achievement.maxProgress}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gray-400 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                                                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Unlocked date */}
                                {!isLocked && achievement.unlockedAt && (
                                    <div className="text-xs text-[#3AAFA9] mt-2">
                                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                )}

                                {/* Shine effect for unlocked */}
                                {!isLocked && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '200%' }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 3,
                                            delay: index * 0.2,
                                            repeatDelay: 5
                                        }}
                                        style={{ pointerEvents: 'none' }}
                                    />
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
