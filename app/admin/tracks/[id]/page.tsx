import { TrackForm } from "@/components/admin/tracks/TrackForm"
import { TrackCourseManager } from "@/components/admin/tracks/TrackCourseManager"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

interface EditTrackPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function EditTrackPage({ params }: EditTrackPageProps) {
    const { id } = await params
    const track = await prisma.track.findUnique({
        where: { id: id },
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
        redirect("/admin/tracks")
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Track</h1>
                <p className="text-muted-foreground">
                    Manage track details and assigned courses
                </p>
            </div>

            <div className="grid gap-6">
                <div className="border rounded-lg p-6 bg-card">
                    <h2 className="text-xl font-semibold mb-4">Track Details</h2>
                    <TrackForm initialData={track} />
                </div>

                <div className="border rounded-lg p-6 bg-card">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-semibold">Course Curriculum</h2>
                            <p className="text-sm text-muted-foreground">
                                Manage courses in this track
                            </p>
                        </div>
                    </div>

                    <TrackCourseManager
                        trackId={track.id}
                        courses={track.courses}
                    />
                </div>
            </div>
        </div>
    )
}
