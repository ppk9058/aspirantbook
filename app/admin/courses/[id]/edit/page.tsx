import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { VideoCourseEditorClient } from "@/components/admin/courses/VideoCourseEditorClient"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CourseEditPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    let course: any = null
    let dbError: string | null = null

    try {
        course = await prisma.course.findUnique({
            where: { id: id },
            include: {
                units: {
                    orderBy: { order: "asc" },
                },
                chapters: {
                    include: {
                        lessons: {
                            orderBy: { order: "asc" },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        })
    } catch (err: any) {
        console.error("Database connection error in /admin/courses/[id]/edit:", err.message)
        dbError = err.message
    }

    if (dbError) {
        return (
            <div className="p-8 max-w-4xl mx-auto">
                <Card className="border-2 border-rose-300 bg-rose-50 p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-6 w-6 text-rose-600 flex-shrink-0" />
                        <div>
                            <h2 className="text-base font-bold text-rose-900">Database Connection Error</h2>
                            <p className="text-xs text-rose-700 mt-1">{dbError}</p>
                            <p className="text-xs text-rose-600 mt-2">
                                Please ensure the dev server is running unsandboxed and has access to the database pooler.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    if (!course) {
        notFound()
    }

    return <VideoCourseEditorClient course={course} />
}
