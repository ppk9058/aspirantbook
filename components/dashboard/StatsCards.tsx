import { Card, CardContent } from "@/components/ui/card"
import { Trophy, BookOpen, Flame, Clock } from "lucide-react"

interface StatsCardsProps {
    stats: {
        coursesEnrolled: number
        achievements: number
        streak?: number
        hoursLearned?: number
    }
}

export default function StatsCards({ stats }: StatsCardsProps) {
    const items = [
        {
            title: "Enrolled Courses",
            value: stats.coursesEnrolled,
            icon: BookOpen,
            color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40",
            label: "Courses in flight",
        },
        {
            title: "Current Streak",
            value: `${stats.streak ?? 0} Days`,
            icon: Flame,
            color: "text-orange-500 bg-orange-50 dark:bg-orange-950/40",
            label: "Consistency score",
        },
        {
            title: "Badges Earned",
            value: stats.achievements,
            icon: Trophy,
            color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
            label: "Skills unlocked",
        },
        {
            title: "Learning Time",
            value: `${stats.hoursLearned ?? 4}h`,
            icon: Clock,
            color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
            label: "Total focus time",
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((item) => {
                const Icon = item.icon
                return (
                    <Card
                        key={item.title}
                        className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#05192D] shadow-xs hover:shadow-sm transition-all"
                    >
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                                        {item.title}
                                    </p>
                                    <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                                        {item.value}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                        {item.label}
                                    </p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
