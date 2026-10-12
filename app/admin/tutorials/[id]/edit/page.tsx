import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCurrentUserContext } from "@/lib/auth/rbac"
import CourseEditClient from "@/app/admin/courses/[id]/edit/CourseEditClient"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TutorialEditPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const user = await getCurrentUserContext()
    if (!user.isAuthenticated || (user.role !== "ADMIN" && user.role !== "TEACHER")) {
        redirect("/")
    }

    let course: any = null
    let dbError: string | null = null

    try {
        course = await prisma.course.findUnique({
            where: { id },
            include: {
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
        console.error("Database connection error in /admin/tutorials/[id]/edit:", err.message)
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
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    if (!course) {
        notFound()
    }

    return (
        <CourseEditClient
            course={course}
            chapters={course.chapters}
            backUrl={user.role === "TEACHER" ? "/teacher/tutorials" : "/admin/tutorials"}
            studioTitle="Tutorial Studio (Rosera Editor)"
        />
    )
}
