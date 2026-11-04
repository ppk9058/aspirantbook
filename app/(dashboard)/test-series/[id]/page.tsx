import { notFound, permanentRedirect } from "next/navigation"
import { safeJsonLdStringify } from "@/lib/seo/core"
import { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import TestSeriesDetailClient from "./TestSeriesDetailClient"
import { adaptTestSeriesDetailSeo } from "@/lib/seo/adapters/test-series"

interface TestSeriesDetailPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>
}): Promise<Metadata> {
    const { id: seriesId } = await params
    if (seriesId === "current-affairs-system-series" || seriesId === "pyq-system-series") {
        return { title: "Test Series | TrillionSkill" }
    }

    const series = await prisma.examSeries.findFirst({
        where: {
            OR: [
                { id: seriesId },
                { slug: seriesId },
            ],
        },
        select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            isPublished: true,
            isFree: true,
        },
    })

    if (!series) {
        return { title: "Test Series Not Found | TrillionSkill" }
    }

    return adaptTestSeriesDetailSeo(series).metadata
}

export default async function TestSeriesDetailPage({ params, searchParams }: TestSeriesDetailPageProps) {
    const { id: seriesId } = await params
    const sParams = await searchParams
    const testId = typeof sParams?.testId === "string" ? sParams.testId : undefined

    // 0. Hidden system series intercept: redirect to dedicated public hubs (308)
    if (seriesId === "current-affairs-system-series") {
        permanentRedirect("/current-affairs-quizzes")
    }
    if (seriesId === "pyq-system-series") {
        permanentRedirect("/pyqs")
    }

    const session = await auth()
    const isAdmin = session?.user?.role === "ADMIN"
    const currentUserId = session?.user?.id

    // 1. Check database series
    const dbSeries = await prisma.examSeries.findFirst({
        where: {
            OR: [
                { id: seriesId },
                { slug: seriesId },
            ],
        },
        select: {
            id: true,
            slug: true,
            isPublished: true,
            createdById: true,
        },
    })

    if (dbSeries?.slug === "current-affairs-system-series") {
        permanentRedirect("/current-affairs-quizzes")
    }
    if (dbSeries?.slug === "pyq-system-series") {
        permanentRedirect("/pyqs")
    }

    if (!dbSeries) {
        notFound()
    }

    if (dbSeries && !dbSeries.isPublished) {
        const isOwner = currentUserId && dbSeries.createdById === currentUserId
        if (!isAdmin && !isOwner) {
            notFound()
        }
    }

    // 2. If a draft test was requested directly, block unauthorized
    if (testId) {
        const testRow = await prisma.examTest.findUnique({
            where: { id: testId },
            select: { id: true, isPublished: true, createdById: true },
        })
        if (testRow && !testRow.isPublished) {
            const isTestOwner = currentUserId && testRow.createdById === currentUserId
            if (!isAdmin && !isTestOwner) {
                notFound()
            }
        }
    }

    const fullSeries = await prisma.examSeries.findUnique({
        where: { id: dbSeries.id },
        include: {
            tests: {
                where: { isPublished: true },
                select: { accessMode: true },
            },
        },
    })

    if (!fullSeries) {
        notFound()
    }

    let highlights: string[] = Array.isArray(fullSeries.highlights) && fullSeries.highlights.length > 0 ? fullSeries.highlights : []
    let cleanDescription = (fullSeries.description || "").trim()
    let logoType = fullSeries.logoType && fullSeries.logoType !== "general" ? fullSeries.logoType : null
    if (cleanDescription.startsWith("{") && cleanDescription.endsWith("}")) {
        try {
            const meta = JSON.parse(cleanDescription)
            if (!logoType && meta.logoType) logoType = meta.logoType
            if (highlights.length === 0 && Array.isArray(meta.highlights)) {
                highlights = meta.highlights.filter((h: any) => typeof h === "string" && h.trim().length > 0)
            }
            cleanDescription = (meta.description || meta.overview || meta.subtitle || "").trim()
        } catch {
            cleanDescription = ""
        }
    }
    if (!logoType) {
        logoType = fullSeries.slug.includes("upsc") ? "upsc" : fullSeries.slug.includes("bpsc") ? "bpsc" : "general"
    }
    const publishedTests = fullSeries.tests || []
    const totalTestsCount = publishedTests.length
    const freeTestsCount = publishedTests.filter((t: any) => t.accessMode === "FREE").length
    const usersCount = fullSeries.usersCount
    const usersStr = usersCount >= 1000 ? `${(usersCount / 1000).toFixed(1)}k` : `${usersCount}`

    const initialSeries = {
        id: fullSeries.slug || fullSeries.id,
        dbId: fullSeries.id,
        slug: fullSeries.slug,
        title: fullSeries.title,
        category: fullSeries.category,
        examName: fullSeries.examName,
        examType: "Civil Services",
        logoType,
        users: usersStr,
        totalTests: totalTestsCount,
        freeTests: freeTestsCount,
        languages: fullSeries.languages,
        highlights,
        description: cleanDescription,
        bannerUrl: fullSeries.bannerUrl || null,
        syllabus: fullSeries.syllabus || null,
        keyFeatures: Array.isArray(fullSeries.keyFeatures) ? fullSeries.keyFeatures : [],
        whyThisSeries: fullSeries.whyThisSeries || null,
        goalId: fullSeries.category.toLowerCase().replace(/\s+/g, "-"),
        tags: [fullSeries.category.toLowerCase()],
        isFree: fullSeries.isFree ?? false,
        isPro: fullSeries.isPro ?? false,
        isGated: Boolean(fullSeries.isGated),
        previewPercentage: fullSeries.previewPercentage ?? 20,
        seoMode: fullSeries.seoMode ?? "preview",
        gateTitle: fullSeries.gateTitle,
        gateSubtitle: fullSeries.gateSubtitle,
    }

    const isUnpublishedOrArchived = !fullSeries.isPublished || Boolean(fullSeries.isArchived)
    const seoPackage = adaptTestSeriesDetailSeo({
        id: fullSeries.id,
        title: fullSeries.title,
        slug: fullSeries.slug,
        description: cleanDescription,
        isPublished: !isUnpublishedOrArchived,
        isArchived: Boolean(fullSeries.isArchived),
        isFree: fullSeries.isFree,
    })

    const jsonLd = isUnpublishedOrArchived
        ? null
        : fullSeries.isGated
        ? {
              "@context": "https://schema.org",
              "@type": "Course",
              name: fullSeries.title,
              description: cleanDescription,
              isAccessibleForFree: false,
              hasPart: {
                  "@type": "WebPageElement",
                  isAccessibleForFree: false,
                  cssSelector: "[role='region'][aria-label='Content Gate']",
              },
          }
        : seoPackage.jsonLd?.[0] || null

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
                />
            )}
            <TestSeriesDetailClient initialSeries={initialSeries} />
        </>
    )
}
