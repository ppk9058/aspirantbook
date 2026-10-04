import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { LearningPath } from "@/components/track/LearningPath"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Trophy } from "lucide-react"

interface TrackDetailPageProps {
    params: Promise<{
        slug: string
    }>
}

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
    const { slug } = await params
    const track = await prisma.track.findUnique({
        where: { slug: slug, isPublished: true },
        include: {
            courses: {
                include: {
                    course: true,
                },
                orderBy: {
                    order: "asc",
                },
            },
        },
    })

    if (!track) {
        notFound()
    }

    return (
        <div className="container py-8 max-w-4xl">
            <div className="mb-12 text-center">
                <div className="flex justify-center mb-4">
                    <Badge variant={track.type === "CAREER" ? "default" : "secondary"} className="text-lg px-4 py-1">
                        {track.type === "CAREER" ? "Career Track" : "Skill Track"}
                    </Badge>
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-4">{track.title}</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    {track.description}
                </p>

                <div className="flex justify-center gap-8 mt-8 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        <span className="font-medium">{track.courses.length} Courses</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">~20 Hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        <span className="font-medium">Certificate</span>
                    </div>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-8 text-center">Your Learning Path</h2>
                <LearningPath courses={track.courses} />
            </div>
        </div>
    )
}
