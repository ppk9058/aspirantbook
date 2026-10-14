import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sanitizeReturnPath } from "@/lib/utils/return-path"
import AttemptClient from "./AttemptClient"

interface AttemptPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AttemptPage({ params, searchParams }: AttemptPageProps) {
    const { id: paramId } = await params
    const sParams = await searchParams
    const queryTestId = typeof sParams?.testId === "string" ? sParams.testId : undefined
    const queryAttemptId = typeof sParams?.attemptId === "string" ? sParams.attemptId : undefined
    const testId = queryTestId || paramId

    const session = await auth()
    const isAdmin = session?.user?.role === "ADMIN"
    const currentUserId = session?.user?.id

    // If attempt is already SUBMITTED, redirect to returnPath / quizzes so browser Back never shows expired attempt or 404
    if (queryAttemptId && currentUserId) {
        const attempt = await prisma.examAttempt.findFirst({
            where: { id: queryAttemptId, userId: currentUserId },
            select: {
                status: true,
                test: {
                    select: {
                        testType: true,
                        series: { select: { slug: true } },
                    },
                },
            },
        })
        if (attempt?.status === "SUBMITTED") {
            const isCa = paramId === "current-affairs-system-series" ||
                attempt.test?.testType === "CURRENT_AFFAIRS" ||
                attempt.test?.series?.slug === "current-affairs-system-series"
            const isPyq = paramId === "pyq-system-series" ||
                attempt.test?.testType === "PREVIOUS_YEAR" ||
                attempt.test?.series?.slug === "pyq-system-series"
            const rawReturn = typeof sParams?.returnPath === "string" ? sParams.returnPath : undefined
            const fallback = isCa ? "/current-affairs-quizzes" : isPyq ? "/pyqs" : `/test-series/${paramId}`
            const safeDest = sanitizeReturnPath(rawReturn, fallback)
            redirect(safeDest)
        }
    }

    // 1. Check if testId corresponds to a test in DB
    const testRow = await prisma.examTest.findFirst({
        where: { id: testId },
        select: {
            id: true,
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
        const isTestOwner = currentUserId && testRow.createdById === currentUserId
        const isSeriesOwner = currentUserId && testRow.series?.createdById === currentUserId
        const isSystemSeries = testRow.testType === "PREVIOUS_YEAR" || testRow.testType === "CURRENT_AFFAIRS" || testRow.series?.slug === "current-affairs-system-series" || testRow.series?.slug === "pyq-system-series"
        // If series is unpublished and user is not admin/series owner -> 404
        if (testRow.series && !testRow.series.isPublished && !isAdmin && !isSeriesOwner && !isSystemSeries) {
            notFound()
        }
        // If test is unpublished (draft) and user is not admin/test owner -> 404
        if (!testRow.isPublished && !isAdmin && !isTestOwner) {
            notFound()
        }
    } else {
        // If testId is not an exam test, check if paramId was a series
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

    return <AttemptClient />
}
