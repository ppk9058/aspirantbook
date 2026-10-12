"use client"

import { useState, useCallback, Suspense, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { parseAndValidateQuestion } from "@/lib/exam/question-parser"
import CreateSeriesModal from "@/components/exam/CreateSeriesModal"
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    CheckCircle2,
    Circle,
    Save,
    Eye,
    Rocket,
    FileDown,
    Upload,
    Wand2,
    X,
    AlertTriangle,
    BookOpen,
    GripVertical,
    Video,
    BarChart3,
    Tag,
    Layers,
    FileText,
    Sparkles,
    FileSpreadsheet,
    Code2,
    Check,
    AlertCircle,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section {
    id: string
    name: string
    nameHindi: string
    numQuestions: number
    positiveMarks: number
    negativeMarks: number
    hasSectionalTime: boolean
    sectionalTimeMinutes: number
}

interface Option {
    english: string
    hindi: string
}

interface Question {
    id: string
    sectionId: string
    textEnglish: string
    textHindi: string
    options: [Option, Option, Option, Option]
    correctAnswer: 0 | 1 | 2 | 3 | null
    explanationEnglish: string
    explanationHindi: string
    videoUrl: string
    difficulty: "Easy" | "Moderate" | "Hard"
    subject: string
    topic: string
}

interface FormData {
    // Step 1
    seriesId: string
    pyqPaperId?: string
    title: string
    titleHindi: string
    examCategory: string
    examName: string
    testType: string
    accessMode: "free" | "pro"
    durationMinutes: number
    totalQuestions: number
    totalMarks: number
    isLive: boolean
    liveStartAt: string
    liveEndAt: string
    // Step 2
    sections: Section[]
    // Step 3
    questions: Question[]
}

const TEST_TYPE_MAP: Record<string, "FULL_MOCK" | "CHAPTER_TEST" | "SECTIONAL_TEST" | "PREVIOUS_YEAR" | "LIVE_SPEED"> = {
    "Full Mock Test": "FULL_MOCK",
    "Chapter Test": "CHAPTER_TEST",
    "Sectional Test": "SECTIONAL_TEST",
    "Previous Year Paper": "PREVIOUS_YEAR",
    "Live Speed Test": "LIVE_SPEED",
    "PYQ": "PREVIOUS_YEAR",
}

const NEGATIVE_MARK_OPTIONS = [0, 0.25, 0.33, 0.5, 0.66]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
    return Math.random().toString(36).slice(2, 9)
}

function emptyOption(): Option {
    return { english: "", hindi: "" }
}

function emptyQuestion(sectionId: string): Question {
    return {
        id: generateId(),
        sectionId,
        textEnglish: "",
        textHindi: "",
        options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
        correctAnswer: null,
        explanationEnglish: "",
        explanationHindi: "",
        videoUrl: "",
        difficulty: "Moderate",
        subject: "",
        topic: "",
    }
}

function emptySection(): Section {
    return {
        id: generateId(),
        name: "",
        nameHindi: "",
        numQuestions: 10,
        positiveMarks: 1,
        negativeMarks: 0.33,
        hasSectionalTime: false,
        sectionalTimeMinutes: 20,
    }
}

function buildInitialQuestions(sections: Section[]): Question[] {
    const qs: Question[] = []
    for (const sec of sections) {
        for (let i = 0; i < sec.numQuestions; i++) {
            qs.push(emptyQuestion(sec.id))
        }
    }
    return qs
}

function parseCSV(text: string): string[][] {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ""
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        const nextChar = text[i + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim())
            currentCell = ""
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++
            currentRow.push(currentCell.trim())
            if (currentRow.some(cell => cell.length > 0)) {
                rows.push(currentRow)
            }
            currentRow = []
            currentCell = ""
        } else {
            currentCell += char
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim())
        if (currentRow.some(cell => cell.length > 0)) {
            rows.push(currentRow)
        }
    }
    return rows
}

function downloadSampleCsv() {
    const csvContent = `"Question (English)","Question (Hindi)","Option A (English)","Option A (Hindi)","Option B (English)","Option B (Hindi)","Option C (English)","Option C (Hindi)","Option D (English)","Option D (Hindi)","Correct Option (A/B/C/D)","Explanation (English)","Explanation (Hindi)","Difficulty","Subject","Topic"
"Who was the first President of India?","भारत के प्रथम राष्ट्रपति कौन थे?","Jawaharlal Nehru","जवाहरलाल नेहरू","Sardar Patel","सरदार पटेल","Dr. Rajendra Prasad","डॉ. राजेंद्र प्रसाद","Dr. B.R. Ambedkar","डॉ. बी.आर. अंबेडकर","C","Dr. Rajendra Prasad served as the first President from 1950 to 1962.","डॉ. राजेंद्र प्रसाद ने 1950 से 1962 तक भारत के प्रथम राष्ट्रपति के रूप में कार्य किया।","Easy","History","Modern India"
"Which river flows through the Deccan Plateau?","निम्नलिखित में से कौन सी नदी दक्कन के पठार से होकर बहती है?","Ganga","गंगा","Godavari","गोदावरी","Yamuna","यमुना","Brahmaputra","ब्रह्मपुत्र","B","The Godavari is the longest river draining the Deccan Plateau.","गोदावरी दक्कन के पठार को सींचने वाली सबसे लंबी नदी है।","Moderate","Geography","Rivers of India"
"Which article guarantees Right to Constitutional Remedies?","कौन सा अनुच्छेद संवैधानिक उपचार का अधिकार देता है?","Article 19","अनुच्छेद 19","Article 21","अनुच्छेद 21","Article 32","अनुच्छेद 32","Article 226","अनुच्छेद 226","C","Article 32 was called the heart and soul of the Constitution by Dr. B.R. Ambedkar.","अनुच्छेद 32 को डॉ. अंबेडकर ने संविधान की आत्मा कहा था।","Moderate","Polity","Fundamental Rights"`
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "aspirantbook_questions_template.csv"
    link.click()
    URL.revokeObjectURL(url)
}

function downloadSampleJson() {
    const jsonContent = JSON.stringify([
        {
            "questionEn": "Who was the first President of India?",
            "questionHi": "भारत के प्रथम राष्ट्रपति कौन थे?",
            "optionAEn": "Jawaharlal Nehru",
            "optionAHi": "जवाहरलाल नेहरू",
            "optionBEn": "Sardar Patel",
            "optionBHi": "सरदार पटेल",
            "optionCEn": "Dr. Rajendra Prasad",
            "optionCHi": "डॉ. राजेंद्र प्रसाद",
            "optionDEn": "Dr. B.R. Ambedkar",
            "optionDHi": "डॉ. बी.आर. अंबेडकर",
            "correctOption": "C",
            "explanationEn": "Dr. Rajendra Prasad served as the first President from 1950 to 1962.",
            "explanationHi": "डॉ. राजेंद्र प्रसाद ने 1950 से 1962 तक भारत के प्रथम राष्ट्रपति के रूप में कार्य किया।",
            "difficulty": "Easy",
            "subject": "History",
            "topic": "Modern India"
        },
        {
            "questionEn": "Which river flows through the Deccan Plateau?",
            "questionHi": "निम्नलिखित में से कौन सी नदी दक्कन के पठार से होकर बहती है?",
            "optionAEn": "Ganga",
            "optionAHi": "गंगा",
            "optionBEn": "Godavari",
            "optionBHi": "गोदावरी",
            "optionCEn": "Yamuna",
            "optionCHi": "यमुना",
            "optionDEn": "Brahmaputra",
            "optionDHi": "ब्रह्मपुत्र",
            "correctOption": "B",
            "explanationEn": "The Godavari is the longest river in peninsular India.",
            "explanationHi": "गोदावरी प्रायद्वीपीय भारत की सबसे लंबी नदी है।",
            "difficulty": "Moderate",
            "subject": "Geography",
            "topic": "Rivers of India"
        }
    ], null, 2)
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "aspirantbook_questions_template.json"
    link.click()
    URL.revokeObjectURL(url)
}

const EXAM_CATEGORIES = [
    "UPSC",
    "BPSC",
    "Current Affairs Quizzes",
    "Civil Services",
    "State PCS",
    "School (Classes 6-10)",
    "Skills & Tech",
    "Teaching / BPSC TRE",
    "Banking",
    "SSC",
    "Railways",
    "Defence",
]

const TEST_TYPES = [
    "Full Mock Test",
    "Chapter Test",
    "Sectional Test",
    "Previous Year Paper",
    "Live Speed Test",
    "PYQ",
]

const AI_DEMO_QUESTIONS = [
    {
        q: "Which article of the Indian Constitution deals with the Right to Equality?",
        opts: ["Article 12", "Article 14", "Article 19", "Article 21"],
        ans: 1,
        exp: "Article 14 guarantees the Right to Equality before law and equal protection of laws.",
    },
    {
        q: "The Directive Principles of State Policy are mentioned in which part of the Constitution?",
        opts: ["Part III", "Part IV", "Part V", "Part VI"],
        ans: 1,
        exp: "Part IV (Articles 36-51) contains the Directive Principles of State Policy.",
    },
    {
        q: "Who has the power to declare a national emergency in India?",
        opts: ["Prime Minister", "Parliament", "President", "Supreme Court"],
        ans: 2,
        exp: "The President of India declares national emergency under Article 352 on the advice of the Cabinet.",
    },
    {
        q: "Which constitutional amendment lowered the voting age from 21 to 18?",
        opts: ["61st Amendment", "42nd Amendment", "73rd Amendment", "86th Amendment"],
        ans: 0,
        exp: "The 61st Constitutional Amendment Act, 1988 reduced the voting age from 21 to 18 years.",
    },
    {
        q: "Fundamental Duties were added to the Indian Constitution by which amendment?",
        opts: ["40th Amendment", "42nd Amendment", "44th Amendment", "52nd Amendment"],
        ans: 1,
        exp: "The 42nd Constitutional Amendment Act, 1976 added Fundamental Duties (Part IV-A, Article 51A).",
    },
]

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
    const steps = [
        { label: "Test Info" },
        { label: "Sections" },
        { label: "Questions" },
        { label: "Publish" },
    ]
    return (
        <div className="flex items-center gap-0 overflow-x-auto no-scrollbar max-w-full py-1" data-scroll-x="true">
            {steps.map((step, idx) => {
                const num = idx + 1
                const done = num < current
                const active = num === current

                return (
                    <div key={idx} className="flex items-center shrink-0">
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                                    done
                                        ? "bg-[#00D084] border-[#00D084] text-white"
                                        : active
                                        ? "bg-[#00A8FF] border-[#00A8FF] text-white"
                                        : "bg-white border-gray-300 text-gray-400"
                                }`}
                            >
                                {done ? <CheckCircle2 className="h-4 w-4" /> : num}
                            </div>
                            <span
                                className={`text-[10px] font-semibold mt-1 whitespace-nowrap ${
                                    done
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : active
                                        ? "text-sky-700 dark:text-sky-400 font-bold"
                                        : "text-gray-600 dark:text-gray-400"
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div
                                className={`h-0.5 w-3 sm:w-10 md:w-16 mb-4 mx-1 transition-all shrink-0 ${
                                    done ? "bg-[#00D084]" : "bg-gray-200"
                                }`}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Field Error ──────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null
    return <p className="text-[#EF4444] text-xs mt-1 font-medium">{msg}</p>
}

// ─── Card Header ─────────────────────────────────────────────────────────────

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="px-6 py-4 bg-gradient-to-r from-[#F3ECFF] via-[#F8F5FF] to-white dark:from-[#0a1f38] dark:via-[#0c2442] dark:to-[#071d33] border-b border-purple-100 dark:border-gray-800 rounded-t-2xl">
            <h2 className="text-base font-black text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CreateTestContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const querySeriesId = searchParams.get("seriesId") || ""
    const queryCategory = searchParams.get("category") || ""
    const queryType = searchParams.get("type") || ""
    const queryPaperId = searchParams.get("paperId") || ""

    const initialTestType = queryType === "PYQ" || (queryPaperId && !queryType)
        ? "PYQ"
        : (TEST_TYPES.includes(queryType) ? queryType : "Full Mock Test")

    const [step, setStep] = useState(1)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [apiError, setApiError] = useState<string | null>(null)
    const [apiErrorDetails, setApiErrorDetails] = useState<string[]>([])
    const [draftWarnings, setDraftWarnings] = useState<string[]>([])
    const [showAiModal, setShowAiModal] = useState(false)
    const [aiPrompt, setAiPrompt] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [published, setPublished] = useState(false)
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")
    const [bulkImportOpen, setBulkImportOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [savedTestId, setSavedTestId] = useState<string | null>(null)
    const [rawPaperText, setRawPaperText] = useState("")
    const [rawLoading, setRawLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [paperWarning, setPaperWarning] = useState<string | null>(null)
    const [pyqFetchError, setPyqFetchError] = useState<string | null>(null)
    const [pyqPapersLoaded, setPyqPapersLoaded] = useState(false)

    const defaultSection: Section = {
        id: generateId(),
        name: "General Studies",
        nameHindi: "",
        numQuestions: 10,
        positiveMarks: 1,
        negativeMarks: 0.33,
        hasSectionalTime: false,
        sectionalTimeMinutes: 20,
    }

    const [formData, setFormData] = useState<FormData>({
        seriesId: querySeriesId || "",
        pyqPaperId: "",
        title: "",
        titleHindi: "",
        examCategory: "",
        examName: "",
        testType: initialTestType,
        accessMode: "free",
        durationMinutes: 60,
        totalQuestions: 10,
        totalMarks: 10,
        isLive: false,
        liveStartAt: "",
        liveEndAt: "",
        sections: [defaultSection],
        questions: buildInitialQuestions([defaultSection]),
    })

    const [isCreateSeriesModalOpen, setIsCreateSeriesModalOpen] = useState(false)
    const [seriesPackages, setSeriesPackages] = useState<any[]>([])

    const fetchSeriesList = useCallback(async () => {
        try {
            const res = await fetch("/api/exam/series/list")
            const j = await res.json()
            if (j.success && Array.isArray(j.data)) {
                setSeriesPackages(j.data)
            }
        } catch (e) {
            console.warn("Could not load series packages from DB", e)
        }
    }, [])

    useEffect(() => {
        fetchSeriesList()
    }, [fetchSeriesList])

    const [pyqPapers, setPyqPapers] = useState<any[]>([])
    const [loadingPyqPapers, setLoadingPyqPapers] = useState(false)

    const fetchPyqPapers = useCallback(async () => {
        try {
            setLoadingPyqPapers(true)
            setPyqFetchError(null)
            const res = await fetch("/api/admin/pyqs/papers")
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    setPyqPapers(data)
                } else {
                    setPyqPapers([])
                }
            } else {
                const errData = await res.json().catch(() => ({}))
                setPyqFetchError(errData.error || `Failed to load PYQ papers (${res.status})`)
            }
        } catch (e: any) {
            setPyqFetchError(e.message || "Failed to load PYQ papers")
            console.warn("Could not load PYQ papers", e)
        } finally {
            setLoadingPyqPapers(false)
            setPyqPapersLoaded(true)
        }
    }, [])

    useEffect(() => {
        if (formData.testType === "PYQ") {
            fetchPyqPapers()
        }
    }, [formData.testType, fetchPyqPapers])

    useEffect(() => {
        if (!queryPaperId || !pyqPapersLoaded) return

        const matched = pyqPapers.find((p) => p.id === queryPaperId)
        if (matched) {
            setFormData((prev) => ({
                ...prev,
                pyqPaperId: matched.id,
                title: prev.title || `${matched.title} - Official CBT Mock`,
            }))
            setPaperWarning(null)
        } else {
            // Foreign or unknown paperId
            setFormData((prev) => ({
                ...prev,
                pyqPaperId: "",
            }))
            setPaperWarning("Specified PYQ paper was not found or is not accessible.")
        }
    }, [queryPaperId, pyqPapers, pyqPapersLoaded])

    useEffect(() => {
        if (querySeriesId && seriesPackages.length > 0) {
            const match = seriesPackages.find((s) => s.id === querySeriesId || s.slug === querySeriesId)
            if (match) {
                setFormData((prev) => ({
                    ...prev,
                    seriesId: match.id,
                    examCategory: match.category,
                    examName: match.title,
                }))
            }
        }
    }, [querySeriesId, seriesPackages])

    // Current question navigation per section
    const [currentSection, setCurrentSection] = useState(0)
    const [currentQIdx, setCurrentQIdx] = useState(0)

    // ── Updaters ──

    const updateField = useCallback(
        <K extends keyof FormData>(key: K, value: FormData[K]) => {
            setFormData((prev) => ({ ...prev, [key]: value }))
            setErrors((prev) => {
                const next = { ...prev }
                delete next[key]
                return next
            })
        },
        []
    )

    const updateSection = (idx: number, patch: Partial<Section>) => {
        setFormData((prev) => {
            const sections = prev.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s))
            return { ...prev, sections }
        })
    }

    const addSection = () => {
        const sec = emptySection()
        setFormData((prev) => ({
            ...prev,
            sections: [...prev.sections, sec],
            questions: [...prev.questions, ...buildInitialQuestions([sec])],
        }))
    }

    const removeSection = (idx: number) => {
        setFormData((prev) => {
            const removed = prev.sections[idx]
            const sections = prev.sections.filter((_, i) => i !== idx)
            const questions = prev.questions.filter((q) => q.sectionId !== removed.id)
            return { ...prev, sections, questions }
        })
        if (currentSection >= idx && currentSection > 0) setCurrentSection((p) => p - 1)
    }

    const updateQuestion = (qId: string, patch: Partial<Question>) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
        }))
    }

    const updateOption = (qId: string, optIdx: number, patch: Partial<Option>) => {
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((q) => {
                if (q.id !== qId) return q
                const options = q.options.map((o, i) =>
                    i === optIdx ? { ...o, ...patch } : o
                ) as Question["options"]
                return { ...q, options }
            }),
        }))
    }

    // ── Rebuild questions when section numQuestions changes ──
    const syncQuestionsForSection = (secId: string, numQuestions: number) => {
        setFormData((prev) => {
            const existingForSec = prev.questions.filter((q) => q.sectionId === secId)
            const others = prev.questions.filter((q) => q.sectionId !== secId)
            let updated = [...existingForSec]
            while (updated.length < numQuestions) updated.push(emptyQuestion(secId))
            if (updated.length > numQuestions) updated = updated.slice(0, numQuestions)
            // preserve order
            const allOtherSections = prev.sections.filter((s) => s.id !== secId).map((s) => s.id)
            const ordered: Question[] = []
            for (const sId of prev.sections.map((s) => s.id)) {
                if (sId === secId) ordered.push(...updated)
                else ordered.push(...others.filter((q) => q.sectionId === sId))
            }
            return { ...prev, questions: ordered }
        })
    }

    // ── Validation ──

    const validateStep1 = (): boolean => {
        const errs: Record<string, string> = {}
        if (!formData.title.trim()) errs.title = "Test title is required"
        if (!formData.seriesId) errs.seriesId = "Please select a target test series package"
        if (!formData.durationMinutes || formData.durationMinutes < 1)
            errs.durationMinutes = "Duration must be at least 1 minute"
        if (formData.isLive && !formData.liveStartAt)
            errs.liveStartAt = "Live start time is required"
        if (formData.isLive && !formData.liveEndAt)
            errs.liveEndAt = "Live end time is required"
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const validateStep2 = (): boolean => {
        const errs: Record<string, string> = {}
        formData.sections.forEach((sec, idx) => {
            if (!sec.name.trim()) errs[`section_${idx}_name`] = "Section name required"
            if (!sec.numQuestions || sec.numQuestions < 1)
                errs[`section_${idx}_numQ`] = "Must have at least 1 question"
        })

        const sectionalTimeSum = formData.sections
            .filter((s) => s.hasSectionalTime)
            .reduce((sum, s) => sum + (s.sectionalTimeMinutes || 0), 0)

        if (sectionalTimeSum > formData.durationMinutes) {
            errs.sectionalTime = `Total sectional time (${sectionalTimeSum}m) cannot exceed total test duration (${formData.durationMinutes}m)`
        }

        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleNext = () => {
        if (step === 1 && !validateStep1()) return
        if (step === 2 && !validateStep2()) return
        if (step === 2) {
            // Rebuild question bank to match section counts
            setFormData((prev) => {
                const newQuestions: Question[] = []
                for (const sec of prev.sections) {
                    const existing = prev.questions.filter((q) => q.sectionId === sec.id)
                    const merged = [...existing]
                    while (merged.length < sec.numQuestions) merged.push(emptyQuestion(sec.id))
                    newQuestions.push(...merged.slice(0, sec.numQuestions))
                }
                return { ...prev, questions: newQuestions }
            })
        }
        setStep((s) => s + 1)
        setCurrentSection(0)
        setCurrentQIdx(0)
    }

    const handleBack = () => setStep((s) => s - 1)

    // ── Step 3 helpers ──
    const sectionForStep3 = formData.sections[currentSection]
    const questionsForCurrentSection = formData.questions.filter(
        (q) => q.sectionId === sectionForStep3?.id
    )
    const currentQ = questionsForCurrentSection[currentQIdx] ?? null

    const isQuestionFilled = (q: Question) =>
        q.textEnglish.trim() !== "" &&
        q.options.every((o) => o.english.trim() !== "") &&
        q.correctAnswer !== null

    const completedCount = formData.questions.filter(isQuestionFilled).length
    const totalQCount = formData.questions.length

    // ── AI generate by topic ──
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return
        setAiLoading(true)
        try {
            const res = await fetch("/api/exam/ai-parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "generate-topic",
                    topic: aiPrompt,
                    subject: formData.examCategory || "General Studies",
                    count: 5,
                }),
            })
            const json = await res.json()
            const generated = json.data?.questions || []
            const secId = sectionForStep3?.id
            if (secId && generated.length > 0) {
                const emptyQsForSec = formData.questions.filter(
                    (q) => q.sectionId === secId && !isQuestionFilled(q)
                )
                const toFill = emptyQsForSec.slice(0, generated.length)
                toFill.forEach((item: any, i: number) => {
                    const q = toFill[i]
                    const ansLetter = item.correctOption || "A"
                    const ansIdx = ansLetter === "A" ? 0 : ansLetter === "B" ? 1 : ansLetter === "C" ? 2 : 3
                    updateQuestion(q.id, {
                        textEnglish: item.questionEn,
                        textHindi: item.questionHi || `(हिंदी) ${item.questionEn}`,
                        options: [
                            { english: item.options[0], hindi: `(हिंदी) ${item.options[0]}` },
                            { english: item.options[1], hindi: `(हिंदी) ${item.options[1]}` },
                            { english: item.options[2], hindi: `(हिंदी) ${item.options[2]}` },
                            { english: item.options[3], hindi: `(हिंदी) ${item.options[3]}` },
                        ],
                        correctAnswer: ansIdx as 0 | 1 | 2 | 3,
                        explanationEnglish: item.explanationEn,
                        explanationHindi: `(हिंदी) ${item.explanationEn}`,
                        difficulty: item.difficulty === "HARD" ? "Hard" : item.difficulty === "EASY" ? "Easy" : "Moderate",
                    })
                })
            }
        } catch (e) {
            console.error("AI Generate error", e)
        } finally {
            setAiLoading(false)
            setShowAiModal(false)
            setBulkImportOpen(false)
            setAiPrompt("")
        }
    }

    // ── Raw paper parser ──
    const handleRawPaperParse = async () => {
        if (!rawPaperText.trim()) return
        setRawLoading(true)
        try {
            const res = await fetch("/api/exam/ai-parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "parse-text",
                    rawText: rawPaperText,
                    subject: formData.examCategory || "General Studies",
                }),
            })
            const json = await res.json()
            const parsed = json.data?.questions || []
            const secId = sectionForStep3?.id
            if (secId && parsed.length > 0) {
                const emptyQsForSec = formData.questions.filter(
                    (q) => q.sectionId === secId && !isQuestionFilled(q)
                )
                const toFill = emptyQsForSec.slice(0, parsed.length)
                toFill.forEach((item: any, i: number) => {
                    const q = toFill[i]
                    const ansLetter = item.correctOption || "A"
                    const ansIdx = ansLetter === "A" ? 0 : ansLetter === "B" ? 1 : ansLetter === "C" ? 2 : 3
                    updateQuestion(q.id, {
                        textEnglish: item.questionEn,
                        textHindi: `(हिंदी) ${item.questionEn}`,
                        options: [
                            { english: item.options[0], hindi: `(हिंदी) ${item.options[0]}` },
                            { english: item.options[1], hindi: `(हिंदी) ${item.options[1]}` },
                            { english: item.options[2], hindi: `(हिंदी) ${item.options[2]}` },
                            { english: item.options[3], hindi: `(हिंदी) ${item.options[3]}` },
                        ],
                        correctAnswer: ansIdx as 0 | 1 | 2 | 3,
                        explanationEnglish: item.explanationEn,
                        explanationHindi: `(हिंदी) ${item.explanationEn}`,
                        difficulty: "Moderate",
                    })
                })
            }
        } catch (e) {
            console.error("Raw paper parse error", e)
        } finally {
            setRawLoading(false)
            setBulkImportOpen(false)
            setRawPaperText("")
        }
    }

    // ── Flexible Question Importer (Supports 1 to 150+ Questions) ──
    const importQuestionsIntoSection = (incoming: Array<{
        questionEn: string
        questionHi?: string
        optionAEn?: string
        optionAHi?: string
        optionBEn?: string
        optionBHi?: string
        optionCEn?: string
        optionCHi?: string
        optionDEn?: string
        optionDHi?: string
        correctOption?: string | number
        explanationEn?: string
        explanationHi?: string
        difficulty?: string
        subject?: string
        topic?: string
    }>) => {
        const secId = sectionForStep3?.id
        if (!secId || incoming.length === 0) return

        setFormData((prev) => {
            const currentSecQs = prev.questions.filter((q) => q.sectionId === secId)
            const otherSecQs = prev.questions.filter((q) => q.sectionId !== secId)
            const newQuestionsForSec: Question[] = []

            incoming.forEach((item, idx) => {
                const existing = currentSecQs[idx]
                const qId = existing?.id || generateId()

                let ansIdx: 0 | 1 | 2 | 3 = 0
                if (typeof item.correctOption === "number") {
                    ansIdx = Math.min(3, Math.max(0, item.correctOption)) as 0 | 1 | 2 | 3
                } else if (typeof item.correctOption === "string") {
                    const normalized = item.correctOption.trim().toUpperCase()
                    if (normalized === "B" || normalized === "1") ansIdx = 1
                    else if (normalized === "C" || normalized === "2") ansIdx = 2
                    else if (normalized === "D" || normalized === "3") ansIdx = 3
                    else ansIdx = 0
                }

                newQuestionsForSec.push({
                    id: qId,
                    sectionId: secId,
                    textEnglish: item.questionEn || `Question ${idx + 1}`,
                    textHindi: item.questionHi || "",
                    options: [
                        { english: item.optionAEn || "", hindi: item.optionAHi || "" },
                        { english: item.optionBEn || "", hindi: item.optionBHi || "" },
                        { english: item.optionCEn || "", hindi: item.optionCHi || "" },
                        { english: item.optionDEn || "", hindi: item.optionDHi || "" },
                    ],
                    correctAnswer: ansIdx,
                    explanationEnglish: item.explanationEn || "",
                    explanationHindi: item.explanationHi || "",
                    videoUrl: "",
                    difficulty:
                        item.difficulty === "Hard" || item.difficulty === "HARD"
                            ? "Hard"
                            : item.difficulty === "Easy" || item.difficulty === "EASY"
                            ? "Easy"
                            : "Moderate",
                    subject: item.subject || prev.examCategory || "General Studies",
                    topic: item.topic || "General",
                })
            })

            // If there were previously more questions, preserve them
            if (currentSecQs.length > incoming.length) {
                newQuestionsForSec.push(...currentSecQs.slice(incoming.length))
            }

            const updatedSections = prev.sections.map((s) => {
                if (s.id === secId) {
                    return { ...s, numQuestions: newQuestionsForSec.length }
                }
                return s
            })

            const allQs = [...otherSecQs, ...newQuestionsForSec]

            return {
                ...prev,
                sections: updatedSections,
                questions: allQs,
                totalQuestions: allQs.length,
                totalMarks: allQs.length,
            }
        })

        setUploadSuccess(`🎉 Successfully imported ${incoming.length} questions into Section!`)
        setTimeout(() => setUploadSuccess(null), 4000)
    }

    // ── Bulk File Upload Handler (CSV / JSON) ──
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadError(null)
        setIsUploading(true)

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const text = (event.target?.result as string) || ""
                const fileName = file.name.toLowerCase()

                if (fileName.endsWith(".json")) {
                    const parsedJson = JSON.parse(text)
                    const items = Array.isArray(parsedJson) ? parsedJson : parsedJson.questions || []
                    if (!Array.isArray(items) || items.length === 0) {
                        throw new Error("JSON file must contain an array of question objects")
                    }

                    const normalized = items.map((item: any, i: number) => {
                        return parseAndValidateQuestion(item, i)
                    })

                    importQuestionsIntoSection(normalized)
                    setBulkImportOpen(false)
                } else {
                    // CSV parser
                    const rows = parseCSV(text)
                    if (rows.length < 2) {
                        throw new Error("CSV file must have a header row and at least one question row")
                    }

                    const headers = rows[0].map((h) => h.toLowerCase().trim())
                    const dataRows = rows.slice(1)

                    const findCol = (keywords: string[]) => {
                        return headers.findIndex((h) => keywords.some((k) => h.includes(k)))
                    }

                    const colQEn = findCol(["question (en", "questionen", "question_en", "question"])
                    const colQHi = findCol(["question (hi", "questionhi", "question_hi", "hindi"])
                    const colA = findCol(["option a (en", "optiona", "option_a", "option a", "opt a", "opta"])
                    const colAHi = findCol(["option a (hi", "optionahi", "option_a_hi"])
                    const colB = findCol(["option b (en", "optionb", "option_b", "option b", "opt b", "optb"])
                    const colBHi = findCol(["option b (hi", "optionbhi", "option_b_hi"])
                    const colC = findCol(["option c (en", "optionc", "option_c", "option c", "opt c", "optc"])
                    const colCHi = findCol(["option c (hi", "optionchi", "option_c_hi"])
                    const colD = findCol(["option d (en", "optiond", "option_d", "option d", "opt d", "optd"])
                    const colDHi = findCol(["option d (hi", "optiondhi", "option_d_hi"])
                    const colAns = findCol(["correct", "answer", "key", "ans"])
                    const colExp = findCol(["explanation (en", "explanation", "exp", "solution"])
                    const colExpHi = findCol(["explanation (hi", "explanationhi"])
                    const colDiff = findCol(["difficulty", "diff", "level"])
                    const colSubj = findCol(["subject", "subj"])
                    const colTopic = findCol(["topic"])

                    const normalized = dataRows.map((r, i) => {
                        const qEn = (colQEn !== -1 ? r[colQEn] : r[0]) || ""
                        const qHi = colQHi !== -1 ? r[colQHi] : ""
                        const optA = (colA !== -1 ? r[colA] : r[1]) || ""
                        const optAHi = colAHi !== -1 ? r[colAHi] : ""
                        const optB = (colB !== -1 ? r[colB] : r[2]) || ""
                        const optBHi = colBHi !== -1 ? r[colBHi] : ""
                        const optC = (colC !== -1 ? r[colC] : r[3]) || ""
                        const optCHi = colCHi !== -1 ? r[colCHi] : ""
                        const optD = (colD !== -1 ? r[colD] : r[4]) || ""
                        const optDHi = colDHi !== -1 ? r[colDHi] : ""
                        const ans = (colAns !== -1 ? r[colAns] : r[5]) || ""
                        const exp = (colExp !== -1 ? r[colExp] : r[6]) || ""
                        const expHi = colExpHi !== -1 ? r[colExpHi] : ""
                        const diff = colDiff !== -1 ? r[colDiff] : "Moderate"
                        const subj = colSubj !== -1 ? r[colSubj] : ""
                        const topic = colTopic !== -1 ? r[colTopic] : ""

                        return parseAndValidateQuestion({
                            questionEn: qEn,
                            questionHi: qHi,
                            optionAEn: optA,
                            optionAHi: optAHi,
                            optionBEn: optB,
                            optionBHi: optBHi,
                            optionCEn: optC,
                            optionCHi: optCHi,
                            optionDEn: optD,
                            optionDHi: optDHi,
                            correctOption: ans,
                            explanationEn: exp,
                            explanationHi: expHi,
                            difficulty: diff,
                            subject: subj,
                            topic: topic,
                        }, i)
                    })

                    importQuestionsIntoSection(normalized)
                    setBulkImportOpen(false)
                }
            } catch (err: any) {
                console.error("Bulk upload parse error:", err)
                setUploadError(err.message || "Failed to parse file. Please verify CSV or JSON formatting.")
            } finally {
                setIsUploading(false)
                e.target.value = ""
            }
        }

        reader.onerror = () => {
            setUploadError("Could not read file from disk.")
            setIsUploading(false)
        }

        reader.readAsText(file, "UTF-8")
    }

    const buildMappedSections = () => {
        return formData.sections.map((sec) => {
            const secQs = formData.questions.filter((q) => q.sectionId === sec.id)
            return {
                title: sec.name,
                titleHi: sec.nameHindi,
                positiveMarks: sec.positiveMarks,
                negativeMarks: sec.negativeMarks,
                timeLimitMins: sec.hasSectionalTime ? sec.sectionalTimeMinutes : null,
                questions: secQs.map((q) => ({
                    questionEn: q.textEnglish,
                    questionHi: q.textHindi,
                    options: q.options.map((o) => o.english),
                    optionsHi: q.options.map((o) => o.hindi),
                    correctOption: (q.correctAnswer !== null ? ["A", "B", "C", "D"][q.correctAnswer] : "A") || "A",
                    explanationEn: q.explanationEnglish,
                    explanationHi: q.explanationHindi,
                    videoUrl: q.videoUrl,
                    difficulty: q.difficulty?.toUpperCase() || "MODERATE",
                    subject: q.subject || formData.examCategory || "General Studies",
                    topic: q.topic || "",
                    positiveMarks: sec.positiveMarks,
                    negativeMarks: sec.negativeMarks,
                })),
            }
        })
    }

    const handleSaveDraft = async () => {
        if (!formData.title.trim()) {
            setApiError("Please enter a test title before saving draft.")
            setApiErrorDetails([])
            return
        }
        if (!formData.seriesId && formData.testType !== "PYQ") {
            setApiError("Please select a target test series package before saving draft.")
            setApiErrorDetails([])
            return
        }
        if (formData.testType === "PYQ" && !formData.pyqPaperId) {
            setApiError("Please select a target PYQ paper to link this test to.")
            setApiErrorDetails([])
            return
        }
        setIsSaving(true)
        setApiError(null)
        setApiErrorDetails([])
        setDraftWarnings([])
        try {
            const mappedSections = buildMappedSections()
            const mappedTestType = TEST_TYPE_MAP[formData.testType]
            if (!mappedTestType) {
                setApiError(`Invalid test type selected: "${formData.testType}". Please select a valid test type in Step 1.`)
                setApiErrorDetails([])
                setIsSaving(false)
                return
            }
            const mappedAccessMode = formData.accessMode === "free" ? "FREE" : "PRO"

            const res = await fetch("/api/exam/test/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    seriesId: formData.seriesId || undefined,
                    pyqPaperId: formData.pyqPaperId || undefined,
                    title: formData.title,
                    titleHi: formData.titleHindi,
                    testType: mappedTestType,
                    accessMode: mappedAccessMode,
                    durationMinutes: formData.durationMinutes,
                    isLive: formData.isLive,
                    liveStartAt: formData.liveStartAt || null,
                    liveEndAt: formData.liveEndAt || null,
                    sections: mappedSections,
                    isPublished: false,
                }),
            })

            const json = await res.json()
            if (!res.ok || !json.data?.id) {
                const errMsg = json.error || `Save draft failed with status ${res.status}`
                setApiError(errMsg)
                if (Array.isArray(json.details)) setApiErrorDetails(json.details)
                throw new Error(errMsg)
            }

            setSavedTestId(json.data.id)
            if (Array.isArray(json.warnings) && json.warnings.length > 0) {
                setDraftWarnings(json.warnings)
                setToastMessage(`Draft saved! Warning: ${json.warnings.length} incomplete question(s) were not saved.`)
                setShowToast(true)
            } else {
                setDraftWarnings([])
                setToastMessage(json.data.message || "Draft saved successfully!")
                setShowToast(true)
                setTimeout(() => {
                    router.push("/teacher/test-series")
                }, 1200)
            }
        } catch (e: any) {
            console.error("Failed to save draft", e)
        } finally {
            setIsSaving(false)
        }
    }

    const handlePublish = async () => {
        if (totalIncomplete > 0) {
            setApiError(`Cannot publish test: ${totalIncomplete} questions are incomplete. Finish them or save as draft.`)
            setApiErrorDetails(
                incompleteSummary.map((s) => `${s.sectionName}: Incomplete Question(s) ${s.incompleteNumbers.join(", ")}`)
            )
            return
        }
        if (!formData.title.trim()) {
            setApiError("Please enter a test title before publishing.")
            setApiErrorDetails([])
            return
        }
        if (!formData.seriesId && formData.testType !== "PYQ") {
            setApiError("Please select a target test series package before publishing.")
            setApiErrorDetails([])
            return
        }
        if (formData.testType === "PYQ" && !formData.pyqPaperId) {
            setApiError("Please select a target PYQ paper to link this test to.")
            setApiErrorDetails([])
            return
        }
        setIsSaving(true)
        setApiError(null)
        setApiErrorDetails([])
        setDraftWarnings([])
        try {
            const mappedSections = buildMappedSections()
            const mappedTestType = TEST_TYPE_MAP[formData.testType]
            if (!mappedTestType) {
                setApiError(`Invalid test type selected: "${formData.testType}". Please select a valid test type in Step 1.`)
                setApiErrorDetails([])
                setIsSaving(false)
                return
            }
            const mappedAccessMode = formData.accessMode === "free" ? "FREE" : "PRO"

            const res = await fetch("/api/exam/test/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    seriesId: formData.seriesId || undefined,
                    pyqPaperId: formData.pyqPaperId || undefined,
                    title: formData.title,
                    titleHi: formData.titleHindi,
                    testType: mappedTestType,
                    accessMode: mappedAccessMode,
                    durationMinutes: formData.durationMinutes,
                    isLive: formData.isLive,
                    liveStartAt: formData.liveStartAt || null,
                    liveEndAt: formData.liveEndAt || null,
                    sections: mappedSections,
                    isPublished: true,
                }),
            })

            const json = await res.json()
            if (!res.ok || !json.data?.id) {
                const errMsg = json.error || `Publish failed with status ${res.status}`
                setApiError(errMsg)
                if (Array.isArray(json.details)) setApiErrorDetails(json.details)
                throw new Error(errMsg)
            }

            const publishedId = json.data.id
            setSavedTestId(publishedId)
            setPublished(true)
            setToastMessage("Test published successfully! 🎉 Redirecting to tests...")
            setShowToast(true)
            setTimeout(() => {
                router.push("/teacher/test-series")
            }, 1500)
        } catch (e: any) {
            console.error("Failed to publish test", e)
        } finally {
            setIsSaving(false)
        }
    }

    // ── Computed totals across sections ──
    const computedTotalQuestions = formData.sections.reduce((s, sec) => s + sec.numQuestions, 0)
    const computedTotalMarks = formData.sections.reduce((s, sec) => s + sec.numQuestions * sec.positiveMarks, 0)
    const totalSectionQuestions = computedTotalQuestions
    const totalIncomplete = formData.questions.length - completedCount

    const incompleteSummary = formData.sections.map((sec) => {
        const secQs = formData.questions.filter((q) => q.sectionId === sec.id)
        const incompleteNumbers: number[] = []
        secQs.forEach((q, idx) => {
            if (!isQuestionFilled(q)) incompleteNumbers.push(idx + 1)
        })
        return {
            sectionName: sec.name || "Section",
            incompleteNumbers,
        }
    }).filter((item) => item.incompleteNumbers.length > 0)

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16 px-3 sm:px-6">
            {/* Toast */}
            {showToast && (
                <div className="fixed top-20 right-6 z-[9999] bg-[#00D084] text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-right-5 border-2 border-white/20">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{toastMessage || "Saved successfully!"}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href={
                                savedTestId
                                    ? `/test-series/${formData.seriesId || "upsc-prelims-2026"}?testId=${savedTestId}`
                                    : `/test-series/${formData.seriesId || "upsc-prelims-2026"}`
                            }
                            className="px-3 py-1.5 rounded-lg bg-white text-emerald-800 text-xs font-black shadow-xs transition-colors hover:bg-white/90"
                        >
                            Open Student View →
                        </Link>
                        <Link
                            href={
                                savedTestId
                                    ? `/test-series/${savedTestId}/attempt?testId=${savedTestId}&title=${encodeURIComponent(formData.title)}&questions=${formData.questions.length}&marks=${formData.questions.length}&duration=${formData.durationMinutes}`
                                    : "/test-series"
                            }
                            className="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white text-xs font-black transition-colors"
                        >
                            Preview CBT Arena
                        </Link>
                        <Link
                            href="/teacher/test-series"
                            className="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white text-xs font-extrabold transition-colors"
                        >
                            Teacher Dashboard
                        </Link>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Link
                        href="/teacher/classes"
                        className="text-xs text-gray-600 dark:text-gray-300 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-1 mb-1"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Back to Classes
                    </Link>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                        Test Authoring Studio
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        Create a new test with bilingual question support
                    </p>
                </div>
                <StepIndicator current={step} />
            </div>

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* STEP 1: Test Metadata */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {step === 1 && (
                <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <CardHeader
                        title="Step 1 — Test Metadata"
                        subtitle="Basic information about this test"
                    />
                    <div className="p-6 space-y-5">
                        {/* Title */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Test Title <span className="text-[#EF4444]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => updateField("title", e.target.value)}
                                    placeholder="e.g. 72nd BPSC Prelims Full Mock Test 1"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 transition-all"
                                />
                                <FieldError msg={errors.title} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Test Title (Hindi){" "}
                                    <span className="text-gray-500 dark:text-gray-400 font-normal">optional</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.titleHindi}
                                    onChange={(e) => updateField("titleHindi", e.target.value)}
                                    placeholder="e.g. 72वीं बीपीएससी प्रारंभिक मॉक टेस्ट 1"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Target Test Series (Parent Series) */}
                        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <label className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-[#00A8FF]" />
                                    <span>Target Test Series Package <span className="text-[#EF4444]">*</span></span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateSeriesModalOpen(true)}
                                    className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>+ Create New Series Package</span>
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300 font-normal">Controls which public test series flash card and details page this test belongs to</p>
                            <select
                                value={formData.seriesId}
                                onChange={(e) => {
                                    const sid = e.target.value
                                    const seriesMatch = seriesPackages.find((s) => s.id === sid)
                                    setFormData((prev) => ({
                                        ...prev,
                                        seriesId: sid,
                                        examCategory: seriesMatch ? seriesMatch.category : "",
                                        examName: seriesMatch ? seriesMatch.title : "",
                                    }))
                                    setErrors((prev) => {
                                        const next = { ...prev }
                                        delete next.seriesId
                                        return next
                                    })
                                }}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 transition-all shadow-xs"
                            >
                                <option value="">Select a test series package...</option>
                                {seriesPackages.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.title} ({s.category})
                                    </option>
                                ))}
                            </select>
                            <FieldError msg={errors.seriesId} />
                        </div>

                        {/* Category & Exam Name (Read-only, derived) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Exam Category <span className="text-gray-400 font-normal">(derived from package)</span>
                                </label>
                                <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-sm font-medium text-gray-800 dark:text-gray-200 select-none">
                                    {formData.examCategory || <span className="text-gray-400 italic font-normal">Choose a package above</span>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Exam Name <span className="text-gray-400 font-normal">(derived from package)</span>
                                </label>
                                <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-sm font-medium text-gray-800 dark:text-gray-200 select-none">
                                    {formData.examName || <span className="text-gray-400 italic font-normal">Choose a package above</span>}
                                </div>
                            </div>
                        </div>

                        {/* Test Type */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Test Type <span className="text-[#EF4444]">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {TEST_TYPES.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => updateField("testType", type)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            formData.testType === type
                                                ? "bg-sky-700 border-sky-700 text-white shadow-sm"
                                                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-sky-500/50 hover:text-sky-700 dark:hover:text-sky-400"
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* PYQ Paper Selector when testType is PYQ */}
                        {formData.testType === "PYQ" && (
                            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
                                <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                                    Target PYQ Paper <span className="text-[#EF4444]">*</span>
                                </label>
                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                    Choose the PYQ paper to link this CBT test with. Questions imported via JSON will power this test.
                                </p>
                                {paperWarning && (
                                    <div
                                        data-testid="paper-warning"
                                        className="p-3 bg-amber-100/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs rounded-xl flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                        <span>{paperWarning}</span>
                                    </div>
                                )}

                                {pyqFetchError && (
                                    <div
                                        data-testid="pyq-fetch-error"
                                        className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 text-xs rounded-xl flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                        <span>{pyqFetchError}</span>
                                    </div>
                                )}

                                <select
                                    value={formData.pyqPaperId || ""}
                                    onChange={(e) => {
                                        const pId = e.target.value
                                        const p = pyqPapers.find((item) => item.id === pId)
                                        updateField("pyqPaperId", pId)
                                        setPaperWarning(null)
                                        if (p && !formData.title) {
                                            updateField("title", `${p.title} - Official CBT Mock`)
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-[#00A8FF]"
                                    aria-label="Select PYQ Paper"
                                >
                                    <option value="">-- Select PYQ Paper --</option>
                                    {pyqPapers.map((paper) => (
                                        <option key={paper.id} value={paper.id}>
                                            {paper.title} ({paper.year} • {paper.stage || "Prelims"} • Status: {paper.status})
                                        </option>
                                    ))}
                                </select>
                                {pyqPapers.length === 0 && !loadingPyqPapers && !pyqFetchError && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                        No PYQ papers found. Please upload a PYQ paper first in the PYQ studio.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Access Mode */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Access Mode
                            </label>
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                                <button
                                    type="button"
                                    onClick={() => updateField("accessMode", "free")}
                                    className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                        formData.accessMode === "free"
                                            ? "bg-emerald-700 border-emerald-700 text-white shadow-sm"
                                            : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                    }`}
                                >
                                    <Circle className="h-3.5 w-3.5" />
                                    Free Test
                                    {formData.accessMode === "free" && (
                                        <span className="ml-1 px-2 py-0.5 bg-white text-emerald-950 rounded-full text-[10px] font-black">
                                             ACTIVE
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateField("accessMode", "pro")}
                                    className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                        formData.accessMode === "pro"
                                            ? "bg-purple-700 border-purple-700 text-white shadow-sm"
                                            : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                    }`}
                                >
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Pass Pro Exclusive
                                    {formData.accessMode === "pro" && (
                                        <span className="ml-1 px-2 py-0.5 bg-white text-purple-950 rounded-full text-[10px] font-black">
                                            PRO
                                        </span>
                                    )}
                                </button>
                            </div>
                            {formData.accessMode === "free" && (
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1.5">
                                    ✓ This test will be visible and accessible to all users for free.
                                </p>
                            )}
                            {formData.accessMode === "pro" && (
                                <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mt-1.5">
                                    🔒 This test requires an active aspirantbook Pass subscription.
                                </p>
                            )}
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                Duration (minutes) <span className="text-[#EF4444]">*</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={formData.durationMinutes}
                                onChange={(e) =>
                                    updateField("durationMinutes", parseInt(e.target.value) || 0)
                                }
                                className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 transition-all"
                            />
                            <FieldError msg={errors.durationMinutes} />
                        </div>

                        {/* Is Live Toggle */}
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                        Live Test
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Schedule this as a timed live event with a start and end window.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateField("isLive", !formData.isLive)}
                                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                                        formData.isLive ? "bg-[#00A8FF]" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                            formData.isLive ? "translate-x-5" : ""
                                        }`}
                                    />
                                </button>
                            </div>
                            {formData.isLive && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Live Start <span className="text-[#EF4444]">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.liveStartAt}
                                            onChange={(e) =>
                                                updateField("liveStartAt", e.target.value)
                                            }
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                        />
                                        <FieldError msg={errors.liveStartAt} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                            Live End <span className="text-[#EF4444]">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.liveEndAt}
                                            onChange={(e) =>
                                                updateField("liveEndAt", e.target.value)
                                            }
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                        />
                                        <FieldError msg={errors.liveEndAt} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-7 py-3 bg-sky-700 hover:bg-sky-600 text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* STEP 2: Sections & Marking Scheme */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {step === 2 && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <CardHeader
                            title="Step 2 — Sections & Marking Scheme"
                            subtitle="Define test sections and per-question scoring rules"
                        />
                        <div className="p-6 space-y-4">
                            {formData.sections.map((sec, idx) => (
                                <div
                                    key={sec.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4 bg-gray-50/50 dark:bg-white/3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="h-4 w-4 text-gray-400" />
                                            <span className="text-xs font-black text-[#00A8FF] uppercase tracking-wider">
                                                Section {idx + 1}
                                            </span>
                                        </div>
                                        {formData.sections.length > 1 && (
                                            <button
                                                onClick={() => removeSection(idx)}
                                                className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                                                title="Remove section"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Section Name (English){" "}
                                                <span className="text-[#EF4444]">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={sec.name}
                                                onChange={(e) =>
                                                    updateSection(idx, { name: e.target.value })
                                                }
                                                placeholder="e.g. General Studies"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            />
                                            <FieldError msg={errors[`section_${idx}_name`]} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Section Name (Hindi){" "}
                                                <span className="text-gray-400 font-normal">optional</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={sec.nameHindi}
                                                onChange={(e) =>
                                                    updateSection(idx, { nameHindi: e.target.value })
                                                }
                                                placeholder="e.g. सामान्य अध्ययन"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Questions <span className="text-[#EF4444]">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={sec.numQuestions}
                                                onChange={(e) => {
                                                    const v = parseInt(e.target.value) || 1
                                                    updateSection(idx, { numQuestions: v })
                                                    syncQuestionsForSection(sec.id, v)
                                                }}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            />
                                            <FieldError msg={errors[`section_${idx}_numQ`]} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                +ve Marks
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.25}
                                                value={sec.positiveMarks}
                                                onChange={(e) =>
                                                    updateSection(idx, {
                                                        positiveMarks: parseFloat(e.target.value) || 0,
                                                    })
                                                }
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                −ve Marks
                                            </label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={
                                                        NEGATIVE_MARK_OPTIONS.includes(sec.negativeMarks as any)
                                                            ? sec.negativeMarks
                                                            : "custom"
                                                    }
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        if (val === "custom") {
                                                            updateSection(idx, { negativeMarks: 0.25 })
                                                        } else {
                                                            updateSection(idx, { negativeMarks: parseFloat(val) })
                                                        }
                                                    }}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                                >
                                                    {NEGATIVE_MARK_OPTIONS.map((v) => (
                                                        <option key={v} value={v}>
                                                            {v === 0 ? "No negative marking" : `-${v}`}
                                                        </option>
                                                    ))}
                                                    <option value="custom">Custom value...</option>
                                                </select>
                                                {!NEGATIVE_MARK_OPTIONS.includes(sec.negativeMarks as any) && (
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={sec.negativeMarks}
                                                        onChange={(e) => {
                                                            const v = parseFloat(e.target.value)
                                                            updateSection(idx, { negativeMarks: isNaN(v) ? 0 : v })
                                                        }}
                                                        placeholder="0.75"
                                                        className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sectional time */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateSection(idx, {
                                                        hasSectionalTime: !sec.hasSectionalTime,
                                                    })
                                                }
                                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                                                    sec.hasSectionalTime
                                                        ? "bg-[#00A8FF]"
                                                        : "bg-gray-300 dark:bg-gray-600"
                                                }`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                        sec.hasSectionalTime ? "translate-x-4" : ""
                                                    }`}
                                                />
                                            </button>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                Sectional Time Limit
                                            </span>
                                        </div>
                                        {sec.hasSectionalTime && (
                                             <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={sec.sectionalTimeMinutes}
                                                    onChange={(e) =>
                                                        updateSection(idx, {
                                                            sectionalTimeMinutes:
                                                                parseInt(e.target.value) || 1,
                                                        })
                                                    }
                                                    className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                                />
                                                <span className="text-xs text-gray-500">minutes</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addSection}
                                className="w-full py-3 border-2 border-dashed border-[#00A8FF]/40 hover:border-[#00A8FF] text-[#00A8FF] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer hover:bg-[#00A8FF]/5"
                            >
                                <Plus className="h-4 w-4" />
                                Add Section
                            </button>

                            {errors.sectionalTime && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-semibold">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>{errors.sectionalTime}</span>
                                </div>
                            )}

                            {/* Totals summary live footer */}
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-[#00A8FF]" />
                                    <span>
                                        <span className="font-black text-gray-900 dark:text-white">
                                            {formData.sections.length}
                                        </span>{" "}
                                        section{formData.sections.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 sm:gap-6">
                                    <span>
                                        Total Questions:{" "}
                                        <span className="font-black text-gray-900 dark:text-white">
                                            {computedTotalQuestions}
                                        </span>
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                    <span>
                                        Total Marks:{" "}
                                        <span className="font-black text-[#00D084]">
                                            {computedTotalMarks}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-7 py-3 bg-[#00A8FF] hover:bg-[#0096e6] text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* STEP 3: Question Authoring Studio */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {step === 3 && (
                <div className="space-y-4">
                    {/* Progress bar */}
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                Questions Complete
                            </span>
                            <span className="text-xs font-black text-[#00A8FF]">
                                {completedCount} of {totalQCount} complete
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#00A8FF] to-[#00D084] rounded-full transition-all duration-500"
                                style={{
                                    width: `${totalQCount > 0 ? (completedCount / totalQCount) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Left: Navigator */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Section Tabs */}
                            {formData.sections.length > 1 && (
                                <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-gradient-to-r from-[#F3ECFF] via-[#F8F5FF] to-white dark:from-[#0a1f38] dark:via-[#0c2442] dark:to-[#071d33] border-b border-purple-100 dark:border-gray-800">
                                        <p className="text-xs font-black text-gray-700 dark:text-gray-200">Sections</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {formData.sections.map((sec, idx) => {
                                            const qsForSec = formData.questions.filter(
                                                (q) => q.sectionId === sec.id
                                            )
                                            const filled = qsForSec.filter(isQuestionFilled).length
                                            return (
                                                <button
                                                    key={sec.id}
                                                    onClick={() => {
                                                        setCurrentSection(idx)
                                                        setCurrentQIdx(0)
                                                    }}
                                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                        currentSection === idx
                                                            ? "bg-[#00A8FF] text-white"
                                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                                    }`}
                                                >
                                                    <span className="block truncate">
                                                        {sec.name || `Section ${idx + 1}`}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] font-normal ${
                                                            currentSection === idx
                                                                ? "text-white/80"
                                                                : "text-gray-400"
                                                        }`}
                                                    >
                                                        {filled}/{qsForSec.length} complete
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Question Navigator Palette */}
                            <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-gradient-to-r from-[#F3ECFF] via-[#F8F5FF] to-white dark:from-[#0a1f38] dark:via-[#0c2442] dark:to-[#071d33] border-b border-purple-100 dark:border-gray-800">
                                    <p className="text-xs font-black text-gray-700 dark:text-gray-200">
                                        {sectionForStep3?.name || "Section"} — Navigator
                                    </p>
                                </div>
                                <div className="p-3">
                                    <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
                                        {questionsForCurrentSection.map((q, qi) => {
                                            const done = isQuestionFilled(q)
                                            const active = qi === currentQIdx
                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={() => setCurrentQIdx(qi)}
                                                    className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                                                        active
                                                            ? "bg-[#00A8FF] text-white border-[#00A8FF] shadow-sm scale-105"
                                                            : done
                                                            ? "bg-[#00D084]/15 text-[#00D084] border-[#00D084]/30"
                                                            : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 hover:border-amber-400"
                                                    }`}
                                                    title={`Q${qi + 1}: ${done ? "Complete" : "Incomplete"}`}
                                                >
                                                    {qi + 1}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded bg-[#00D084]/30 inline-block" />
                                            Complete
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />
                                            Incomplete
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded bg-[#00A8FF] inline-block" />
                                            Current
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bulk Import Button */}
                            <button
                                onClick={() => setBulkImportOpen(true)}
                                className="w-full py-2.5 border border-[#9333EA]/40 text-[#9333EA] rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#9333EA]/5 transition-all cursor-pointer"
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Bulk Import / AI Generate
                            </button>
                        </div>

                        {/* Right: Question Editor */}
                        {currentQ && (
                            <div className="lg:col-span-9 bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gradient-to-r from-[#F3ECFF] via-[#F8F5FF] to-white dark:from-[#0a1f38] dark:via-[#0c2442] dark:to-[#071d33] border-b border-purple-100 dark:border-gray-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-gray-800 dark:text-white">
                                            Question {currentQIdx + 1} of{" "}
                                            {questionsForCurrentSection.length}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {sectionForStep3?.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isQuestionFilled(currentQ) ? (
                                            <span className="flex items-center gap-1 text-[#00D084] text-xs font-bold">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Complete
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                Incomplete
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Question Text — Bilingual Panes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Question Text (English){" "}
                                                <span className="text-[#EF4444]">*</span>
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={currentQ.textEnglish}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        textEnglish: e.target.value,
                                                    })
                                                }
                                                placeholder="Type the question in English…"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 resize-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Question Text (Hindi)
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={currentQ.textHindi}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        textHindi: e.target.value,
                                                    })
                                                }
                                                placeholder="प्रश्न हिंदी में टाइप करें…"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 resize-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Options */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                            Answer Options{" "}
                                            <span className="text-gray-400 font-normal">
                                                — click radio to mark correct answer
                                            </span>
                                        </label>
                                        <div className="space-y-2.5">
                                            {(["A", "B", "C", "D"] as const).map((letter, oi) => {
                                                const isCorrect = currentQ.correctAnswer === oi
                                                return (
                                                    <div
                                                        key={letter}
                                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                                            isCorrect
                                                                ? "border-[#00D084] bg-[#00D084]/5"
                                                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50"
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            data-testid={`authoring-correct-${letter}`}
                                                            onClick={() =>
                                                                updateQuestion(currentQ.id, {
                                                                    correctAnswer: oi as 0 | 1 | 2 | 3,
                                                                })
                                                            }
                                                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                                                                isCorrect
                                                                    ? "border-[#00D084] bg-[#00D084]"
                                                                    : "border-gray-300 dark:border-gray-600 hover:border-[#00D084]"
                                                            }`}
                                                        >
                                                            {isCorrect && (
                                                                <span className="w-2 h-2 bg-white rounded-full" />
                                                            )}
                                                        </button>
                                                        <span
                                                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 ${
                                                                isCorrect
                                                                    ? "bg-[#00D084] text-white"
                                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                            }`}
                                                        >
                                                            {letter}
                                                        </span>
                                                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <input
                                                                type="text"
                                                                value={currentQ.options[oi].english}
                                                                onChange={(e) =>
                                                                    updateOption(currentQ.id, oi, {
                                                                        english: e.target.value,
                                                                    })
                                                                }
                                                                placeholder={`Option ${letter} (English)`}
                                                                className="w-full min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:border-[#00A8FF] focus:ring-1 focus:ring-[#00A8FF]/20"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={currentQ.options[oi].hindi}
                                                                onChange={(e) =>
                                                                    updateOption(currentQ.id, oi, {
                                                                        hindi: e.target.value,
                                                                    })
                                                                }
                                                                placeholder={`विकल्प ${letter} (Hindi)`}
                                                                className="w-full min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:border-[#00A8FF] focus:ring-1 focus:ring-[#00A8FF]/20"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {currentQ.correctAnswer === null && (
                                            <p className="text-[#EF4444] text-xs mt-1.5 font-medium">
                                                Select the correct answer by clicking the radio button.
                                            </p>
                                        )}
                                    </div>

                                    {/* Explanation */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Explanation (English)
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={currentQ.explanationEnglish}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        explanationEnglish: e.target.value,
                                                    })
                                                }
                                                placeholder="Explain why the correct answer is right…"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                Explanation (Hindi)
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={currentQ.explanationHindi}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        explanationHindi: e.target.value,
                                                    })
                                                }
                                                placeholder="उत्तर की व्याख्या हिंदी में…"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Meta Row */}
                                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                <BarChart3 className="inline h-3 w-3 mr-1" />
                                                Difficulty
                                            </label>
                                            <select
                                                value={currentQ.difficulty}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        difficulty: e.target.value as Question["difficulty"],
                                                    })
                                                }
                                                className="w-full min-w-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            >
                                                <option>Easy</option>
                                                <option>Moderate</option>
                                                <option>Hard</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                <Tag className="inline h-3 w-3 mr-1" />
                                                Subject
                                            </label>
                                            <input
                                                type="text"
                                                value={currentQ.subject}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        subject: e.target.value,
                                                    })
                                                }
                                                placeholder="e.g. History"
                                                className="w-full min-w-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                <Tag className="inline h-3 w-3 mr-1" />
                                                Topic
                                            </label>
                                            <input
                                                type="text"
                                                value={currentQ.topic}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        topic: e.target.value,
                                                    })
                                                }
                                                placeholder="e.g. Maurya Period"
                                                className="w-full min-w-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                                <Video className="inline h-3 w-3 mr-1" />
                                                Video URL
                                            </label>
                                            <input
                                                type="url"
                                                value={currentQ.videoUrl}
                                                onChange={(e) =>
                                                    updateQuestion(currentQ.id, {
                                                        videoUrl: e.target.value,
                                                    })
                                                }
                                                placeholder="https://youtube.com/…"
                                                className="w-full min-w-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20"
                                            />
                                        </div>
                                    </div>

                                    {/* Q Navigation */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <button
                                            disabled={currentQIdx === 0}
                                            onClick={() => setCurrentQIdx((p) => p - 1)}
                                            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Prev
                                        </button>

                                        <button
                                            onClick={() => {
                                                // Save & advance to next unfilled or next
                                                const nextEmpty = questionsForCurrentSection.findIndex(
                                                    (q, i) => i > currentQIdx && !isQuestionFilled(q)
                                                )
                                                if (nextEmpty !== -1) setCurrentQIdx(nextEmpty)
                                                else if (
                                                    currentQIdx <
                                                    questionsForCurrentSection.length - 1
                                                )
                                                    setCurrentQIdx((p) => p + 1)
                                            }}
                                            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#00D084] hover:bg-[#00ba76] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                                        >
                                            <Save className="h-3.5 w-3.5" />
                                            Save & Next
                                        </button>

                                        <button
                                            disabled={
                                                currentQIdx === questionsForCurrentSection.length - 1
                                            }
                                            onClick={() => setCurrentQIdx((p) => p + 1)}
                                            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <button
                            onClick={handleBack}
                            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs sm:text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer w-full sm:w-auto"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Sections
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer w-full sm:w-auto"
                        >
                            Preview & Publish
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* STEP 4: Preview & Publish */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {step === 4 && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <CardHeader
                            title="Step 4 — Preview & Publish"
                            subtitle="Review your test before publishing to students"
                        />
                        <div className="p-6 space-y-5">
                            {/* Summary Card */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                                            Test Overview
                                        </p>
                                        <h3 className="text-base font-black text-gray-900 dark:text-white leading-snug">
                                            {formData.title || "Untitled Test"}
                                        </h3>
                                        {formData.titleHindi && (
                                            <p className="text-xs text-gray-500">{formData.titleHindi}</p>
                                        )}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className="px-2.5 py-1 bg-[#00A8FF]/10 text-[#00A8FF] text-[10px] font-black rounded-lg border border-[#00A8FF]/20">
                                                {formData.testType}
                                            </span>
                                            <span
                                                className={`px-2.5 py-1 text-[10px] font-black rounded-lg border ${
                                                    formData.accessMode === "free"
                                                        ? "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20"
                                                        : "bg-[#9333EA]/10 text-[#9333EA] border-[#9333EA]/20"
                                                }`}
                                            >
                                                {formData.accessMode === "free"
                                                    ? "FREE"
                                                    : "PASS PRO"}
                                            </span>
                                            {formData.isLive && (
                                                <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-black rounded-lg">
                                                    LIVE
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            {
                                                label: "Duration",
                                                val: `${formData.durationMinutes}m`,
                                                color: "text-[#00A8FF]",
                                            },
                                            {
                                                label: "Questions",
                                                val: computedTotalQuestions,
                                                color: "text-[#9333EA]",
                                            },
                                            {
                                                label: "Total Marks",
                                                val: computedTotalMarks,
                                                color: "text-[#00D084]",
                                            },
                                        ].map(({ label, val, color }) => (
                                            <div
                                                key={label}
                                                className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 text-center"
                                            >
                                                <p className={`text-xl font-black ${color}`}>{val}</p>
                                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                                    {label}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sections breakdown */}
                                <div className="space-y-2">
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                                        Sections
                                    </p>
                                    {formData.sections.map((sec) => {
                                        const qsForSec = formData.questions.filter(
                                            (q) => q.sectionId === sec.id
                                        )
                                        const filled = qsForSec.filter(isQuestionFilled).length
                                        const pct =
                                            qsForSec.length > 0
                                                ? (filled / qsForSec.length) * 100
                                                : 0
                                        return (
                                            <div
                                                key={sec.id}
                                                className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                        {sec.name || "Unnamed Section"}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-semibold">
                                                        {filled}/{qsForSec.length} complete
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            pct === 100
                                                                ? "bg-[#00D084]"
                                                                : pct > 50
                                                                ? "bg-[#00A8FF]"
                                                                : "bg-amber-400"
                                                        }`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                                    <span>+{sec.positiveMarks} / −{sec.negativeMarks}</span>
                                                    {sec.hasSectionalTime && (
                                                        <span>⏱ {sec.sectionalTimeMinutes} min limit</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Incomplete questions warning banner */}
                            {totalIncomplete > 0 && (
                                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
                                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                            {totalIncomplete} question{totalIncomplete !== 1 ? "s" : ""} incomplete. Save as draft, or finish them to publish.
                                        </p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400">
                                            Questions must have English text, all 4 options, and a selected correct answer to be published.
                                        </p>
                                        {incompleteSummary.length > 0 && (
                                            <div className="mt-2 space-y-1 pt-1.5 border-t border-amber-200/70 dark:border-amber-700/40">
                                                {incompleteSummary.map((s, idx) => (
                                                    <div key={idx} className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                                                        <span className="font-bold">{s.sectionName}:</span> Incomplete Question(s) {s.incompleteNumbers.join(", ")}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Real API Error feedback */}
                            {apiError && (
                                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        <span>{apiError}</span>
                                    </div>
                                    {apiErrorDetails.length > 0 && (
                                        <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 pl-2 space-y-1">
                                            {apiErrorDetails.map((det, i) => (
                                                <li key={i}>{det}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Draft Warnings feedback */}
                            {draftWarnings.length > 0 && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900/50 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>Draft saved! Notice: {draftWarnings.length} incomplete question(s) were not saved:</span>
                                    </div>
                                    <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 pl-2 space-y-1">
                                        {draftWarnings.map((warn, i) => (
                                            <li key={i}>{warn}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {published && (
                                <div className="p-5 bg-gradient-to-r from-[#00D084]/15 to-emerald-500/10 border-2 border-[#00D084]/40 rounded-2xl space-y-3">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-6 w-6 text-[#00D084] flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-base font-black text-[#00A86B] dark:text-[#00D084]">
                                                Test published successfully! 🎉
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                                Your {formData.questions.length}-question test is now live on the student portal and ready for attempts.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex flex-wrap items-center gap-3">
                                        <Link
                                            href={`/test-series/${formData.seriesId || "upsc-prelims-2026"}?testId=${savedTestId}`}
                                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5"
                                        >
                                            <span>Open Student View →</span>
                                        </Link>
                                        <Link
                                            href={`/test-series/${savedTestId}/attempt?testId=${savedTestId}&title=${encodeURIComponent(formData.title)}&questions=${formData.questions.length}&marks=${computedTotalMarks}&duration=${formData.durationMinutes}`}
                                            className="px-4 py-2.5 rounded-xl bg-[#00A8FF] hover:bg-[#0096e6] text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5"
                                        >
                                            <span>Preview in CBT Arena →</span>
                                        </Link>
                                        <Link
                                            href="/teacher/test-series"
                                            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                        >
                                            Teacher Dashboard
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Questions
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPreview(true)}
                                className="flex items-center gap-2 px-5 py-3 border border-[#00A8FF] text-[#00A8FF] font-bold text-sm rounded-xl hover:bg-[#00A8FF]/10 transition-all cursor-pointer"
                            >
                                <Eye className="h-4 w-4" />
                                Preview
                            </button>
                            <button
                                disabled={isSaving}
                                onClick={handleSaveDraft}
                                className="flex items-center gap-2 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? "Saving..." : "Save Draft"}
                            </button>
                            <button
                                disabled={isSaving || totalIncomplete > 0}
                                onClick={handlePublish}
                                className={`flex items-center gap-2 px-8 py-3 text-white font-black text-sm rounded-xl shadow-lg transition-all ${
                                    totalIncomplete > 0 || isSaving
                                        ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-60"
                                        : "bg-[#00A8FF] hover:bg-[#0096e6] active:scale-[0.98] cursor-pointer"
                                }`}
                            >
                                <Rocket className="h-4 w-4" />
                                {isSaving ? "Publishing..." : "Publish Test"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* BULK IMPORT / AI MODAL */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {bulkImportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-x-hidden">
                    <div
                        style={{ maxWidth: "min(32rem, calc(100vw - 32px))" }}
                        className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto overflow-x-hidden box-border"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-black text-gray-900 dark:text-white break-words">
                                    Bulk Import / AI Generate
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                                    Import from Excel/CSV or use AI to auto-generate questions
                                </p>
                            </div>
                            <button
                                onClick={() => setBulkImportOpen(false)}
                                className="shrink-0 p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                aria-label="Close bulk import modal"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Alerts for upload feedback */}
                        {uploadError && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Upload Error</p>
                                    <p>{uploadError}</p>
                                </div>
                            </div>
                        )}

                        {uploadSuccess && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <Check className="h-4 w-4 shrink-0" />
                                <span className="font-bold">{uploadSuccess}</span>
                            </div>
                        )}

                        {/* Download Templates & File Upload */}
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    Excel, CSV or JSON File Import
                                </p>
                                <span className="text-[10px] text-gray-500 font-semibold">Supports up to 150+ Qs</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={downloadSampleCsv}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[#00A8FF]/40 text-sky-700 dark:text-sky-400 rounded-xl text-xs font-bold hover:bg-[#00A8FF]/5 transition-all cursor-pointer min-w-0"
                                >
                                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Download CSV Template</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={downloadSampleJson}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 border border-purple-400 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer min-w-0"
                                >
                                    <Code2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Download JSON Template</span>
                                </button>
                            </div>

                            <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-[#00A8FF]/40 hover:border-[#00A8FF] bg-blue-50/20 dark:bg-blue-900/10 rounded-xl cursor-pointer transition-all">
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-[#00A8FF] border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs font-bold text-[#00A8FF]">
                                            Reading and importing questions…
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-6 w-6 text-[#00A8FF]" />
                                        <div className="text-center">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                                                Click to upload .CSV or .JSON file
                                            </span>
                                            <span className="text-[11px] text-gray-600 dark:text-gray-400">
                                                Automatically populates questions, options, and answer keys
                                            </span>
                                        </div>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept=".csv,.json,text/csv,application/json"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* AI Generate by Topic */}
                        <div className="p-4 bg-gradient-to-r from-[#F3ECFF] to-white dark:from-[#1a0b2e] dark:to-[#071d33] rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-3">
                            <div className="flex items-center gap-2">
                                <Wand2 className="h-4 w-4 text-[#9333EA]" />
                                <p className="text-xs font-bold text-[#9333EA]">
                                    AI Question Generator (By Topic)
                                </p>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300">
                                Enter an exam topic to automatically generate 5 high-yield MCQs with bilingual options and explanations.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g. Indian Constitution Polity"
                                    className="w-full min-w-0 px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 text-xs focus:outline-hidden focus:border-[#9333EA]"
                                />
                                <button
                                    onClick={handleAiGenerate}
                                    disabled={aiLoading || !aiPrompt.trim()}
                                    className="w-full sm:w-auto shrink-0 px-4 py-2 bg-[#9333EA] hover:bg-[#7c22d4] text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                    {aiLoading ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Generating…
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="h-3.5 w-3.5" />
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Paste Raw Paper */}
                        <div className="p-4 bg-gradient-to-r from-blue-50/70 to-white dark:from-[#0a1c33] dark:to-[#071d33] rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-3">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-sky-700 dark:text-sky-400" />
                                <p className="text-xs font-bold text-sky-700 dark:text-sky-400">
                                    AI Raw Paper Ingestion (Paste Exam Paper)
                                </p>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300">
                                Paste raw questions from Word/PDF with A/B/C/D choices. The engine will auto-detect questions, options, and answer keys.
                            </p>
                            <textarea
                                rows={3}
                                value={rawPaperText}
                                onChange={(e) => setRawPaperText(e.target.value)}
                                placeholder="1. Who was the first President of India? A) Nehru B) Patel C) Rajendra Prasad D) Ambedkar Ans: C Exp: ..."
                                className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-xs font-mono focus:outline-hidden focus:border-[#00A8FF]"
                            />
                            <button
                                onClick={handleRawPaperParse}
                                disabled={rawLoading || !rawPaperText.trim()}
                                className="w-full py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            >
                                {rawLoading ? (
                                    <>
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Parsing Questions…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Parse &amp; Import to Section
                                    </>
                                )}
                            </button>
                        </div>

                        <button
                            onClick={() => setBulkImportOpen(false)}
                            className="w-full py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* PREVIEW MODAL */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white dark:bg-[#071d33] border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#00A8FF]">
                                    Student Preview Mode
                                </span>
                                <h3 className="text-base font-black text-gray-900 dark:text-white mt-0.5">
                                    {formData.title || "Untitled Test"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Test Info Strip */}
                            <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700">
                                <span>⏱ {formData.durationMinutes} minutes</span>
                                <span>·</span>
                                <span>📝 {totalSectionQuestions} questions</span>
                                <span>·</span>
                                <span>🏆 {formData.totalMarks} marks</span>
                                <span>·</span>
                                <span className={formData.accessMode === "free" ? "text-[#00D084] font-bold" : "text-[#9333EA] font-bold"}>
                                    {formData.accessMode === "free" ? "Free" : "Pass Pro"}
                                </span>
                            </div>

                            {/* Sections & Questions */}
                            {formData.sections.map((sec) => {
                                const qs = formData.questions.filter(
                                    (q) => q.sectionId === sec.id
                                )
                                return (
                                    <div key={sec.id} className="space-y-3">
                                        <h4 className="text-sm font-black text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                                            {sec.name}{" "}
                                            <span className="text-xs font-semibold text-gray-400">
                                                ({qs.length} questions · +{sec.positiveMarks} / −
                                                {sec.negativeMarks})
                                            </span>
                                        </h4>
                                        {qs.slice(0, 3).map((q, qi) => (
                                            <div
                                                key={q.id}
                                                className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2.5 bg-white dark:bg-gray-900/50"
                                            >
                                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                    Q{qi + 1}.{" "}
                                                    {q.textEnglish || (
                                                        <span className="text-gray-400 italic">
                                                            (No question text yet)
                                                        </span>
                                                    )}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {q.options.map((opt, oi) => (
                                                        <div
                                                            key={oi}
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
                                                                q.correctAnswer === oi
                                                                    ? "bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084] font-bold"
                                                                    : "border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400"
                                                            }`}
                                                        >
                                                            <span className="font-black w-4">
                                                                {["A", "B", "C", "D"][oi]}.
                                                            </span>
                                                            {opt.english || (
                                                                <span className="italic text-gray-300">
                                                                    empty
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {qs.length > 3 && (
                                            <p className="text-xs text-gray-400 text-center font-semibold">
                                                + {qs.length - 3} more questions in this section
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Test Series Package Modal */}
            <CreateSeriesModal
                isOpen={isCreateSeriesModalOpen}
                onClose={() => setIsCreateSeriesModalOpen(false)}
                defaultCategory={formData.examCategory || "UPSC"}
                onCreated={(newPkg) => {
                    setSeriesPackages((prev) => [newPkg, ...prev.filter((p) => p.id !== newPkg.id)])
                    setFormData((prev) => ({
                        ...prev,
                        seriesId: newPkg.id,
                        examCategory: newPkg.category,
                        examName: newPkg.title,
                    }))
                    setErrors((prev) => {
                        const next = { ...prev }
                        delete next.seriesId
                        return next
                    })
                }}
            />
        </div>
    )
}

export default function CreateTestPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-gray-500">Loading Test Authoring Studio…</div>}>
            <CreateTestContent />
        </Suspense>
    )
}
