"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, FolderKanban } from "lucide-react"
import Link from "next/link"

interface CareerTrack {
    id: string
    title: string
    slug: string
    description: string
    courseCount: number
    projectCount: number
    participants: number
    courses: any[]
}

interface CareerTracksClientProps {
    tracks: CareerTrack[]
    initialRole: string
}

const roleFilters = [
    "All",
    "Data Analyst",
    "BI Analyst",
    "Data Engineer",
    "Data Scientist",
    "ML Scientist",
    "ML Engineer",
    "AI Engineer",
    "Developer",
    "Statistician"
]

export default function CareerTracksClient({ tracks, initialRole }: CareerTracksClientProps) {
    const router = useRouter()
    const [selectedRole, setSelectedRole] = useState(initialRole)

    const handleRoleChange = (role: string) => {
        setSelectedRole(role)
        if (role === "All") {
            router.push("/tracks/career")
        } else {
            router.push(`/tracks/career?role=${encodeURIComponent(role)}`)
        }
    }

    return (
        <div className="space-y-6">
            {/* Role Filters */}
            <div className="flex flex-wrap gap-2">
                {roleFilters.map((role) => (
                    <Button
                        key={role}
                        variant={selectedRole === role ? "default" : "outline"}
                        onClick={() => handleRoleChange(role)}
                        className={selectedRole === role ? "bg-[#05192D] hover:bg-[#0a2540]" : ""}
                    >
                        {role}
                    </Button>
                ))}
            </div>

            {/* Track Count */}
            <p className="text-gray-600 font-medium">{tracks.length} Career tracks</p>

            {/* Tracks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tracks.map((track) => {
                    // Determine badges based on track content
                    const hasFundamentals = track.courses.some(tc =>
                        tc.course.difficulty === "BEGINNER"
                    )
                    const hasCertification = true // Placeholder

                    return (
                        <Card key={track.id} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Header */}
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                                            CAREER TRACK
                                        </p>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                                            {track.title}
                                        </h3>
                                        <p className="text-gray-600 text-sm line-clamp-3">
                                            {track.description}
                                        </p>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-2">
                                        {hasFundamentals && (
                                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                                                Fundamentals
                                            </Badge>
                                        )}
                                        {hasCertification && (
                                            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                                ⚡ Certification available
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="h-4 w-4" />
                                            <span>{track.courseCount} Courses and Projects</span>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <Link href={`/tracks/career/${track.slug}`}>
                                        <Button className="w-full bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-50">
                                            View Details
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {tracks.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No career tracks found for this filter.</p>
                </div>
            )}
        </div>
    )
}
