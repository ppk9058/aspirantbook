import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock, Clock, Trophy, ArrowLeft, Play } from "lucide-react";
import { canViewLeaderboard } from "@/lib/exam/access-control";
import { LeaderboardClient } from "./LeaderboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeaderboardPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: testId } = await params;

    if (testId === "current-affairs-system-series") {
        redirect("/current-affairs-quizzes");
    } else if (testId === "pyq-system-series") {
        redirect("/pyqs");
    }

    const session = await auth();

    // Fetch test details for access control
    const test = await prisma.examTest.findUnique({
        where: { id: testId },
        select: {
            id: true,
            title: true,
            isPublished: true,
            createdById: true,
            isLive: true,
            liveStartAt: true,
            liveEndAt: true,
            seriesId: true,
            series: {
                select: {
                    id: true,
                    slug: true,
                    title: true,
                },
            },
        },
    });

    if (!test) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-[#0a1628] rounded-3xl p-8 border border-gray-200 dark:border-gray-800 text-center shadow-xl space-y-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Test Not Found</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        The requested test could not be found or has been removed.
                    </p>
                    <Link
                        href="/test-series"
                        className="inline-block py-2.5 px-6 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white font-bold text-xs shadow-md transition-all"
                    >
                        Browse Test Series
                    </Link>
                </div>
            </div>
        );
    }

    const seriesBackUrl = test.series?.slug ? `/test-series/${test.series.slug}` : `/test-series`;

    // 1. Unauthenticated check (Server side)
    if (!session?.user?.id) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-[#0a1628] rounded-3xl p-8 border border-gray-200 dark:border-gray-800 text-center shadow-xl space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Sign In Required</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please sign in to view the All India Rankings and performance analytics for this test.
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                        <Link
                            href={`/auth/login?callbackUrl=/test-series/${encodeURIComponent(testId)}/leaderboard`}
                            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0096e6] text-white font-bold text-sm shadow-md hover:shadow-[#00A8FF]/25 transition-all text-center block"
                        >
                            Sign In to View Rankings
                        </Link>
                        <Link
                            href={seriesBackUrl}
                            className="w-full py-2.5 px-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all text-center block"
                        >
                            Back to Test Series
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Check submitted attempt on server
    const userSubmittedAttempt = await prisma.examAttempt.findFirst({
        where: {
            testId,
            userId: session.user.id,
            status: "SUBMITTED",
        },
        select: { id: true },
    });

    // 3. Canonical access control check
    const accessDecision = canViewLeaderboard(
        session.user as any,
        test,
        Boolean(userSubmittedAttempt)
    );

    if (!accessDecision.allowed) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-[#0a1628] rounded-3xl p-8 border border-gray-200 dark:border-gray-800 text-center shadow-xl space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        {accessDecision.isLiveActive ? (
                            <Clock className="w-8 h-8" />
                        ) : (
                            <Lock className="w-8 h-8" />
                        )}
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                        {accessDecision.isLiveActive
                            ? "Rankings Locked Until Live Test Concludes"
                            : "Rankings Locked"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {accessDecision.reason}
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                        {!userSubmittedAttempt && !accessDecision.isLiveActive && (
                            <Link
                                href={`/test-series/${test.series?.slug || test.seriesId || test.id}/declaration?testId=${encodeURIComponent(test.id)}`}
                                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0096e6] text-white font-bold text-sm shadow-md hover:shadow-[#00A8FF]/25 transition-all text-center block"
                            >
                                Attempt Test to Unlock
                            </Link>
                        )}
                        <Link
                            href={seriesBackUrl}
                            className="w-full py-2.5 px-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all text-center block"
                        >
                            Back to Test Series
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // 4. Access authorized: render interactive client component
    return (
        <LeaderboardClient
            testId={testId}
            initialTestTitle={test.title}
            seriesBackUrl={seriesBackUrl}
        />
    );
}
