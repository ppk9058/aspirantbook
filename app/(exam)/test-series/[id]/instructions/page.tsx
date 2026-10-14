import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import InstructionsClient from "./InstructionsClient"

interface InstructionsPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function InstructionsPage({ params, searchParams }: InstructionsPageProps) {
    const { id: paramId } = await params
    const sParams = await searchParams
    const queryTestId = typeof sParams?.testId === "string" ? sParams.testId : undefined
    const testId = queryTestId || paramId

    const session = await auth()
    const isAdmin = session?.user?.role === "ADMIN"
    const currentUserId = session?.user?.id

    // 1. Check test existence and draft access
    const testRow = await prisma.examTest.findFirst({
        where: { id: testId },
        select: {
            id: true,
            title: true,
            isPublished: true,
            testType: true,
            createdById: true,
            series: {
                select: {
                    id: true,
                    slug: true,
                    isPublished: true,
                    createdById: true,
                },
            },
        },
    })

    if (testRow) {
        // Redirect Current Affairs quizzes to new clean URL
        if (testRow.testType === "CURRENT_AFFAIRS" || testRow.series?.slug === "current-affairs-system-series" || paramId === "current-affairs-system-series") {
            const { getQuizSlug } = await import("@/lib/current-affairs/slugs")
            const quizSlug = getQuizSlug(testRow)
            redirect(`/current-affairs-quizzes/${encodeURIComponent(quizSlug)}/instructions`)
        }

        const isTestOwner = currentUserId && testRow.createdById === currentUserId
        const isSeriesOwner = currentUserId && testRow.series?.createdById === currentUserId
        const isSystemSeries = testRow.testType === "PREVIOUS_YEAR" || (testRow.testType as string) === "CURRENT_AFFAIRS" || testRow.series?.slug === "current-affairs-system-series" || testRow.series?.slug === "pyq-system-series"
        if (testRow.series && !testRow.series.isPublished && !isAdmin && !isSeriesOwner && !isSystemSeries) {
            notFound()
        }
        if (!testRow.isPublished && !isAdmin && !isTestOwner) {
            notFound()
        }
    } else {
        if (paramId === "current-affairs-system-series") {
            redirect("/current-affairs-quizzes")
        }
        if (paramId === "pyq-system-series") {
            redirect("/pyqs")
        }
        const seriesRow = await prisma.examSeries.findFirst({
            where: {
                OR: [
                    { id: paramId },
                    { slug: paramId },
                ],
            },
            select: { id: true, isPublished: true, createdById: true },
        })
        if (seriesRow && !seriesRow.isPublished) {
            const isOwner = currentUserId && seriesRow.createdById === currentUserId
            if (!isAdmin && !isOwner) {
                notFound()
            }
        }
    }

    return <InstructionsClient />
}
