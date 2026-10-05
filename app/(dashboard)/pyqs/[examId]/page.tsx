"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
    Search,
    ChevronRight,
    ArrowLeft,
    Download,
    Share2,
    Check,
    Lock,
    Unlock,
    Play,
    Zap,
    Users,
    Clock,
    FileText,
    HelpCircle,
    X,
    Filter,
    ShieldCheck,
    CreditCard,
    Smartphone,
    Award,
    Sparkles,
    Calendar,
    BookOpen,
    Eye
} from "lucide-react"
import { TestActionButton } from "@/components/test-series/TestActionButton"

// Types
interface PYQPaperItem {
    id: string
    title: string
    shortTitle: string
    heldDate: string
    stage: "Prelims" | "Mains"
    year: string
    totalQuestions: number
    totalMarks: number
    durationMinutes: number
    languages: string
    usersAttempted: string
    isFree: boolean
    hasCbtAttempt: boolean
    pdfSize: string
    cbtAttemptUrl: string
    solutionUrl: string
}

interface ExamMetaConfig {
    id: string
    name: string
    fullName: string
    totalPypTests: number
    freePypTests: number
    studentCount: string
    logoType: "bpsc" | "upsc" | "cbse-12" | "cbse-10" | "ncert-11" | "ncert-9" | "ncert-8"
    cbtDefaultSeriesId: string
    prelimsCount: number
    mainsCount: number
    availableYears: string[]
}

// Exam Configurations for UPSC, BPSC, 8th, 9th, 10th, 11th, 12th
const EXAM_CONFIGS: Record<string, ExamMetaConfig> = {
    bpsc: {
        id: "bpsc",
        name: "BPSC Exam",
        fullName: "BPSC Previous Year Question Papers, Prelims and Mains Past Paper PDF Download",
        totalPypTests: 128,
        freePypTests: 1,
        studentCount: "1189.1k",
        logoType: "bpsc",
        cbtDefaultSeriesId: "bpsc-72nd-2026",
        prelimsCount: 42,
        mainsCount: 86,
        availableYears: ["2026", "2025", "2024", "2023", "2022", "2020", "2019", "2018"]
    },
    upsc: {
        id: "upsc",
        name: "UPSC CSE",
        fullName: "UPSC Civil Services Prelims & Mains Previous Year Papers PDF Download",
        totalPypTests: 240,
        freePypTests: 2,
        studentCount: "1840.5k",
        logoType: "upsc",
        cbtDefaultSeriesId: "upsc-prelims-2026",
        prelimsCount: 80,
        mainsCount: 160,
        availableYears: ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019"]
    },
    "class-12": {
        id: "class-12",
        name: "CBSE Class 12th",
        fullName: "CBSE Class 12th Board Exam Previous Year Question Papers (Science, Commerce, Arts)",
        totalPypTests: 96,
        freePypTests: 2,
        studentCount: "740.2k",
        logoType: "cbse-12",
        cbtDefaultSeriesId: "class-10-boards-2026",
        prelimsCount: 96,
        mainsCount: 0,
        availableYears: ["2024", "2023", "2022", "2020", "2019", "2018"]
    },
    "class-11": {
        id: "class-11",
        name: "Class 11th Final Exams",
        fullName: "Class 11th Annual School Examination Question Papers & Sample Papers",
        totalPypTests: 64,
        freePypTests: 1,
        studentCount: "420.0k",
        logoType: "ncert-11",
        cbtDefaultSeriesId: "class-10-boards-2026",
        prelimsCount: 64,
        mainsCount: 0,
        availableYears: ["2024", "2023", "2022", "2021"]
    },
    "class-10": {
        id: "class-10",
        name: "CBSE Class 10th",
        fullName: "CBSE Class 10th Board Exam Past 10 Years Question Papers with Marking Scheme",
        totalPypTests: 85,
        freePypTests: 2,
        studentCount: "1250.3k",
        logoType: "cbse-10",
        cbtDefaultSeriesId: "class-10-boards-2026",
        prelimsCount: 85,
        mainsCount: 0,
        availableYears: ["2024", "2023", "2022", "2020", "2019", "2018"]
    },
    "class-9": {
        id: "class-9",
        name: "Class 9th Final Exams",
        fullName: "Class 9th Annual Exam Previous Year Papers (Mathematics, Science, SST)",
        totalPypTests: 52,
        freePypTests: 1,
        studentCount: "380.1k",
        logoType: "ncert-9",
        cbtDefaultSeriesId: "class-10-boards-2026",
        prelimsCount: 52,
        mainsCount: 0,
        availableYears: ["2024", "2023", "2022", "2021"]
    },
    "class-8": {
        id: "class-8",
        name: "Class 8th Foundation",
        fullName: "Class 8th Junior Foundation & Annual Exam Papers with Detailed Solutions",
        totalPypTests: 48,
        freePypTests: 1,
        studentCount: "290.4k",
        logoType: "ncert-8",
        cbtDefaultSeriesId: "class-10-boards-2026",
        prelimsCount: 48,
        mainsCount: 0,
        availableYears: ["2024", "2023", "2022", "2021"]
    }
}

// BPSC Specific Question Papers Database (Matches Image 2 & 3)
const BPSC_PAPERS_CATALOG: PYQPaperItem[] = [
    // ── CBT Online Attempt Enabled Papers (Matches Image 3) ──
    {
        id: "bpsc-71-prelims-free",
        title: "71st BPSC Exam Official Paper (Exam held on 13th September 2025) Test",
        shortTitle: "71st BPSC Exam Official Paper",
        heldDate: "13th September 2025",
        stage: "Prelims",
        year: "2025",
        totalQuestions: 150,
        totalMarks: 150,
        durationMinutes: 120,
        languages: "English, Hindi",
        usersAttempted: "26.9k",
        isFree: true,
        hasCbtAttempt: true,
        pdfSize: "4.2 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/attempt",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-71-prelims-locked",
        title: "71st BPSC Exam Official Paper (Exam held on 13th September 2025) Test",
        shortTitle: "71st BPSC Exam Official Paper",
        heldDate: "13th September 2025",
        stage: "Prelims",
        year: "2025",
        totalQuestions: 150,
        totalMarks: 150,
        durationMinutes: 120,
        languages: "English, Hindi",
        usersAttempted: "17.5k",
        isFree: false,
        hasCbtAttempt: true,
        pdfSize: "4.2 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/attempt",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-70-re-exam-locked",
        title: "70th BPSC Exam Official Paper (Re-exam held on 4th January 2025) Test",
        shortTitle: "70th BPSC Official Re-Exam Paper",
        heldDate: "4th January 2025",
        stage: "Prelims",
        year: "2025",
        totalQuestions: 150,
        totalMarks: 150,
        durationMinutes: 120,
        languages: "English, Hindi",
        usersAttempted: "5.7k",
        isFree: false,
        hasCbtAttempt: true,
        pdfSize: "3.9 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/attempt",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-69-prelims-locked",
        title: "69th BPSC Integrated Combined Competitive Official Paper (Held on 30 Sept 2023)",
        shortTitle: "69th BPSC Integrated Prelims",
        heldDate: "30th September 2023",
        stage: "Prelims",
        year: "2023",
        totalQuestions: 150,
        totalMarks: 150,
        durationMinutes: 120,
        languages: "English, Hindi",
        usersAttempted: "38.2k",
        isFree: false,
        hasCbtAttempt: true,
        pdfSize: "3.7 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/attempt",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-68-prelims-locked",
        title: "68th BPSC CCE Prelims (4-Option Negative Marking Format 2023) Test",
        shortTitle: "68th BPSC CCE Prelims",
        heldDate: "12th February 2023",
        stage: "Prelims",
        year: "2023",
        totalQuestions: 150,
        totalMarks: 150,
        durationMinutes: 120,
        languages: "English, Hindi",
        usersAttempted: "29.1k",
        isFree: false,
        hasCbtAttempt: true,
        pdfSize: "3.5 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/attempt",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-67-re-exam-locked",
        title: "67th BPSC CCE Prelims Official Re-Exam Paper (Held on 30 Sept 2022) Test",
        shortTitle: "67th BPSC Prelims Re-Exam",
        heldDate: "30th September 2022",
        stage: "Prelims",
        year: "2022",
        totalQuestions: 150,
        totalMarks: 150,
        durationMinutes: 120,
        languages: "English, Hindi",
        usersAttempted: "44.6k",
        isFree: false,
        hasCbtAttempt: true,
        pdfSize: "4.1 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/attempt",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },

    // ── Mains Exam Papers with PDF Download Focus (Matches Image 2) ──
    {
        id: "bpsc-71-mains-essay",
        title: "71st BPSC Mains Exam (Essay) Official Paper (Held On: 25 Apr, 2026)",
        shortTitle: "71st BPSC Mains Essay Paper",
        heldDate: "25 Apr, 2026",
        stage: "Mains",
        year: "2026",
        totalQuestions: 8,
        totalMarks: 300,
        durationMinutes: 180,
        languages: "English, Hindi",
        usersAttempted: "12.3k",
        isFree: false,
        hasCbtAttempt: false,
        pdfSize: "2.1 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/solutions",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-71-mains-hindi",
        title: "71st BPSC Mains Exam (General Hindi) Official Paper (Held On: 25 Apr, 2026)",
        shortTitle: "71st BPSC Mains General Hindi",
        heldDate: "25 Apr, 2026",
        stage: "Mains",
        year: "2026",
        totalQuestions: 10,
        totalMarks: 100,
        durationMinutes: 180,
        languages: "Hindi",
        usersAttempted: "14.1k",
        isFree: false,
        hasCbtAttempt: false,
        pdfSize: "1.8 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/solutions",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-71-mains-gs1",
        title: "71st BPSC Mains Exam (General Studies - I) Official Paper (Held On: 27 Apr, 2026)",
        shortTitle: "71st BPSC Mains GS-1",
        heldDate: "27 Apr, 2026",
        stage: "Mains",
        year: "2026",
        totalQuestions: 8,
        totalMarks: 300,
        durationMinutes: 180,
        languages: "English, Hindi",
        usersAttempted: "15.8k",
        isFree: false,
        hasCbtAttempt: false,
        pdfSize: "2.8 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/solutions",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-71-mains-gs2",
        title: "71st BPSC Mains Exam (General Studies - II) Official Paper (Held On: 28 Apr, 2026)",
        shortTitle: "71st BPSC Mains GS-2",
        heldDate: "28 Apr, 2026",
        stage: "Mains",
        year: "2026",
        totalQuestions: 8,
        totalMarks: 300,
        durationMinutes: 180,
        languages: "English, Hindi",
        usersAttempted: "15.2k",
        isFree: false,
        hasCbtAttempt: false,
        pdfSize: "2.9 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/solutions",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-69-mains-gs1",
        title: "69th BPSC Mains Exam (General Studies - I) Official Paper (Held On: 03 Jan, 2024)",
        shortTitle: "69th BPSC Mains GS-1",
        heldDate: "03 Jan, 2024",
        stage: "Mains",
        year: "2024",
        totalQuestions: 8,
        totalMarks: 300,
        durationMinutes: 180,
        languages: "English, Hindi",
        usersAttempted: "18.9k",
        isFree: false,
        hasCbtAttempt: false,
        pdfSize: "2.6 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/solutions",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    },
    {
        id: "bpsc-69-mains-gs2",
        title: "69th BPSC Mains Exam (General Studies - II) Official Paper (Held On: 04 Jan, 2024)",
        shortTitle: "69th BPSC Mains GS-2",
        heldDate: "04 Jan, 2024",
        stage: "Mains",
        year: "2024",
        totalQuestions: 8,
        totalMarks: 300,
        durationMinutes: 180,
        languages: "English, Hindi",
        usersAttempted: "18.4k",
        isFree: false,
        hasCbtAttempt: false,
        pdfSize: "2.7 MB",
        cbtAttemptUrl: "/test-series/bpsc-72nd-2026/solutions",
        solutionUrl: "/test-series/bpsc-72nd-2026/solutions"
    }
]

// Generic Fallback Catalog Generator for UPSC and Board Classes
function generatePapersCatalog(examId: string): PYQPaperItem[] {
    if (examId === "bpsc") return BPSC_PAPERS_CATALOG

    const prefix = examId.toUpperCase()
    return [
        {
            id: `${examId}-2024-p1-free`,
            title: `${prefix} Official Board/Exam Paper 1 (Held in 2024) Test`,
            shortTitle: `${prefix} 2024 Paper 1`,
            heldDate: "March 2024",
            stage: "Prelims",
            year: "2024",
            totalQuestions: 100,
            totalMarks: 100,
            durationMinutes: 120,
            languages: "English, Hindi",
            usersAttempted: "31.2k",
            isFree: true,
            hasCbtAttempt: true,
            pdfSize: "3.2 MB",
            cbtAttemptUrl: "/test-series/upsc-prelims-2026/attempt",
            solutionUrl: "/test-series/upsc-prelims-2026/solutions"
        },
        {
            id: `${examId}-2024-p2-locked`,
            title: `${prefix} Official Board/Exam Paper 2 (Held in 2024) Test`,
            shortTitle: `${prefix} 2024 Paper 2`,
            heldDate: "March 2024",
            stage: "Prelims",
            year: "2024",
            totalQuestions: 100,
            totalMarks: 100,
            durationMinutes: 120,
            languages: "English, Hindi",
            usersAttempted: "18.7k",
            isFree: false,
            hasCbtAttempt: true,
            pdfSize: "2.9 MB",
            cbtAttemptUrl: "/test-series/upsc-prelims-2026/attempt",
            solutionUrl: "/test-series/upsc-prelims-2026/solutions"
        },
        {
            id: `${examId}-2023-p1-locked`,
            title: `${prefix} Official Examination Paper (Held in 2023) Test`,
            shortTitle: `${prefix} 2023 Paper`,
            heldDate: "March 2023",
            stage: "Prelims",
            year: "2023",
            totalQuestions: 100,
            totalMarks: 100,
            durationMinutes: 120,
            languages: "English, Hindi",
            usersAttempted: "24.9k",
            isFree: false,
            hasCbtAttempt: true,
            pdfSize: "3.4 MB",
            cbtAttemptUrl: "/test-series/upsc-prelims-2026/attempt",
            solutionUrl: "/test-series/upsc-prelims-2026/solutions"
        },
        {
            id: `${examId}-2024-mains-pdf`,
            title: `${prefix} Subjective Theory & Comprehensive Question Paper (2024)`,
            shortTitle: `${prefix} 2024 Theory Paper`,
            heldDate: "April 2024",
            stage: "Mains",
            year: "2024",
            totalQuestions: 30,
            totalMarks: 80,
            durationMinutes: 180,
            languages: "English, Hindi",
            usersAttempted: "15.4k",
            isFree: false,
            hasCbtAttempt: false,
            pdfSize: "2.5 MB",
            cbtAttemptUrl: "/test-series/upsc-prelims-2026/solutions",
            solutionUrl: "/test-series/upsc-prelims-2026/solutions"
        },
        {
            id: `${examId}-2023-mains-pdf`,
            title: `${prefix} Subjective Theory & Comprehensive Question Paper (2023)`,
            shortTitle: `${prefix} 2023 Theory Paper`,
            heldDate: "April 2023",
            stage: "Mains",
            year: "2023",
            totalQuestions: 30,
            totalMarks: 80,
            durationMinutes: 180,
            languages: "English, Hindi",
            usersAttempted: "14.2k",
            isFree: false,
            hasCbtAttempt: false,
            pdfSize: "2.3 MB",
            cbtAttemptUrl: "/test-series/upsc-prelims-2026/solutions",
            solutionUrl: "/test-series/upsc-prelims-2026/solutions"
        }
    ]
}

// Custom Official Emblem SVG Component
function ExamEmblemIcon({ logoType }: { logoType: string }) {
    if (logoType === "bpsc") {
        return (
            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs shrink-0">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#F0FDF4" stroke="#047857" strokeWidth="2.5" />
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

    if (logoType === "upsc") {
        return (
            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs shrink-0">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#FFFDF5" stroke="#1E3A8A" strokeWidth="2.5" />
                    <path d="M50 14 C44 14 40 18 40 23 C40 27 43 30 45 32 C41 33 37 37 37 42 C37 47 41 51 45 53 L45 61 L33 61 C31 61 30 63 30 65 L30 68 L70 68 L70 65 C70 63 69 61 67 61 L55 61 L55 53 C59 51 63 47 63 42 C63 37 59 33 55 32 C57 30 60 27 60 23 C60 18 56 14 50 14 Z" fill="#1E3A8A" />
                    <text x="50" y="95" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#1E3A8A">UPSC</text>
                </svg>
            </div>
        )
    }

    return (
        <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 dark:border-blue-900 flex items-center justify-center p-1 shadow-xs shrink-0">
            <BookOpen className="w-6 h-6 text-blue-600" />
        </div>
    )
}

export default function ExamPYQDedicatedPage() {
    const params = useParams()
    const router = useRouter()
    const examId = (params?.examId as string) || "bpsc"

    const config = EXAM_CONFIGS[examId] || EXAM_CONFIGS.bpsc
    const allPapers = useMemo(() => generatePapersCatalog(examId), [examId])

    // State
    const [activeSubTab, setActiveSubTab] = useState<"prev-papers" | "coaching" | "test-series" | "quizzes">("prev-papers")
    const [selectedStages, setSelectedStages] = useState<string[]>(["Prelims", "Mains"])
    const [selectedYears, setSelectedYears] = useState<string[]>(config.availableYears)

    // Requirement 2: Phone Number Download Modal State
    const [phoneModalPaper, setPhoneModalPaper] = useState<PYQPaperItem | null>(null)
    const [phoneNumber, setPhoneNumber] = useState("")
    const [phoneError, setPhoneError] = useState("")
    const [isPhoneVerified, setIsPhoneVerified] = useState(false)

    // Requirement 3: CBT Unlock Payment Modal State
    const [paymentModalPaper, setPaymentModalPaper] = useState<PYQPaperItem | null>(null)
    const [selectedPlanPrice, setSelectedPlanPrice] = useState<number>(149)
    const [unlockedPaperIds, setUnlockedPaperIds] = useState<string[]>([])
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)

    // Share toast
    const [copiedShare, setCopiedShare] = useState(false)

    // Load persisted phone and unlocked papers from localStorage
    useEffect(() => {
        try {
            const savedPhone = localStorage.getItem("ts_user_phone")
            if (savedPhone && savedPhone.length === 10) {
                setPhoneNumber(savedPhone)
                setIsPhoneVerified(true)
            }
            const savedUnlocked = localStorage.getItem("ts_unlocked_pyqs")
            if (savedUnlocked) {
                setUnlockedPaperIds(JSON.parse(savedUnlocked))
            }
        } catch (e) {}
    }, [])

    // Filtered Papers based on right sidebar filters (Image 2 & 3)
    const filteredPapers = useMemo(() => {
        return allPapers.filter((p) => {
            const matchesStage = selectedStages.includes(p.stage)
            const matchesYear = selectedYears.includes(p.year)
            return matchesStage && matchesYear
        })
    }, [allPapers, selectedStages, selectedYears])

    // Separate into CBT Attempt papers (Image 3) and Mains/PDF papers (Image 2)
    const cbtAttemptPapers = useMemo(() => {
        return filteredPapers.filter((p) => p.hasCbtAttempt)
    }, [filteredPapers])

    const pdfOnlyPapers = useMemo(() => {
        return filteredPapers.filter((p) => !p.hasCbtAttempt)
    }, [filteredPapers])

    // Toggle Stage Filter
    const toggleStage = (stage: string) => {
        setSelectedStages((prev) =>
            prev.includes(stage) ? (prev.length > 1 ? prev.filter((s) => s !== stage) : prev) : [...prev, stage]
        )
    }

    // Toggle Year Filter
    const toggleYear = (year: string) => {
        setSelectedYears((prev) =>
            prev.includes(year) ? (prev.length > 1 ? prev.filter((y) => y !== year) : prev) : [...prev, year]
        )
    }

    // Requirement 2: Handling PDF Download with Phone Number Capture
    const handleDownloadClick = (paper: PYQPaperItem) => {
        if (isPhoneVerified && phoneNumber.length === 10) {
            // Already verified, redirect directly to PDF Viewer page and download
            router.push(`/pyqs/pdf-view?examId=${config.id}&paperId=${paper.id}&phone=${encodeURIComponent(phoneNumber)}`)
        } else {
            // Ask for phone number first
            setPhoneModalPaper(paper)
            setPhoneError("")
        }
    }

    const handleVerifyPhoneAndDownload = (e: React.FormEvent) => {
        e.preventDefault()
        const cleanNumber = phoneNumber.replace(/\D/g, "")
        if (cleanNumber.length !== 10) {
            setPhoneError("Please enter a valid 10-digit mobile number.")
            return
        }

        try {
            localStorage.setItem("ts_user_phone", cleanNumber)
        } catch (e) {}

        setIsPhoneVerified(true)
        const targetPaper = phoneModalPaper
        setPhoneModalPaper(null)

        if (targetPaper) {
            router.push(`/pyqs/pdf-view?examId=${config.id}&paperId=${targetPaper.id}&phone=${encodeURIComponent(cleanNumber)}`)
        }
    }

    // Requirement 3: Handling CBT Unlock & Payment
    const handleUnlockClick = (paper: PYQPaperItem) => {
        const isAlreadyUnlocked = unlockedPaperIds.includes(paper.id)

        if (isAlreadyUnlocked || paper.isFree) {
            // Directly take to CBT Mode
            router.push(paper.cbtAttemptUrl)
        } else {
            // Open Payment Unlock Modal
            setPaymentModalPaper(paper)
        }
    }

    const handleConfirmPaymentAndStartCbt = () => {
        if (!paymentModalPaper) return
        setIsProcessingPayment(true)

        setTimeout(() => {
            const updated = [...unlockedPaperIds, paymentModalPaper.id]
            setUnlockedPaperIds(updated)
            try {
                localStorage.setItem("ts_unlocked_pyqs", JSON.stringify(updated))
            } catch (e) {}

            setIsProcessingPayment(false)
            const targetUrl = paymentModalPaper.cbtAttemptUrl
            setPaymentModalPaper(null)

            // Direct student into the CBT Mode
            router.push(targetUrl)
        }, 1200)
    }

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href)
        setCopiedShare(true)
        setTimeout(() => setCopiedShare(false), 2500)
    }

    return (
        <div className="space-y-6 sm:space-y-8 pb-20 text-gray-900 dark:text-gray-100 font-sans">
            {/* Top Navigation Bar: Search, Language, Get Pass */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
                <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search in ${config.name} previous year papers...`}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        <span>🇮🇳 English / हिंदी</span>
                    </div>

                    <Link
                        href="/pricing"
                        className="px-5 py-2 rounded-xl bg-[#00C853] hover:bg-[#00B248] text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5"
                    >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        <span>Get Pass</span>
                    </Link>
                </div>
            </div>

            {/* Breadcrumbs matching Image 1 */}
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link href="/pyqs" className="hover:text-blue-600 transition-colors">{config.name}</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{config.name} Previous Year Question Paper</span>
            </div>

            {/* ── HEADER HERO SECTION (Matches Image 1) ── */}
            <div className="space-y-4 pt-1">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <ExamEmblemIcon logoType={config.logoType} />
                        <div className="space-y-2">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                                {config.fullName}
                            </h1>

                            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
                                <span className="px-3 py-1 rounded-md bg-[#2563EB] text-white font-black">
                                    {config.totalPypTests} + PYP Tests
                                </span>
                                <span className="text-gray-700 dark:text-gray-300">
                                    • {config.freePypTests} Free PYP Tests
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Share Button with copied indicator */}
                    <button
                        onClick={handleShare}
                        className="self-start px-4 py-2 rounded-xl border border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                        <Share2 className="h-4 w-4" />
                        <span>{copiedShare ? "Link Copied!" : "Share"}</span>
                    </button>
                </div>

                {/* Subtitle Checkmark & Pass Box */}
                <div className="space-y-3">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                        <span><strong>{config.totalPypTests}</strong> Full Paper PYP (online attempt+pdf)</span>
                    </p>

                    {/* Blue rounded box with Get Pass Button (Exact Image 1) */}
                    <div className="p-3.5 sm:p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </span>
                            <span>
                                Also <span className="underline decoration-blue-500 underline-offset-4 font-black">Unlock 45,000+ More PYP's</span> with <strong>aspirantbook Pass</strong>
                            </span>
                        </div>

                        <Link
                            href="/pricing"
                            className="px-5 py-2 rounded-xl bg-[#00C853] hover:bg-[#00B248] text-white text-xs font-black self-end sm:self-auto shadow-xs transition-all"
                        >
                            Get Pass
                        </Link>
                    </div>

                    {/* Social Proof */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span><strong>{config.studentCount}</strong> Students Improve their score through PYP Tests</span>
                    </p>
                </div>
            </div>

            {/* ── HORIZONTAL SUB-NAVIGATION TABS (Matches Image 1) ── */}
            <div className="flex items-center gap-4 sm:gap-8 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveSubTab("prev-papers")}
                    className={`pb-3.5 px-2 flex items-center gap-2 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
                        activeSubTab === "prev-papers"
                            ? "border-blue-600 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900"
                    }`}
                >
                    <span className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
                        <FileText className="h-4 w-4" />
                    </span>
                    <span>Prev. Papers</span>
                </button>

                <Link
                    href={`/courses`}
                    className="pb-3.5 px-2 flex items-center gap-2 text-xs sm:text-sm font-bold border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 shrink-0 transition-colors"
                >
                    <span className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
                        <Sparkles className="h-4 w-4" />
                    </span>
                    <span>Super Coaching</span>
                </Link>

                <Link
                    href="/test-series"
                    className="pb-3.5 px-2 flex items-center gap-2 text-xs sm:text-sm font-bold border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 shrink-0 transition-colors"
                >
                    <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                        <Award className="h-4 w-4" />
                    </span>
                    <span>Test Series</span>
                </Link>

                <Link
                    href="/practice"
                    className="pb-3.5 px-2 flex items-center gap-2 text-xs sm:text-sm font-bold border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 shrink-0 transition-colors"
                >
                    <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center">
                        <HelpCircle className="h-4 w-4" />
                    </span>
                    <span>Quizzes</span>
                </Link>
            </div>

            {/* ── MAIN CONTENT CONTAINER WITH SPLIT SIDEBAR (Matches Image 2 & 3) ── */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left/Main Papers Column */}
                <div className="flex-1 w-full space-y-8">
                    {/* ── SECTION A: PYQ WITH ORIGINAL CBT TEST ATTEMPT & UNLOCK NOW (Image 3) ── */}
                    {cbtAttemptPapers.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-1">
                                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                                    {config.name} Online CBT Attempt Papers (Total Tests: {cbtAttemptPapers.length})
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {cbtAttemptPapers.map((paper) => {
                                    const isUnlocked = paper.isFree || unlockedPaperIds.includes(paper.id)

                                    return (
                                        <div
                                            key={paper.id}
                                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 p-5 shadow-2xs hover:shadow-md transition-all space-y-3"
                                        >
                                            {/* Free Tag if available */}
                                            {paper.isFree && (
                                                <span className="bg-[#00C853] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider inline-block">
                                                    FREE
                                                </span>
                                            )}

                                            {/* Title & Users Badge */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug">
                                                    {paper.title}
                                                </h3>
                                                <span className="text-xs font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1 shrink-0">
                                                    ⚡ {paper.usersAttempted} Users
                                                </span>
                                            </div>

                                            {/* Meta specs */}
                                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <HelpCircle className="h-3.5 w-3.5" />
                                                    {paper.totalQuestions} Questions
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Award className="h-3.5 w-3.5" />
                                                    {paper.totalMarks} Marks
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {paper.durationMinutes} Mins
                                                </span>
                                            </div>

                                            {/* Footer Info & Actions */}
                                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    <span className="text-blue-600 font-semibold cursor-pointer hover:underline">Syllabus</span>
                                                    <span>•</span>
                                                    <span>{paper.languages}</span>
                                                    <span>•</span>
                                                    <button onClick={handleShare} className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
                                                        <Share2 className="h-3 w-3" /> Share
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                                                    {/* Requirement 2: Download PDF Button */}
                                                    <button
                                                        onClick={() => handleDownloadClick(paper)}
                                                        className="px-4 py-2 rounded-xl border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold transition-colors flex items-center gap-1.5"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        <span>Download PDF</span>
                                                    </button>

                                                    {/* Requirement 3: CBT Test Attempt Button (Start Now vs Unlock Now vs Coming soon) */}
                                                    {paper.id === "bpsc-71-prelims-free" ? (
                                                        <TestActionButton
                                                            testId="bpsc-sectional-5q"
                                                            seriesId="bpsc-72nd-2026"
                                                            testTitle={paper.title}
                                                            returnPath={`/pyqs/${examId}`}
                                                            isLocked={!isUnlocked}
                                                            onUnlockClick={() => handleUnlockClick(paper)}
                                                        />
                                                    ) : isUnlocked ? (
                                                        <TestActionButton
                                                            testId={`unmapped-${paper.id}`}
                                                            seriesId={config.cbtDefaultSeriesId || "bpsc-72nd-2026"}
                                                            testTitle={paper.title}
                                                            disabled={true}
                                                            disabledLabel="Coming soon"
                                                            returnPath={`/pyqs/${examId}`}
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUnlockClick(paper)}
                                                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                                                        >
                                                            <Lock className="h-3.5 w-3.5" />
                                                            <span>Unlock Now</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── SECTION B: MAINS & SECTIONAL OFFICIAL PAPERS (Matches Image 2) ── */}
                    {pdfOnlyPapers.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between pb-1">
                                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                                    {config.name} Mains & Subjective Papers (Total Tests: {pdfOnlyPapers.length})
                                </h2>
                            </div>

                            <div className="space-y-3.5">
                                {pdfOnlyPapers.map((paper) => (
                                    <div
                                        key={paper.id}
                                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                    >
                                        <div className="space-y-1.5">
                                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                                {paper.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span>{paper.languages}</span>
                                                <span>•</span>
                                                <button onClick={handleShare} className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
                                                    <Share2 className="h-3 w-3" /> Share
                                                </button>
                                            </div>
                                        </div>

                                        {/* Download PDF button (Requirement 2) */}
                                        <div className="shrink-0 self-end sm:self-auto">
                                            <button
                                                onClick={() => handleDownloadClick(paper)}
                                                className="px-4 py-2 rounded-xl border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold transition-colors flex items-center gap-1.5"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                <span>Download PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT FILTER SIDEBAR (Matches Image 2 & 3) ── */}
                <div className="w-full lg:w-72 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 p-5 shrink-0 shadow-2xs space-y-6 lg:sticky lg:top-20">
                    {/* Stage Filter */}
                    <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                            Select Stage
                        </h3>
                        <div className="space-y-2.5">
                            {["Prelims", "Mains"].map((stg) => (
                                <label
                                    key={stg}
                                    onClick={() => toggleStage(stg)}
                                    className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedStages.includes(stg)}
                                        readOnly
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span>{stg}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Year Filter */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">
                            Select Year
                        </h3>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {config.availableYears.map((yr) => (
                                <label
                                    key={yr}
                                    onClick={() => toggleYear(yr)}
                                    className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedYears.includes(yr)}
                                        readOnly
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span>{yr}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Quick Reset */}
                    <button
                        onClick={() => {
                            setSelectedStages(["Prelims", "Mains"])
                            setSelectedYears(config.availableYears)
                        }}
                        className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* ── MODAL 1: REQUIREMENT 2 - PHONE NUMBER CAPTURE BEFORE PDF DOWNLOAD ── */}
            {phoneModalPaper && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-[#071E34] border border-gray-200 dark:border-gray-700 w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center shrink-0">
                                <Smartphone className="h-6 w-6" />
                            </div>
                            <button
                                onClick={() => setPhoneModalPaper(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                Enter Phone Number to Download PDF
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Verify your phone number once to get instant access to <strong>{phoneModalPaper.shortTitle}</strong> and all past papers.
                            </p>
                        </div>

                        <form onSubmit={handleVerifyPhoneAndDownload} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Mobile Number
                                </label>
                                <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                    <span className="px-3.5 py-2.5 text-xs font-bold text-gray-500 border-r border-gray-300 dark:border-gray-600">
                                        +91
                                    </span>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                                        placeholder="Enter 10-digit mobile number"
                                        className="w-full px-3 py-2.5 bg-transparent text-sm font-semibold focus:outline-none text-gray-900 dark:text-white"
                                        autoFocus
                                    />
                                </div>
                                {phoneError && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1.5">{phoneError}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                <span>Verify & Download Official PDF</span>
                            </button>

                            <p className="text-[11px] text-center text-gray-400">
                                Free instant download • No OTP required • Direct PDF Reader access
                            </p>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL 2: REQUIREMENT 3 - PAYMENT UNLOCK MODAL FOR ONLINE CBT MODE ── */}
            {paymentModalPaper && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-[#071E34] border border-gray-200 dark:border-gray-700 w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-600">
                                        CBT Mock Mode
                                    </span>
                                    <h3 className="text-base font-black text-gray-900 dark:text-white mt-1">
                                        Unlock Official Paper in Online CBT Mode
                                    </h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setPaymentModalPaper(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Paper summary card */}
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-gray-700/60 space-y-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                                {paymentModalPaper.title}
                            </p>
                            <p className="text-[11px] text-gray-500">
                                {paymentModalPaper.totalQuestions} Questions • {paperScoreLabel(paymentModalPaper)} • Real-time negative marking timer
                            </p>
                        </div>

                        {/* Pricing Plan Choice */}
                        <div className="space-y-2.5">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Choose Unlock Pass:
                            </label>

                            {/* Plan 1: Single Paper */}
                            <div
                                onClick={() => setSelectedPlanPrice(49)}
                                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                    selectedPlanPrice === 49
                                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">Single Paper CBT Access</p>
                                    <p className="text-[11px] text-gray-500">Attempt this paper with AIR leaderboard</p>
                                </div>
                                <span className="text-sm font-black text-gray-900 dark:text-white">₹49</span>
                            </div>

                            {/* Plan 2: Complete Exam PYP Pass (Recommended) */}
                            <div
                                onClick={() => setSelectedPlanPrice(149)}
                                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between relative ${
                                    selectedPlanPrice === 149
                                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Best Value
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{config.name} All Past Papers Pass</p>
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        Unlock all {config.totalPypTests}+ CBT papers (10 years)
                                    </p>
                                </div>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹149</span>
                            </div>

                            {/* Plan 3: Full TrillionPass */}
                            <div
                                onClick={() => setSelectedPlanPrice(499)}
                                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                    selectedPlanPrice === 499
                                        ? "border-purple-600 bg-purple-50/50 dark:bg-purple-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                }`}
                            >
                                <div>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">Full Platform TrillionPass (1 Year)</p>
                                    <p className="text-[11px] text-gray-500">All UPSC, BPSC, Boards & Test Series</p>
                                </div>
                                <span className="text-sm font-black text-purple-600 dark:text-purple-400">₹499</span>
                            </div>
                        </div>

                        {/* Payment Actions */}
                        <div className="space-y-2 pt-1">
                            <button
                                onClick={handleConfirmPaymentAndStartCbt}
                                disabled={isProcessingPayment}
                                className="w-full py-3.5 rounded-xl bg-[#00C853] hover:bg-[#00B248] text-white font-black text-sm shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessingPayment ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Confirming Payment & Launching CBT...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>Pay ₹{selectedPlanPrice} & Start CBT Test</span>
                                    </>
                                )}
                            </button>

                            <p className="text-[11px] text-center text-gray-400">
                                Instant unlock • Powered by Razorpay & UPI • 100% Secure Checkout
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function paperScoreLabel(p: PYQPaperItem) {
    return `${p.totalMarks} Marks • ${p.durationMinutes} Mins`
}
