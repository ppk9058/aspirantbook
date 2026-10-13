"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, TrendingUp, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

interface ProgressChartsProps {
    activityData?: Array<{ date: string; count: number }>
    skillData?: Array<{ skill: string; level: number; maxLevel: number }>
}

export default function ProgressCharts({ activityData, skillData }: ProgressChartsProps) {
    const [mounted, setMounted] = useState(false)
    const [activity, setActivity] = useState<Array<{ date: string; count: number }>>([])
    const [skills, setSkills] = useState<Array<{ skill: string; level: number; maxLevel: number }>>([])

    useEffect(() => {
        setMounted(true)

        // Use provided data or generate mock data
        if (activityData) {
            setActivity(activityData)
        } else {
            const mockActivity = Array.from({ length: 30 }, (_, i) => {
                const date = new Date()
                date.setDate(date.getDate() - (29 - i))
                return {
                    date: date.toISOString().split('T')[0],
                    count: Math.floor(Math.random() * 5) // 0-4 activities per day
                }
            })
            setActivity(mockActivity)
        }

        if (skillData) {
            setSkills(skillData)
        } else {
            setSkills([
                { skill: "Python", level: 75, maxLevel: 100 },
                { skill: "AI/ML", level: 60, maxLevel: 100 },
                { skill: "APIs", level: 80, maxLevel: 100 },
                { skill: "Cloud", level: 45, maxLevel: 100 },
                { skill: "DevOps", level: 50, maxLevel: 100 },
            ])
        }
    }, [activityData, skillData])

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return null // Or a loading skeleton
    }

    // Get intensity color based on count
    const getIntensityColor = (count: number) => {
        if (count === 0) return "bg-gray-100"
        if (count === 1) return "bg-[#1448d8]/20"
        if (count === 2) return "bg-[#1448d8]/40"
        if (count === 3) return "bg-[#1448d8]/60"
        return "bg-[#1448d8]/80"
    }

    // Calculate total learning time (mock)
    const totalMinutes = activity.reduce((sum, day) => sum + (day.count * 30), 0)
    const totalHours = Math.floor(totalMinutes / 60)

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Heat Map */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-[#1448d8]" />
                            <CardTitle className="text-lg">Learning Activity</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{totalHours}h total</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Heat map grid */}
                        <div className="grid grid-cols-10 gap-1">
                            {activity.map((day, index) => (
                                <motion.div
                                    key={day.date}
                                    className={`h-8 rounded ${getIntensityColor(day.count)} cursor-pointer group relative`}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.01 }}
                                    whileHover={{ scale: 1.2 }}
                                    title={`${day.date}: ${day.count} activities`}
                                >
                                    {/* Tooltip on hover */}
                                    <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        <br />
                                        {day.count} {day.count === 1 ? 'activity' : 'activities'}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                            <span>Less</span>
                            <div className="flex gap-1">
                                {[0, 1, 2, 3, 4].map((level) => (
                                    <div
                                        key={level}
                                        className={`h-3 w-3 rounded ${getIntensityColor(level)}`}
                                    />
                                ))}
                            </div>
                            <span>More</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Skill Progress */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#1448d8]" />
                        <CardTitle className="text-lg">Skill Progress</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {skills.map((skill, index) => {
                            const percentage = (skill.level / skill.maxLevel) * 100

                            return (
                                <motion.div
                                    key={skill.skill}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="font-medium text-gray-700">{skill.skill}</span>
                                        <span className="text-gray-500">{skill.level}/{skill.maxLevel}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-[#1448d8] to-[#0f37a8] rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 1, delay: index * 0.1 + 0.5 }}
                                        />
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
