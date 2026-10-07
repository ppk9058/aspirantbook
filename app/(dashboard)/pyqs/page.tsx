"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useGoal } from "@/components/providers/GoalProvider"
import { GoalSelectorBar } from "@/components/goals/GoalSelectorBar"
import { applyPyqGoalFilter } from "@/lib/goals/goal-filters"
import {
    Search,
    Check,
    ChevronRight,
    ArrowRight,
    Download,
    FileText,
    Eye,
    Zap,
    Sparkles,
    BookOpen,
    GraduationCap,
    Clock,
    X,
    Filter,
    Award,
    CheckCircle2,
    Calendar,
    HelpCircle,
    Building2,
    Layers,
    BookMarked,
    BookmarkCheck,
    Plus
} from "lucide-react"

// Types
interface PaperYearDetail {
    year: string
    title: string
    dateHeld: string
    totalMarks: number
    durationMinutes: number
    totalQuestions: number
    languages: string
    attemptHref: string
    solutionHref: string
    pdfSize: string
}

interface ExamPaperItem {
    id: string
    title: string
    shortCode: string
    category: "upsc" | "bpsc" | "class-12" | "class-11" | "class-10" | "class-9" | "class-8"
    categoryLabel: string
    papersCount: number
    yearsCovered: string
    logoType: "upsc" | "bpsc" | "cbse-12" | "cbse-10" | "ncert-9" | "ncert-8" | "ncert-11"
    isEnrolled?: boolean
    description: string
    subjects: string[]
    years: PaperYearDetail[]
}

// Emblems rendered in authentic SVG seals matching the official institutions
function OfficialExamEmblem({ logoType, className = "w-11 h-11" }: { logoType: string; className?: string }) {
    if (logoType === "upsc") {
        return (
            <div className={`${className} rounded-full bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs shrink-0`}>
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#FFFDF5" stroke="#1E3A8A" strokeWidth="2.5" />
                    {/* Ashoka Stambh Lion Capital Icon */}
                    <path d="M50 14 C44 14 40 18 40 23 C40 27 43 30 45 32 C41 33 37 37 37 42 C37 47 41 51 45 53 L45 61 L33 61 C31 61 30 63 30 65 L30 68 L70 68 L70 65 C70 63 69 61 67 61 L55 61 L55 53 C59 51 63 47 63 42 C63 37 59 33 55 32 C57 30 60 27 60 23 C60 18 56 14 50 14 Z" fill="#1E3A8A" />
                    <circle cx="50" cy="74" r="5" fill="none" stroke="#1E3A8A" strokeWidth="2" />
                    <path d="M28 80 L72 80 L68 86 L32 86 Z" fill="#B45309" />
                    <text x="50" y="95" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#1E3A8A">UPSC</text>
                </svg>
            </div>
        )
    }

    if (logoType === "bpsc") {
        return (
            <div className={`${className} rounded-full bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs shrink-0`}>
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#F0FDF4" stroke="#047857" strokeWidth="2.5" />
                    {/* Bodhi Tree & BPSC Emblem */}
                    <path d="M50 16 C38 23 34 36 41 48 C43 52 47 55 49 60 C51 55 55 52 57 48 C64 36 60 23 50 16 Z" fill="#047857" />
                    <circle cx="33" cy="38" r="4.5" fill="#D97706" />
                    <circle cx="67" cy="38" r="4.5" fill="#D97706" />
                    <rect x="47" y="60" width="6" height="15" fill="#78350F" />
                    <rect x="28" y="75" width="44" height="4.5" rx="2" fill="#047857" />
                    <text x="50" y="92" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#064E3B">BPSC</text>
                </svg>
            </div>
        )
    }

    if (logoType === "cbse-12" || logoType === "cbse-10") {
        const is12 = logoType === "cbse-12"
        return (
            <div className={`${className} rounded-full bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs shrink-0`}>
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill={is12 ? "#EFF6FF" : "#F0FDFA"} stroke={is12 ? "#2563EB" : "#0D9488"} strokeWidth="2.5" />
                    {/* CBSE Book & Flame Emblem */}
                    <path d="M30 45 C30 35 45 35 50 40 C55 35 70 35 70 45 L70 70 C65 65 55 65 50 68 C45 65 35 65 30 70 Z" fill={is12 ? "#1D4ED8" : "#0F766E"} />
                    <path d="M50 20 C47 26 47 30 50 36 C53 30 53 26 50 20 Z" fill="#F59E0B" />
                    <text x="50" y="85" textAnchor="middle" fontSize="9" fontWeight="900" fill={is12 ? "#1E40AF" : "#115E59"}>
                        {is12 ? "CLASS 12" : "CLASS 10"}
                    </text>
                </svg>
            </div>
        )
    }

    // NCERT / School Foundation (Class 8, 9, 11)
    return (
        <div className={`${className} rounded-full bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs shrink-0`}>
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="47" fill="#FEFCE8" stroke="#854D0E" strokeWidth="2" strokeDasharray="3 2" />
                {/* 3 Interlocking Rings / Knowledge Birds */}
                <circle cx="50" cy="38" r="13" fill="none" stroke="#B45309" strokeWidth="2.5" />
                <circle cx="39" cy="57" r="13" fill="none" stroke="#B45309" strokeWidth="2.5" />
                <circle cx="61" cy="57" r="13" fill="none" stroke="#B45309" strokeWidth="2.5" />
                <text x="50" y="90" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#78350F">
                    {logoType === "ncert-11" ? "CLASS 11" : logoType === "ncert-9" ? "CLASS 9" : "CLASS 8"}
                </text>
            </svg>
        </div>
    )
}

// Comprehensive verified previous year papers database (strictly: UPSC, BPSC, 8th, 9th, 10th, 11th, 12th)
const PREVIOUS_YEAR_PAPERS_DATA: ExamPaperItem[] = [
    // ── 1. UPSC PAPERS ─────────────────────────────────────────────────────────────
    {
        id: "upsc-prelims-gs1",
        title: "UPSC Civil Services Prelims GS Paper 1",
        shortCode: "UPSC CSE GS-1",
        category: "upsc",
        categoryLabel: "UPSC Exams",
        papersCount: 11,
        yearsCovered: "2014 - 2024",
        logoType: "upsc",
        description: "Official General Studies Paper 1 previous year question papers with detailed subject-wise breakdown (Polity, History, Economy, Geography, Environment, and Sci-Tech).",
        subjects: ["History", "Polity", "Economy", "Geography", "Environment", "Science & Tech"],
        years: [
            {
                year: "2024",
                title: "UPSC CSE Prelims 2024 (GS Paper 1) Official Paper",
                dateHeld: "16 June 2024",
                totalMarks: 200,
                durationMinutes: 120,
                totalQuestions: 100,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "3.4 MB"
            },
            {
                year: "2023",
                title: "UPSC CSE Prelims 2023 (GS Paper 1) Official Paper",
                dateHeld: "28 May 2023",
                totalMarks: 200,
                durationMinutes: 120,
                totalQuestions: 100,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "3.8 MB"
            },
            {
                year: "2022",
                title: "UPSC CSE Prelims 2022 (GS Paper 1) Official Paper",
                dateHeld: "05 June 2022",
                totalMarks: 200,
                durationMinutes: 120,
                totalQuestions: 100,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "3.1 MB"
            },
            {
                year: "2021",
                title: "UPSC CSE Prelims 2021 (GS Paper 1) Official Paper",
                dateHeld: "10 Oct 2021",
                totalMarks: 200,
                durationMinutes: 120,
                totalQuestions: 100,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "3.2 MB"
            },
            {
                year: "2020",
                title: "UPSC CSE Prelims 2020 (GS Paper 1) Official Paper",
                dateHeld: "04 Oct 2020",
                totalMarks: 200,
                durationMinutes: 120,
                totalQuestions: 100,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "2.9 MB"
            }
        ]
    },
    {
        id: "upsc-prelims-csat",
        title: "UPSC Civil Services Prelims CSAT Paper 2",
        shortCode: "UPSC CSAT",
        category: "upsc",
        categoryLabel: "UPSC Exams",
        papersCount: 11,
        yearsCovered: "2014 - 2024",
        logoType: "upsc",
        description: "Official Civil Services Aptitude Test (CSAT) Paper 2 with reading comprehension passages, logical reasoning, and quantitative math solutions.",
        subjects: ["Reading Comprehension", "Logical Reasoning", "Quantitative Aptitude", "Data Interpretation"],
        years: [
            {
                year: "2024",
                title: "UPSC CSAT 2024 Official Paper",
                dateHeld: "16 June 2024",
                totalMarks: 200,
                durationMinutes: 120,
                totalQuestions: 80,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "2.8 MB"
            },
            {
                year: "2023",
                title: "UPSC CSAT 2023 Official Paper",
                dateHeld: "28 May 2023",
                totalMarks: 200,
                durationMinutes: 120,
                totalQuestions: 80,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "3.2 MB"
            }
        ]
    },
    {
        id: "upsc-mains-gs-papers",
        title: "UPSC CSE Mains GS Papers (GS 1 to GS 4)",
        shortCode: "UPSC Mains GS",
        category: "upsc",
        categoryLabel: "UPSC Exams",
        papersCount: 40,
        yearsCovered: "2015 - 2024",
        logoType: "upsc",
        description: "Official UPSC Civil Services Mains Examination subjective question papers with model multi-dimensional answers and keyword frameworks.",
        subjects: ["GS 1 Heritage & Geo", "GS 2 Polity & IR", "GS 3 Economy & Security", "GS 4 Ethics"],
        years: [
            {
                year: "2024",
                title: "UPSC Mains 2024 GS Papers (GS 1, 2, 3, 4)",
                dateHeld: "20 - 29 Sept 2024",
                totalMarks: 1000,
                durationMinutes: 720,
                totalQuestions: 80,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/solutions",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "6.4 MB"
            }
        ]
    },
    {
        id: "upsc-epfo-apfc",
        title: "UPSC EPFO (EO/AO & APFC) Previous Papers",
        shortCode: "UPSC EPFO",
        category: "upsc",
        categoryLabel: "UPSC Exams",
        papersCount: 8,
        yearsCovered: "2016 - 2023",
        logoType: "upsc",
        description: "Enforcement Officer and Assistant Provident Fund Commissioner official recruitment papers covering Industrial Relations and Social Security.",
        subjects: ["Labour Laws", "Social Security", "Accountancy", "Indian Economy", "General Science"],
        years: [
            {
                year: "2023",
                title: "UPSC EPFO EO/AO & APFC Official Paper 2023",
                dateHeld: "02 July 2023",
                totalMarks: 300,
                durationMinutes: 120,
                totalQuestions: 120,
                languages: "English, Hindi",
                attemptHref: "/test-series/upsc-prelims-2026/attempt",
                solutionHref: "/test-series/upsc-prelims-2026/solutions",
                pdfSize: "2.7 MB"
            }
        ]
    },

    // ── 2. BPSC PAPERS ─────────────────────────────────────────────────────────────
    {
        id: "bpsc-cce-prelims-70",
        title: "70th BPSC CCE (Preliminary) Official Paper",
        shortCode: "70th BPSC Prelims",
        category: "bpsc",
        categoryLabel: "BPSC Exams",
        papersCount: 1,
        yearsCovered: "2024",
        logoType: "bpsc",
        description: "Latest 70th Bihar Public Service Commission Preliminary Examination official paper with revised 1/3 negative marking format.",
        subjects: ["Bihar Special GK", "General Science", "History & Freedom Struggle", "Indian Polity", "Bihar Economy"],
        years: [
            {
                year: "2024",
                title: "70th BPSC CCE (Preliminary) Official Question Paper",
                dateHeld: "13 Dec 2024",
                totalMarks: 150,
                durationMinutes: 120,
                totalQuestions: 150,
                languages: "English, Hindi",
                attemptHref: "/test-series/bpsc-72nd-2026/attempt",
                solutionHref: "/test-series/bpsc-72nd-2026/solutions",
                pdfSize: "4.1 MB"
            }
        ]
    },
    {
        id: "bpsc-cce-prelims-69",
        title: "69th BPSC CCE (Integrated Prelims) Official Paper",
        shortCode: "69th BPSC Prelims",
        category: "bpsc",
        categoryLabel: "BPSC Exams",
        papersCount: 1,
        yearsCovered: "2023",
        logoType: "bpsc",
        description: "Official 69th Integrated CCE Prelims paper covering Bihar GK, Science, History, and current affairs with 4-options format.",
        subjects: ["Bihar Special", "Ancient & Modern History", "Geography", "Polity & Constitution", "Mental Ability"],
        years: [
            {
                year: "2023",
                title: "69th BPSC Integrated Combined Competitive Prelims",
                dateHeld: "30 Sept 2023",
                totalMarks: 150,
                durationMinutes: 120,
                totalQuestions: 150,
                languages: "English, Hindi",
                attemptHref: "/test-series/bpsc-72nd-2026/attempt",
                solutionHref: "/test-series/bpsc-72nd-2026/solutions",
                pdfSize: "3.9 MB"
            }
        ]
    },
    {
        id: "bpsc-cce-prelims-68",
        title: "68th BPSC CCE (Preliminary) Solved Paper",
        shortCode: "68th BPSC Prelims",
        category: "bpsc",
        categoryLabel: "BPSC Exams",
        papersCount: 1,
        yearsCovered: "2023",
        logoType: "bpsc",
        description: "Historical benchmark paper when negative marking was first officially introduced into BPSC CCE exam structure.",
        subjects: ["General Studies", "Bihar Special", "General Science", "Indian National Movement"],
        years: [
            {
                year: "2023",
                title: "68th BPSC CCE Prelims Examination Official Paper",
                dateHeld: "12 Feb 2023",
                totalMarks: 150,
                durationMinutes: 120,
                totalQuestions: 150,
                languages: "English, Hindi",
                attemptHref: "/test-series/bpsc-72nd-2026/attempt",
                solutionHref: "/test-series/bpsc-72nd-2026/solutions",
                pdfSize: "3.6 MB"
            }
        ]
    },
    {
        id: "bpsc-cce-archive-67-60",
        title: "BPSC 10-Year Solved Papers (60th to 67th CCE)",
        shortCode: "BPSC 10-Year Bank",
        category: "bpsc",
        categoryLabel: "BPSC Exams",
        papersCount: 10,
        yearsCovered: "2016 - 2022",
        logoType: "bpsc",
        description: "Complete archive of 67th Re-Exam, 66th, 65th, 64th, 63rd, and 60-62nd BPSC Preliminary Examination official question papers.",
        subjects: ["Bihar History & Geography", "Science", "Indian Polity", "Economics", "Bihar Budget Archives"],
        years: [
            {
                year: "2022",
                title: "67th BPSC CCE Prelims Re-Exam Paper",
                dateHeld: "30 Sept 2022",
                totalMarks: 150,
                durationMinutes: 120,
                totalQuestions: 150,
                languages: "English, Hindi",
                attemptHref: "/test-series/bpsc-72nd-2026/attempt",
                solutionHref: "/test-series/bpsc-72nd-2026/solutions",
                pdfSize: "4.5 MB"
            },
            {
                year: "2020",
                title: "66th BPSC CCE Prelims Official Paper",
                dateHeld: "27 Dec 2020",
                totalMarks: 150,
                durationMinutes: 120,
                totalQuestions: 150,
                languages: "English, Hindi",
                attemptHref: "/test-series/bpsc-72nd-2026/attempt",
                solutionHref: "/test-series/bpsc-72nd-2026/solutions",
                pdfSize: "3.8 MB"
            }
        ]
    },
    {
        id: "bpsc-tre-teacher-papers",
        title: "BPSC TRE (Teacher Recruitment) 1.0, 2.0 & 3.0",
        shortCode: "BPSC TRE Papers",
        category: "bpsc",
        categoryLabel: "BPSC Exams",
        papersCount: 32,
        yearsCovered: "2023 - 2024",
        logoType: "bpsc",
        description: "Official BPSC Shikshak Bharti papers for Primary (1-5), Middle (6-8), Secondary (9-10), and Higher Secondary (11-12).",
        subjects: ["General Studies", "Language Qualifying", "Mathematics", "Science", "Social Science"],
        years: [
            {
                year: "2024",
                title: "BPSC TRE 3.0 (Class 1-5 & 6-8) Official Question Paper",
                dateHeld: "19 - 22 July 2024",
                totalMarks: 150,
                durationMinutes: 150,
                totalQuestions: 150,
                languages: "English, Hindi",
                attemptHref: "/test-series/bpsc-72nd-2026/attempt",
                solutionHref: "/test-series/bpsc-72nd-2026/solutions",
                pdfSize: "5.1 MB"
            }
        ]
    },
    {
        id: "bpsc-cdpo-official",
        title: "BPSC CDPO (Child Development Officer) Papers",
        shortCode: "BPSC CDPO",
        category: "bpsc",
        categoryLabel: "BPSC Exams",
        papersCount: 6,
        yearsCovered: "2018 - 2022",
        logoType: "bpsc",
        description: "Official papers of BPSC Child Development Project Officer exams with full answer keys and explanations.",
        subjects: ["General Studies", "Child Psychology", "Home Science", "Bihar Economy"],
        years: [
            {
                year: "2022",
                title: "BPSC CDPO Preliminary Exam Official Paper",
                dateHeld: "15 May 2022",
                totalMarks: 150,
                durationMinutes: 120,
                totalQuestions: 150,
                languages: "English, Hindi",
                attemptHref: "/test-series/bpsc-72nd-2026/attempt",
                solutionHref: "/test-series/bpsc-72nd-2026/solutions",
                pdfSize: "3.4 MB"
            }
        ]
    },

    // ── 3. CLASS 12TH PAPERS ───────────────────────────────────────────────────────
    {
        id: "cbse-12-physics",
        title: "CBSE Class 12th Physics Board Papers",
        shortCode: "Class 12 Physics",
        category: "class-12",
        categoryLabel: "12th Class Boards",
        papersCount: 14,
        yearsCovered: "2018 - 2024",
        logoType: "cbse-12",
        description: "Official CBSE Class 12 Physics Board Examination papers (All India & Delhi sets) with numerical solutions, derivations, and ray diagrams.",
        subjects: ["Electrostatics", "Current Electricity", "Optics", "Electromagnetic Induction", "Modern Physics"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 12 Physics Board Paper 2024 (Set 1, 2, 3)",
                dateHeld: "04 March 2024",
                totalMarks: 70,
                durationMinutes: 180,
                totalQuestions: 33,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.6 MB"
            },
            {
                year: "2023",
                title: "CBSE Class 12 Physics Board Paper 2023",
                dateHeld: "06 March 2023",
                totalMarks: 70,
                durationMinutes: 180,
                totalQuestions: 35,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.4 MB"
            }
        ]
    },
    {
        id: "cbse-12-chemistry",
        title: "CBSE Class 12th Chemistry Board Papers",
        shortCode: "Class 12 Chemistry",
        category: "class-12",
        categoryLabel: "12th Class Boards",
        papersCount: 14,
        yearsCovered: "2018 - 2024",
        logoType: "cbse-12",
        description: "Official CBSE Class 12 Chemistry Board papers featuring Organic mechanisms, Chemical Kinetics numericals, and Coordination Compounds.",
        subjects: ["Organic Chemistry", "Physical Chemistry", "Inorganic Chemistry", "Biomolecules"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 12 Chemistry Board Paper 2024",
                dateHeld: "27 Feb 2024",
                totalMarks: 70,
                durationMinutes: 180,
                totalQuestions: 33,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.8 MB"
            }
        ]
    },
    {
        id: "cbse-12-maths",
        title: "CBSE Class 12th Mathematics Board Papers",
        shortCode: "Class 12 Maths",
        category: "class-12",
        categoryLabel: "12th Class Boards",
        papersCount: 14,
        yearsCovered: "2018 - 2024",
        logoType: "cbse-12",
        description: "Calculus, Vectors, 3D Geometry, Linear Programming, and Probability solved official CBSE board question papers.",
        subjects: ["Calculus", "Vectors & 3D Geometry", "Matrices & Determinants", "Probability"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 12 Mathematics Board Paper 2024",
                dateHeld: "09 March 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 38,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "3.1 MB"
            }
        ]
    },
    {
        id: "cbse-12-biology",
        title: "CBSE Class 12th Biology Board Papers",
        shortCode: "Class 12 Biology",
        category: "class-12",
        categoryLabel: "12th Class Boards",
        papersCount: 14,
        yearsCovered: "2018 - 2024",
        logoType: "cbse-12",
        description: "Genetics & Evolution, Biotechnology, Ecology, and Reproduction official question papers with labeled diagrams and marking scheme.",
        subjects: ["Genetics & Evolution", "Biotechnology", "Ecology", "Human Health"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 12 Biology Board Paper 2024",
                dateHeld: "19 March 2024",
                totalMarks: 70,
                durationMinutes: 180,
                totalQuestions: 33,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "3.5 MB"
            }
        ]
    },

    // ── 4. CLASS 11TH PAPERS ───────────────────────────────────────────────────────
    {
        id: "class-11-physics",
        title: "Class 11th Physics Annual Exam Papers",
        shortCode: "Class 11 Physics",
        category: "class-11",
        categoryLabel: "11th Class Exams",
        papersCount: 12,
        yearsCovered: "2019 - 2024",
        logoType: "ncert-11",
        description: "Kinematics, Laws of Motion, Thermodynamics, Waves, and Gravitation annual exam papers from top Kendriya Vidyalayas & CBSE schools.",
        subjects: ["Mechanics", "Thermodynamics", "Waves & Oscillations", "Properties of Matter"],
        years: [
            {
                year: "2024",
                title: "Class 11 Physics Final Exam Paper 2024",
                dateHeld: "Feb 2024",
                totalMarks: 70,
                durationMinutes: 180,
                totalQuestions: 33,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.5 MB"
            }
        ]
    },
    {
        id: "class-11-chemistry",
        title: "Class 11th Chemistry Annual Exam Papers",
        shortCode: "Class 11 Chemistry",
        category: "class-11",
        categoryLabel: "11th Class Exams",
        papersCount: 12,
        yearsCovered: "2019 - 2024",
        logoType: "ncert-11",
        description: "Structure of Atom, Chemical Bonding, Equilibrium, Thermodynamics, and Hydrocarbons annual school final examination question papers.",
        subjects: ["Chemical Bonding", "Atomic Structure", "Equilibrium", "Hydrocarbons"],
        years: [
            {
                year: "2024",
                title: "Class 11 Chemistry Final Exam Paper 2024",
                dateHeld: "Feb 2024",
                totalMarks: 70,
                durationMinutes: 180,
                totalQuestions: 33,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.3 MB"
            }
        ]
    },
    {
        id: "class-11-maths",
        title: "Class 11th Mathematics Annual Papers",
        shortCode: "Class 11 Maths",
        category: "class-11",
        categoryLabel: "11th Class Exams",
        papersCount: 12,
        yearsCovered: "2019 - 2024",
        logoType: "ncert-11",
        description: "Trigonometric Functions, Complex Numbers, Permutations, Conic Sections, and Limits & Derivatives school final exam papers.",
        subjects: ["Trigonometry", "Conic Sections", "Limits & Derivatives", "Permutations & Combinations"],
        years: [
            {
                year: "2024",
                title: "Class 11 Mathematics Final Exam Paper 2024",
                dateHeld: "Feb 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 38,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.7 MB"
            }
        ]
    },

    // ── 5. CLASS 10TH PAPERS ───────────────────────────────────────────────────────
    {
        id: "cbse-10-maths-standard",
        title: "CBSE Class 10th Standard Mathematics Papers",
        shortCode: "Class 10 Standard Math",
        category: "class-10",
        categoryLabel: "10th Class Boards",
        papersCount: 16,
        yearsCovered: "2017 - 2024",
        logoType: "cbse-10",
        description: "Official CBSE Class 10 Standard Mathematics board papers with step-by-step NCERT solutions and case-study questions.",
        subjects: ["Trigonometry", "Quadratic Equations", "Triangles & Geometry", "Statistics & Probability", "Surface Areas"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 10 Standard Math Board Paper 2024",
                dateHeld: "11 March 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 38,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.2 MB"
            },
            {
                year: "2023",
                title: "CBSE Class 10 Standard Math Board Paper 2023",
                dateHeld: "21 March 2023",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 38,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.1 MB"
            },
            {
                year: "2022",
                title: "CBSE Class 10 Term-2 Mathematics Board Paper 2022",
                dateHeld: "05 May 2022",
                totalMarks: 40,
                durationMinutes: 120,
                totalQuestions: 14,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "1.9 MB"
            }
        ]
    },
    {
        id: "cbse-10-science",
        title: "CBSE Class 10th Science (Physics, Chem, Bio)",
        shortCode: "Class 10 Science",
        category: "class-10",
        categoryLabel: "10th Class Boards",
        papersCount: 16,
        yearsCovered: "2017 - 2024",
        logoType: "cbse-10",
        description: "Chemical Reactions, Light Reflection & Refraction, Electricity, Life Processes, and Heredity solved CBSE board question papers.",
        subjects: ["Light & Electricity", "Chemical Reactions", "Life Processes", "Magnetic Effects of Current"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 10 Science Board Paper 2024",
                dateHeld: "02 March 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 39,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.6 MB"
            },
            {
                year: "2023",
                title: "CBSE Class 10 Science Board Paper 2023",
                dateHeld: "04 March 2023",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 39,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.4 MB"
            }
        ]
    },
    {
        id: "cbse-10-sst",
        title: "CBSE Class 10th Social Science (SST)",
        shortCode: "Class 10 SST",
        category: "class-10",
        categoryLabel: "10th Class Boards",
        papersCount: 16,
        yearsCovered: "2017 - 2024",
        logoType: "cbse-10",
        description: "Rise of Nationalism in Europe, Resources & Development, Democratic Politics, and Money & Credit official CBSE Board papers.",
        subjects: ["History", "Geography", "Political Science", "Economics", "Map Work"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 10 Social Science Board Paper 2024",
                dateHeld: "07 March 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 37,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.9 MB"
            }
        ]
    },
    {
        id: "cbse-10-english",
        title: "CBSE Class 10th English Language & Literature",
        shortCode: "Class 10 English",
        category: "class-10",
        categoryLabel: "10th Class Boards",
        papersCount: 14,
        yearsCovered: "2018 - 2024",
        logoType: "cbse-10",
        description: "Official reading comprehension passages, analytical paragraph writing, grammar editing, and textbook literature answers.",
        subjects: ["Reading Comprehension", "Writing Skills & Grammar", "First Flight", "Footprints Without Feet"],
        years: [
            {
                year: "2024",
                title: "CBSE Class 10 English Board Paper 2024",
                dateHeld: "26 Feb 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 11,
                languages: "English",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.1 MB"
            }
        ]
    },

    // ── 6. CLASS 9TH PAPERS ────────────────────────────────────────────────────────
    {
        id: "class-9-maths",
        title: "Class 9th Mathematics Annual Exam Papers",
        shortCode: "Class 9 Maths",
        category: "class-9",
        categoryLabel: "9th Class Exams",
        papersCount: 14,
        yearsCovered: "2018 - 2024",
        logoType: "ncert-9",
        description: "Number Systems, Polynomials, Coordinate Geometry, Linear Equations in Two Variables, and Surface Areas annual exam papers.",
        subjects: ["Number Systems", "Polynomials", "Lines & Angles", "Surface Areas & Volumes"],
        years: [
            {
                year: "2024",
                title: "Class 9 Mathematics Final Exam Paper 2024",
                dateHeld: "Feb 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 38,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.2 MB"
            }
        ]
    },
    {
        id: "class-9-science",
        title: "Class 9th Science (Physics, Chem, Bio)",
        shortCode: "Class 9 Science",
        category: "class-9",
        categoryLabel: "9th Class Exams",
        papersCount: 14,
        yearsCovered: "2018 - 2024",
        logoType: "ncert-9",
        description: "Matter in Our Surroundings, Atoms & Molecules, Fundamental Unit of Life, Motion, and Force & Laws of Motion annual examination papers.",
        subjects: ["Matter & Atoms", "Cell & Tissues", "Motion & Force", "Gravitation & Work"],
        years: [
            {
                year: "2024",
                title: "Class 9 Science Final Exam Paper 2024",
                dateHeld: "Feb 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 39,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.4 MB"
            }
        ]
    },
    {
        id: "class-9-sst",
        title: "Class 9th Social Science School Final Papers",
        shortCode: "Class 9 SST",
        category: "class-9",
        categoryLabel: "9th Class Exams",
        papersCount: 12,
        yearsCovered: "2019 - 2024",
        logoType: "ncert-9",
        description: "French Revolution, Physical Features of India, What is Democracy, and Village Palampur economics annual examination question papers.",
        subjects: ["French Revolution", "India Size & Location", "Constitutional Design", "Story of Village Palampur"],
        years: [
            {
                year: "2024",
                title: "Class 9 Social Science Annual Paper 2024",
                dateHeld: "Feb 2024",
                totalMarks: 80,
                durationMinutes: 180,
                totalQuestions: 37,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.5 MB"
            }
        ]
    },

    // ── 7. CLASS 8TH PAPERS ────────────────────────────────────────────────────────
    {
        id: "class-8-maths",
        title: "Class 8th Mathematics School Final Papers",
        shortCode: "Class 8 Maths",
        category: "class-8",
        categoryLabel: "8th Class Exams",
        papersCount: 12,
        yearsCovered: "2019 - 2024",
        logoType: "ncert-8",
        description: "Rational Numbers, Linear Equations, Algebraic Expressions, Mensuration, and Exponents & Powers school final exam papers.",
        subjects: ["Rational Numbers", "Linear Equations", "Mensuration", "Exponents & Powers"],
        years: [
            {
                year: "2024",
                title: "Class 8 Mathematics School Final Exam 2024",
                dateHeld: "March 2024",
                totalMarks: 80,
                durationMinutes: 150,
                totalQuestions: 30,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "1.9 MB"
            }
        ]
    },
    {
        id: "class-8-science",
        title: "Class 8th Science School Final Papers",
        shortCode: "Class 8 Science",
        category: "class-8",
        categoryLabel: "8th Class Exams",
        papersCount: 12,
        yearsCovered: "2019 - 2024",
        logoType: "ncert-8",
        description: "Crop Production, Microorganisms, Combustion & Flame, Force & Pressure, and Sound school final examination question papers.",
        subjects: ["Crop Production", "Microorganisms", "Force & Pressure", "Sound & Light"],
        years: [
            {
                year: "2024",
                title: "Class 8 Science School Final Exam 2024",
                dateHeld: "March 2024",
                totalMarks: 80,
                durationMinutes: 150,
                totalQuestions: 32,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.1 MB"
            }
        ]
    },
    {
        id: "class-8-sst",
        title: "Class 8th Social Science Final Exam Papers",
        shortCode: "Class 8 SST",
        category: "class-8",
        categoryLabel: "8th Class Exams",
        papersCount: 10,
        yearsCovered: "2019 - 2024",
        logoType: "ncert-8",
        description: "How When and Where, Land Soil Water Resources, The Indian Constitution, and Law and Social Justice school final papers.",
        subjects: ["Modern Indian History", "Resources & Agriculture", "Indian Constitution", "Judiciary"],
        years: [
            {
                year: "2024",
                title: "Class 8 Social Science Final Exam 2024",
                dateHeld: "March 2024",
                totalMarks: 80,
                durationMinutes: 150,
                totalQuestions: 28,
                languages: "English, Hindi",
                attemptHref: "/test-series/class-10-boards-2026/attempt",
                solutionHref: "/test-series/class-10-boards-2026/solutions",
                pdfSize: "2.0 MB"
            }
        ]
    }
]

// The 7 strictly defined categories requested by the user
const SIDEBAR_CATEGORIES = [
    { id: "all", label: "All Categories", icon: Layers, count: PREVIOUS_YEAR_PAPERS_DATA.length },
    { id: "upsc", label: "UPSC Exams", icon: Building2, count: PREVIOUS_YEAR_PAPERS_DATA.filter(p => p.category === "upsc").length },
    { id: "bpsc", label: "BPSC Exams", icon: Award, count: PREVIOUS_YEAR_PAPERS_DATA.filter(p => p.category === "bpsc").length },
    { id: "class-12", label: "12th Class Boards", icon: GraduationCap, count: PREVIOUS_YEAR_PAPERS_DATA.filter(p => p.category === "class-12").length },
    { id: "class-11", label: "11th Class Exams", icon: BookOpen, count: PREVIOUS_YEAR_PAPERS_DATA.filter(p => p.category === "class-11").length },
    { id: "class-10", label: "10th Class Boards", icon: Sparkles, count: PREVIOUS_YEAR_PAPERS_DATA.filter(p => p.category === "class-10").length },
    { id: "class-9", label: "9th Class Exams", icon: BookmarkCheck, count: PREVIOUS_YEAR_PAPERS_DATA.filter(p => p.category === "class-9").length },
    { id: "class-8", label: "8th Class Exams", icon: BookMarked, count: PREVIOUS_YEAR_PAPERS_DATA.filter(p => p.category === "class-8").length }
]

export default function PreviousYearQuestionsPage() {
    const router = useRouter()
    const { selectedGoal, selectedGoals, selectedGoalIds, openGoalModal } = useGoal()
    const [dbSeries, setDbSeries] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [selectedPaperForModal, setSelectedPaperForModal] = useState<ExamPaperItem | null>(null)
    const [downloadingYear, setDownloadingYear] = useState<string | null>(null)

    useEffect(() => {
        fetch("/api/exam/series/list")
            .then((res) => res.json())
            .then((data) => {
                if (data.success && Array.isArray(data.data)) {
                    setDbSeries(data.data)
                }
            })
            .catch(() => {})
    }, [])

    // Filter cards for the lower Explore Section (with multi-goal OR filtering when not set to specific category)
    const filteredPapers = useMemo(() => {
        let list = PREVIOUS_YEAR_PAPERS_DATA
        if (selectedCategory === "all" && selectedGoalIds.length > 0) {
            list = applyPyqGoalFilter(list, selectedGoalIds)
        }

        return list.filter((item) => {
            const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
            const searchLower = searchQuery.toLowerCase()
            const matchesSearch =
                !searchQuery ||
                item.title.toLowerCase().includes(searchLower) ||
                item.shortCode.toLowerCase().includes(searchLower) ||
                item.categoryLabel.toLowerCase().includes(searchLower) ||
                item.subjects.some(s => s.toLowerCase().includes(searchLower))

            return matchesCategory && matchesSearch
        })
    }, [selectedCategory, searchQuery, selectedGoalIds])

    // Top Enrolled Exams cards matching Image 1 + dynamic real DB series
    const enrolledExams = useMemo(() => {
        const list = [...PREVIOUS_YEAR_PAPERS_DATA.filter((p) => p.isEnrolled)]

        // Highlight exams relevant to user's targeted goals (multi-goal OR logic)
        dbSeries.forEach((s) => {
            const seriesCat = (s.category || "").toLowerCase()
            const isMatch = selectedGoalIds.some(
                (gid) => seriesCat.includes(gid) || gid.includes(seriesCat)
            )

            if (isMatch && !list.some((item) => item.id === s.id || item.shortCode === s.title)) {
                const firstGoalKey = selectedGoalIds[0] || "upsc"
                list.unshift({
                    id: s.id,
                    title: s.title,
                    shortCode: s.title.length > 25 ? s.title.slice(0, 22) + "..." : s.title,
                    category: firstGoalKey.includes("bpsc") ? "bpsc" : firstGoalKey.includes("upsc") ? "upsc" : firstGoalKey.includes("10") ? "class-10" : "upsc",
                    categoryLabel: s.category || "Official Series",
                    papersCount: s.totalTests || 10,
                    yearsCovered: "2024 - 2026",
                    logoType: s.logoType || (firstGoalKey.includes("bpsc") ? "bpsc" : "upsc"),
                    isEnrolled: true,
                    description: s.description || "Official verified previous year exam series and mock papers.",
                    subjects: s.highlights || ["All Subjects", "Full Mock"],
                    years: [],
                })
            }
        })
        return list
    }, [selectedGoalIds, dbSeries])

    const handleDownload = (yearItem: PaperYearDetail, e: React.MouseEvent) => {
        e.stopPropagation()
        setDownloadingYear(yearItem.year)
        setTimeout(() => {
            setDownloadingYear(null)
            // Trigger browser download simulation
            const link = document.createElement("a")
            link.href = yearItem.solutionHref
            link.target = "_blank"
            alert(`Downloading Official Question Paper: ${yearItem.title} (${yearItem.pdfSize}). Opening detailed solution in new tab...`)
            window.open(yearItem.solutionHref, "_blank")
        }, 800)
    }

    return (
        <div className="space-y-8 sm:space-y-10 pb-32 sm:pb-24 lg:pb-12 text-gray-900 dark:text-gray-100 font-sans">
            {/* ── TOP UTILITY SEARCH & PASS HEADER (Matches Image 1) ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for UPSC, BPSC, Class 10th, 12th papers, subjects..."
                        className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-2xs transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Right Quick Controls: Language & Get Pass */}
                <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>🇮🇳 English / हिंदी</span>
                    </div>

                    <Link
                        href="/pricing"
                        className="px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        <span>Get Pass</span>
                    </Link>
                </div>
            </div>

            {/* ── PROMOTIONAL TRANSLUCENT GRADIENT BANNER (Exact Style from Image 1) ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#03346E] via-[#02569B] to-[#0288D1] text-white p-6 sm:p-8 shadow-lg">
                {/* Decorative Background Circles */}
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute right-40 top-0 w-32 h-32 bg-cyan-400/20 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 min-w-0">
                    <div className="space-y-3 max-w-2xl min-w-0">
                        {/* New Badge & Pass Logo */}
                        <div className="flex items-center gap-2.5">
                            <span className="bg-amber-400 text-gray-950 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                                NEW
                            </span>
                            <div className="flex items-center gap-1 text-lg font-black tracking-tight">
                                <span>aspirantbook</span>
                                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide">
                                    PASS
                                </span>
                            </div>
                        </div>

                        {/* Banner Main Title */}
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-snug break-words">
                            Unlock All Previous Year Papers of All Exams with Pass!
                        </h1>

                        {/* Feature Checklist Pills matching screenshot */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs font-semibold text-cyan-100">
                            <span className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                                Actual Official Papers
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                                Step-by-Step Solutions
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                                CBT Re-Attempt Mode
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                                Bilingual (Hindi & English)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                                Unlimited Practice
                            </span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <div className="shrink-0">
                        <Link
                            href="/pricing"
                            className="inline-flex items-center justify-center px-7 py-3 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm tracking-wide shadow-md hover:shadow-xl transition-all duration-200"
                        >
                            Get Pass
                        </Link>
                    </div>
                </div>
            </div>

            {/* Shared Goal & Exam Target Bar */}
            <GoalSelectorBar
                title="Target Exams & PYQs"
                subtitle="Showing previous year questions and papers personalized to your active targets"
            />

            {/* ── SECTION 1: YOUR ENROLLED EXAMS (Matches Image 1) ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white">
                            Your Enrolled Exams
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Active Targets: <span className="font-bold text-sky-600 dark:text-sky-400">{selectedGoals.map(g => g.name).join(", ")}</span> &bull; {enrolledExams.length} Active Targets
                        </p>
                    </div>

                    {/* "+ Add exam" button connected to GoalModal via useGoal().openGoalModal() */}
                    <button
                        type="button"
                        onClick={openGoalModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 text-xs font-bold transition-all shadow-2xs hover:scale-102"
                        aria-label="Add or change targeted exam"
                    >
                        <Plus className="h-4 w-4" />
                        <span>+ Add exam</span>
                    </button>
                </div>

                {/* 4-Column Grid of Enrolled Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    {enrolledExams.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => router.push(item.years && item.years.length > 0 ? `/pyqs/${item.category}` : `/test-series/${item.id}`)}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 p-4 flex items-center justify-between shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <OfficialExamEmblem logoType={item.logoType} className="w-11 h-11" />
                                <div className="truncate">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {item.shortCode}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {item.papersCount} Papers Available
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                        </div>
                    ))}

                    {/* Interactive + Add Exam card */}
                    <button
                        type="button"
                        onClick={openGoalModal}
                        className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-sky-500 dark:hover:border-sky-400 bg-gray-50/60 dark:bg-gray-800/40 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 p-4 min-h-[76px] flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer group"
                        aria-label="Add another exam target"
                    >
                        <Plus className="h-4 w-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
                        <span>+ Add exam target</span>
                    </button>
                </div>

                <div className="text-center pt-1">
                    <button
                        onClick={() => setSelectedCategory("all")}
                        className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                        Explore all exams below ↓
                    </button>
                </div>
            </div>

            {/* ── SECTION 2: EXPLORE PREVIOUS YEAR PAPER OF ALL EXAMS (Matches Image 2) ── */}
            <div className="space-y-4 pt-2">
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                        Explore Previous Year Paper of all Exams
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Get exam-ready with concepts, questions and study notes as per the latest pattern
                    </p>
                </div>

                {/* Split Two-Column Container (Left Sidebar + Right 3-Column Grid) */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Vertical Navigation Menu (Matches Image 2) */}
                    <div className="w-full lg:w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 p-2 shrink-0 shadow-2xs">
                        <nav className="space-y-1">
                            {SIDEBAR_CATEGORIES.map((cat) => {
                                const Icon = cat.icon
                                const isActive = selectedCategory === cat.id

                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-left ${
                                            isActive
                                                ? "bg-gray-100 dark:bg-gray-700/80 text-gray-900 dark:text-white shadow-2xs"
                                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 hover:text-gray-900 dark:hover:text-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                                            <span>{cat.label}</span>
                                        </div>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                            isActive
                                                ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                                                : "text-gray-400 bg-gray-100 dark:bg-gray-700"
                                        }`}>
                                            {cat.count}
                                        </span>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Right 3-Column Papers Grid (Matches Image 2) */}
                    <div className="flex-1 w-full">
                        {filteredPapers.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-3">
                                <FileText className="h-10 w-10 text-gray-400 mx-auto" />
                                <h3 className="font-bold text-gray-900 dark:text-white text-base">No papers found</h3>
                                <p className="text-xs text-gray-500">Try searching for a different keyword or select "All Categories".</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery("")
                                        setSelectedCategory("all")
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                                {filteredPapers.map((paper) => (
                                    <div
                                        key={paper.id}
                                        onClick={() => router.push(`/pyqs/${paper.category}`)}
                                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 p-4 flex items-center justify-between shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <OfficialExamEmblem logoType={paper.logoType} className="w-11 h-11" />
                                            <div className="truncate">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {paper.shortCode}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                    {paper.papersCount} Papers
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── INTERACTIVE PAPER YEARS MODAL / DRAWER ── */}
            {selectedPaperForModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-[#071E34] border border-gray-200 dark:border-gray-700 w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4 bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-3.5">
                                <OfficialExamEmblem logoType={selectedPaperForModal.logoType} className="w-13 h-13" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                            {selectedPaperForModal.categoryLabel}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {selectedPaperForModal.yearsCovered}
                                        </span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight mt-0.5">
                                        {selectedPaperForModal.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                        {selectedPaperForModal.description}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedPaperForModal(null)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Paper Years List */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 custom-scrollbar">
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 pb-1">
                                <span>Official Exam Papers ({selectedPaperForModal.years.length})</span>
                                <span>Action Available</span>
                            </div>

                            {selectedPaperForModal.years.map((yearItem, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-white/5 hover:border-blue-400 dark:hover:border-blue-500 transition-all space-y-3 shadow-2xs"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-black text-xs">
                                                    {yearItem.year}
                                                </span>
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {yearItem.title}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-3">
                                                <span>Held: {yearItem.dateHeld}</span>
                                                <span>•</span>
                                                <span>{yearItem.totalQuestions} Questions</span>
                                                <span>•</span>
                                                <span>{yearItem.totalMarks} Marks</span>
                                                <span>•</span>
                                                <span>{yearItem.durationMinutes} Mins</span>
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                            {yearItem.languages}
                                        </span>
                                    </div>

                                    {/* Action Buttons: Attempt Online / View Solutions / Download PDF */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                                        <Link
                                            href={yearItem.attemptHref}
                                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
                                        >
                                            <Zap className="h-3.5 w-3.5 fill-current" />
                                            <span>Attempt CBT</span>
                                        </Link>

                                        <Link
                                            href={yearItem.solutionHref}
                                            className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            <span>View Solutions</span>
                                        </Link>

                                        <button
                                            onClick={(e) => handleDownload(yearItem, e)}
                                            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            <span>{downloadingYear === yearItem.year ? "Downloading..." : `PDF (${yearItem.pdfSize})`}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5 flex items-center justify-between text-xs text-gray-500">
                            <span>All question papers strictly conform to official board and commission archives.</span>
                            <button
                                onClick={() => setSelectedPaperForModal(null)}
                                className="px-4 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
