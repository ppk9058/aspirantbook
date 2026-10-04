import { getCareerTrackBySlug } from "@/lib/actions/tracks/career"
import { auth } from "@/auth"
import { notFound } from "next/navigation"
import BackButton from "@/components/layout/BackButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BookOpen,
    Clock,
    Users,
    FolderKanban,
    CheckCircle,
    Lock
} from "lucide-react"
import Link from "next/link"

export default async function CareerTrackDetailPage({
    params
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const session = await auth()
    const track = await getCareerTrackBySlug(slug)

    if (!track) {
        notFound()
    }

    const hasAccess = session?.user?.role === "ADMIN" || session?.user?.role === "PREMIUM"

    return (
        <div className="space-y-6">
            <BackButton fallbackUrl="/tracks/career" label="Back to Career Tracks" />

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#05192D] to-[#0a2540] rounded-2xl p-12 text-white">
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-gray-300 uppercase tracking-wide mb-2">
                            CAREER TRACK
                        </p>
                        <h1 className="text-4xl font-bold mb-4">{track.title}</h1>

                        <Link href={hasAccess ? `/tracks/career/${track.slug}/enroll` : "/pricing"}>
                            <Button className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8">
                                {hasAccess ? "Enroll in Track" : "Upgrade to Access"}
                            </Button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            <span>SQL, Theory</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            <span>{track.totalHours} hours</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            <span>{track.courseCount} Courses</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5" />
                            <span>{track.projectCount} Projects</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <span>{track.participants.toLocaleString()} participants</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Track Description */}
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="text-2xl font-bold mb-4">Track Description</h2>
                            <p className="text-gray-700 leading-relaxed">
                                {track.description}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Courses List */}
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="text-2xl font-bold mb-6">Courses</h2>
                            <div className="space-y-4">
                                {track.courses.map((trackCourse, index) => {
                                    const course = trackCourse.course
                                    const isNative = course.difficulty === "BEGINNER"

                                    return (
                                        <div
                                            key={course.id}
                                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Course Number */}
                                                <div className="flex-shrink-0 w-10 h-10 bg-[#05192D] text-white rounded-full flex items-center justify-center font-bold">
                                                    {index + 1}
                                                </div>

                                                {/* Course Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-bold text-lg">{course.title}</h3>
                                                        {isNative && (
                                                            <Badge className="bg-blue-500 text-white">
                                                                ⚡ AI NATIVE
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-gray-600 mb-3">
                                                        Learn how to create and query relational databases using SQL in just two hours.
                                                    </p>

                                                    {/* Course Meta */}
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                                        <span>Chapters: {course.chapters.length}</span>
                                                        <span>600 XP</span>
                                                    </div>

                                                    {/* Already Know This */}
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                                        <p className="text-sm font-medium text-blue-900 mb-1">
                                                            Already know this?
                                                        </p>
                                                        <p className="text-xs text-blue-700">
                                                            Take a quick test to check if you can skip the course.
                                                        </p>
                                                    </div>

                                                    {/* Chapters Preview */}
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-semibold text-gray-700">Chapters:</p>
                                                        {course.chapters.slice(0, 3).map((chapter: any) => (
                                                            <div
                                                                key={chapter.id}
                                                                className="flex items-center gap-2 text-sm text-gray-600"
                                                            >
                                                                <BookOpen className="h-4 w-4" />
                                                                <span>{chapter.title}</span>
                                                                <span className="ml-auto text-xs">
                                                                    {chapter.lessons.length} lessons
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {course.chapters.length > 3 && (
                                                            <p className="text-xs text-gray-500 ml-6">
                                                                +{course.chapters.length - 3} more chapters
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Certification Card */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-bold text-lg mb-2">Certification Available</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                by <span className="font-semibold">aspirantbook</span>
                            </p>
                            <Badge className="bg-green-100 text-green-700 mb-4">
                                ✓ Included with Premium
                            </Badge>
                            <p className="text-sm text-gray-700 mb-4">
                                Industry recognized certifications help you stand out and prove your skills. Prepare for certification by completing this track.
                            </p>
                            <Button variant="outline" className="w-full">
                                Learn More
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Share Card */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="font-bold text-lg mb-4">SHARE</h3>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M13.5 2c-5.621 0-10.211 4.443-10.475 10h-3.025l5 6.625 5-6.625h-2.975c.257-3.351 3.06-6 6.475-6 3.584 0 6.5 2.916 6.5 6.5s-2.916 6.5-6.5 6.5c-1.863 0-3.542-.793-4.728-2.053l-2.427 3.216c1.877 1.754 4.389 2.837 7.155 2.837 5.79 0 10.5-4.71 10.5-10.5s-4.71-10.5-10.5-10.5z" />
                                    </svg>
                                </Button>
                                <Button variant="outline" size="icon">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                    </svg>
                                </Button>
                                <Button variant="outline" size="icon">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                                    </svg>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
