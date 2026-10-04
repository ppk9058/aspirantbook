"use client"

import { Clock, CheckCircle2, BookOpen, Trophy, Code } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"

interface Activity {
    id: string
    completed: boolean
    lastAccessed: Date
    lesson: {
        title: string
        chapter: {
            course: {
                title: string
            }
        }
    }
}

interface ActivityFeedProps {
    activities: Activity[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
    if (activities.length === 0) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                <p className="text-gray-500 text-center py-8">
                    No recent activity. Start learning to see your progress here!
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />

                {/* Activity items */}
                <div className="space-y-6">
                    {activities.map((activity, index) => {
                        const Icon = activity.completed ? CheckCircle2 : Clock
                        const iconBgColor = activity.completed ? "bg-green-100" : "bg-blue-100"
                        const iconColor = activity.completed ? "text-green-600" : "text-blue-600"

                        return (
                            <motion.div
                                key={activity.id || `activity-${index}-${activity.lesson?.title || index}`}
                                className="relative flex gap-4"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {/* Icon badge */}
                                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${iconBgColor} flex items-center justify-center border-2 border-white shadow-sm`}>
                                    <Icon className={`h-5 w-5 ${iconColor}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-start justify-between mb-1">
                                        <p className="font-semibold text-gray-900">
                                            {activity.completed ? "Completed" : "Accessed"}: {activity.lesson.title}
                                        </p>
                                        {activity.completed && (
                                            <div className="flex-shrink-0 ml-2">
                                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                    +10 XP
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-gray-600 mb-2 flex items-center gap-1">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        {activity.lesson.chapter.course.title}
                                    </p>
                                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(activity.lastAccessed), { addSuffix: true })}
                                    </p>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

