import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Lock, Clock, BookOpen, XCircle, ArrowLeft } from "lucide-react";
import { canViewSolutions } from "@/lib/exam/access-control";
import { sanitizeReturnPath } from "@/lib/utils/return-path";
import { SolutionsClient } from "./SolutionsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SolutionsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { id: seriesId } = await params;
    const sParams = await searchParams;
    const attemptId = typeof sParams?.attemptId === "string" ? sParams.attemptId : undefined;
    const testId = typeof sParams?.testId === "string" ? sParams.testId : undefined;
    const rawReturnPath = typeof sParams?.returnPath === "string" ? sParams.returnPath : undefined;

    const defaultBackUrl =
        seriesId === "current-affairs-system-series"
            ? "/current-affairs-quizzes"
            : seriesId === "pyq-system-series"
            ? "/pyqs"
            : `/test-series/${seriesId}`;
    const safeReturnPath = sanitizeReturnPath(rawReturnPath, defaultBackUrl);

    const session = await auth();

    // 1. Unauthenticated check on server
    if (!session?.user?.id) {
        return (
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
                <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Sign In to View Solutions</h2>
                    <p className="text-xs text-gray-600 leading-relaxed">
                        Please sign in with your account to view detailed question explanations, correct answers, and paper solutions.
                    </p>
                    <div className="pt-2 flex flex-col gap-2">
                        <Link
                            href={`/auth/login?callbackUrl=${encodeURIComponent(
                                `/test-series/${seriesId}/solutions${attemptId ? `?attemptId=${attemptId}` : testId ? `?testId=${testId}` : ""}`
                            )}`}
                            className="w-full min-h-[44px] py-3 px-6 rounded-xl bg-gradient-to-r from-[#00A8FF] to-[#0096e6] text-white font-bold text-sm shadow-md hover:shadow-[#00A8FF]/25 transition-all text-center block"
                        >
                            Sign In to View Solutions
                        </Link>
                        <Link
                            href={safeReturnPath}
                            className="w-full py-2.5 px-6 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all text-center block"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Student attempt resolution
    if (attemptId) {
        const attempt = await prisma.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                test: {
                    select: {
                        id: true,
                        title: true,
                        isLive: true,
                        liveStartAt: true,
                        liveEndAt: true,
                        createdById: true,
                    },
                },
            },
        });

        if (!attempt) {
            return (
                <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
                    <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-7 h-7" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Attempt Not Found</h2>
                        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                            The specified attempt record could not be found.
                        </p>
                        <Link
                            href={safeReturnPath}
                            className="inline-block min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors text-center"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            );
        }

        const accessDecision = canViewSolutions(session.user as any, attempt.test, attempt);

        if (!accessDecision.allowed) {
            return (
                <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
                    <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                            {accessDecision.isLiveActive ? (
                                <Clock className="w-7 h-7" />
                            ) : (
                                <Lock className="w-7 h-7" />
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {accessDecision.isLiveActive
                                ? "Solutions Locked Until Live Test Concludes"
                                : "Solutions Access Locked"}
                        </h2>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {accessDecision.reason}
                        </p>
                        <div className="pt-2">
                            <Link
                                href={safeReturnPath}
                                className="inline-block min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors text-center"
                            >
                                Back
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <SolutionsClient
                seriesId={seriesId}
                attemptId={attemptId}
                rawReturnPath={rawReturnPath}
            />
        );
    }

    // 3. Teacher/Admin faculty preview by testId
    if (testId) {
        const test = await prisma.examTest.findUnique({
            where: { id: testId },
            select: {
                id: true,
                title: true,
                isLive: true,
                liveStartAt: true,
                liveEndAt: true,
                createdById: true,
            },
        });

        if (!test) {
            return (
                <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
                    <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-7 h-7" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Test Not Found</h2>
                        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                            The requested test could not be found.
                        </p>
                        <Link
                            href={safeReturnPath}
                            className="inline-block min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors text-center"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            );
        }

        const accessDecision = canViewSolutions(session.user as any, test, null);

        if (!accessDecision.allowed) {
            return (
                <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
                    <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                            <Lock className="w-7 h-7" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Solutions Access Locked</h2>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {accessDecision.reason}
                        </p>
                        <div className="pt-2 flex flex-col gap-2">
                            <Link
                                href={`/test-series/${seriesId}/declaration?testId=${encodeURIComponent(test.id)}`}
                                className="w-full min-h-[44px] py-2.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors text-center block"
                            >
                                Attempt Test to Unlock
                            </Link>
                            <Link
                                href={safeReturnPath}
                                className="w-full py-2.5 px-6 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all text-center block"
                            >
                                Back
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <SolutionsClient
                seriesId={seriesId}
                testId={testId}
                rawReturnPath={rawReturnPath}
            />
        );
    }

    // 4. Neither attemptId nor testId provided
    return (
        <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-gray-50 p-6" style={{ fontFamily: "sans-serif" }}>
            <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Attempt Required</h2>
                <p className="text-xs text-gray-600 leading-relaxed">
                    Solutions and answer keys are only accessible after an attempt has been completed and submitted.
                </p>
                <div className="pt-2">
                    <Link
                        href={safeReturnPath}
                        className="inline-block min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors text-center"
                    >
                        Back
                    </Link>
                </div>
            </div>
        </div>
    );
}
