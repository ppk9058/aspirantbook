"use client"

import { useState, useCallback, Suspense, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { parseAndValidateQuestion } from "@/lib/exam/question-parser"
import { processBulkJsonImport, naturalSortFiles, type BulkJsonPipelineResult } from "@/lib/exam/bulk-json-pipeline"
import CreateSeriesModal from "@/components/exam/CreateSeriesModal"
import ReviewAllQuestions from "@/components/exam/ReviewAllQuestions"
import { useGoal } from "@/components/providers/GoalProvider"
import { TEST_TYPE_LABELS, formatTestType } from "@/lib/exam/labels"
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
    Loader2,
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
    syllabus: string
    syllabusHindi: string
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
    month?: number
    year?: number
    // Step 2
    sections: Section[]
    // Step 3
    questions: Question[]
}

const TEST_TYPE_MAP: Record<string, "FULL_MOCK" | "CHAPTER_TEST" | "SECTIONAL_TEST" | "PREVIOUS_YEAR" | "LIVE_SPEED" | "CURRENT_AFFAIRS"> = {
    [TEST_TYPE_LABELS.FULL_MOCK]: "FULL_MOCK",
    "Full Mock": "FULL_MOCK",
    "Full Test": "FULL_MOCK",
    "Full Mock Test": "FULL_MOCK",
    "Chapter Test": "CHAPTER_TEST",
    "Sectional Test": "SECTIONAL_TEST",
    "Previous Year Paper": "PREVIOUS_YEAR",
    "Live Speed Test": "LIVE_SPEED",
    "Current Affairs": "CURRENT_AFFAIRS",
    "CURRENT_AFFAIRS": "CURRENT_AFFAIRS",
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
    TEST_TYPE_LABELS.FULL_MOCK,
    "Chapter Test",
    "Sectional Test",
    "Previous Year Paper",
    "Live Speed Test",
    "Current Affairs",
    "PYQ",
]

function detectCategoryMismatch(title?: string | null, category?: string | null): string | null {
    if (!title || !category) return null
    const t = title.toLowerCase()
    const c = category.toLowerCase()

    if (t.includes("bpsc") && !c.includes("bpsc")) {
        return `Package title references "BPSC", but its category is "${category}". This causes cross-category display bugs (e.g. appearing under UPSC).`
    }
    if (t.includes("upsc") && !c.includes("upsc")) {
        return `Package title references "UPSC", but its category is "${category}".`
    }
    if (t.includes("ssc") && !c.includes("ssc")) {
        return `Package title references "SSC", but its category is "${category}".`
    }
    return null
}

const CA_MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
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

function createDefaultSection(): Section {
    return {
        id: generateId(),
        name: "General Studies",
        nameHindi: "",
        numQuestions: 10,
        positiveMarks: 1,
        negativeMarks: 0.33,
        hasSectionalTime: false,
        sectionalTimeMinutes: 20,
    }
}

function normalizeString(val: any): string {
    if (val === null || val === undefined) return ""
    return String(val).trim()
}

function normalizeNumber(val: any, fallback = 0): number {
    if (val === null || val === undefined || val === "") return fallback
    const n = Number(val)
    return isNaN(n) ? fallback : n
}

function normalizeFormData(data: FormData): string {
    const sectionIndexMap = new Map<string, number>()
    const normalizedSections = (data.sections || []).map((s, idx) => {
        sectionIndexMap.set(s.id, idx)
        return {
            index: idx,
            name: normalizeString(s.name),
            nameHindi: normalizeString(s.nameHindi),
            numQuestions: normalizeNumber(s.numQuestions, 10),
            positiveMarks: normalizeNumber(s.positiveMarks, 1),
            negativeMarks: normalizeNumber(s.negativeMarks, 0.33),
            hasSectionalTime: Boolean(s.hasSectionalTime),
            sectionalTimeMinutes: normalizeNumber(s.sectionalTimeMinutes, 20),
        }
    })

    const normalizedQuestions = (data.questions || []).map((q) => ({
        sectionIndex: sectionIndexMap.get(q.sectionId) ?? 0,
        textEnglish: normalizeString(q.textEnglish),
        textHindi: normalizeString(q.textHindi),
        options: (q.options || []).map((o) => ({
            english: normalizeString(o?.english),
            hindi: normalizeString(o?.hindi),
        })),
        correctAnswer: q.correctAnswer === null || q.correctAnswer === undefined ? null : Number(q.correctAnswer),
        explanationEnglish: normalizeString(q.explanationEnglish),
        explanationHindi: normalizeString(q.explanationHindi),
        videoUrl: normalizeString(q.videoUrl),
        difficulty: normalizeString(q.difficulty).toLowerCase() || "moderate",
        subject: normalizeString(q.subject),
        topic: normalizeString(q.topic),
    }))

    return JSON.stringify({
        seriesId: normalizeString(data.seriesId),
        pyqPaperId: normalizeString(data.pyqPaperId),
        title: normalizeString(data.title),
        titleHindi: normalizeString(data.titleHindi),
        syllabus: normalizeString(data.syllabus),
        syllabusHindi: normalizeString(data.syllabusHindi),
        testType: normalizeString(data.testType) || "Full Test",
        accessMode: normalizeString(data.accessMode).toLowerCase() === "pro" ? "pro" : "free",
        durationMinutes: normalizeNumber(data.durationMinutes, 60),
        isLive: Boolean(data.isLive),
        liveStartAt: normalizeString(data.liveStartAt),
        liveEndAt: normalizeString(data.liveEndAt),
        month: data.month ? normalizeNumber(data.month) : null,
        year: data.year ? normalizeNumber(data.year) : null,
        sections: normalizedSections,
        questions: normalizedQuestions,
    })
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CreateTestContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const querySeriesId = searchParams.get("seriesId") || ""
    const queryCategory = searchParams.get("category") || ""
    const queryType = searchParams.get("type") || ""
    const queryPaperId = searchParams.get("paperId") || ""
    const editTestId = searchParams.get("editTestId") || searchParams.get("testId") || ""

    const { selectedGoal } = useGoal()
    const [loadingEditData, setLoadingEditData] = useState(Boolean(editTestId))
    const [showAllPackages, setShowAllPackages] = useState(false)

    const initialTestType = queryType === "PYQ" || (queryPaperId && !queryType)
        ? "PYQ"
        : (queryType === "CURRENT_AFFAIRS" || queryType === "Current Affairs"
            ? "Current Affairs"
            : (TEST_TYPES.includes(queryType) ? queryType : TEST_TYPE_LABELS.FULL_MOCK))

    const [step, setStep] = useState(1)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [apiError, setApiError] = useState<string | null>(null)
    const [apiErrorDetails, setApiErrorDetails] = useState<string[]>([])
    const [draftWarnings, setDraftWarnings] = useState<string[]>([])
    const [showAiModal, setShowAiModal] = useState(false)
    const [aiPrompt, setAiPrompt] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [showStep4Review, setShowStep4Review] = useState(false)
    const [published, setPublished] = useState(false)
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")
    const [bulkImportOpen, setBulkImportOpen] = useState(false)
    const [rawJsonText, setRawJsonText] = useState("")
    const [jsonPreview, setJsonPreview] = useState<BulkJsonPipelineResult | null>(null)
    const [isProcessingJson, setIsProcessingJson] = useState(false)
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set())
    const [isImporting, setIsImporting] = useState(false)
    const [uploadedFileBlocks, setUploadedFileBlocks] = useState<{ filename: string; content: string }[]>([])
    const [importToast, setImportToast] = useState<{ message: string; isWarning?: boolean; batch: { questionIds: string[] } } | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [savedTestId, setSavedTestId] = useState<string | null>(null)
    const [rawPaperText, setRawPaperText] = useState("")
    const [rawLoading, setRawLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [paperWarning, setPaperWarning] = useState<string | null>(null)
    const [importWarning, setImportWarning] = useState<string | null>(null)
    const [pyqFetchError, setPyqFetchError] = useState<string | null>(null)
    const [pyqPapersLoaded, setPyqPapersLoaded] = useState(false)

    const [formData, setFormData] = useState<FormData>(() => {
        const initialDefSection = createDefaultSection()
        return {
            seriesId: querySeriesId || "",
            pyqPaperId: "",
            title: "",
            titleHindi: "",
            syllabus: "",
            syllabusHindi: "",
            examCategory: initialTestType === "Current Affairs" ? "Current Affairs" : "",
            examName: initialTestType === "Current Affairs" ? "Current Affairs" : "",
            testType: initialTestType,
            accessMode: "free",
            durationMinutes: 60,
            totalQuestions: 10,
            totalMarks: 10,
            isLive: false,
            liveStartAt: "",
            liveEndAt: "",
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            sections: [initialDefSection],
            questions: buildInitialQuestions([initialDefSection]),
        }
    })

    const [isCreateSeriesModalOpen, setIsCreateSeriesModalOpen] = useState(false)
    const [seriesPackages, setSeriesPackages] = useState<any[]>([])

    const [savedSnapshot, setSavedSnapshot] = useState<string>(() => normalizeFormData(formData))
    const savedSnapshotRef = useRef<string>(savedSnapshot)
    savedSnapshotRef.current = savedSnapshot

    const isDirty = useMemo(() => {
        return normalizeFormData(formData) !== savedSnapshot
    }, [formData, savedSnapshot])

    const isDirtyRef = useRef<boolean>(false)
    isDirtyRef.current = isDirty

    const activeTestIdRef = useRef<string>(editTestId)
    const loadedTestIdRef = useRef<string | null>(editTestId || null)
    const testUpdatedAtRef = useRef<string | null>(null)
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
    const [isPublishedTest, setIsPublishedTest] = useState<boolean>(false)

    useEffect(() => {
        if (editTestId) {
            activeTestIdRef.current = editTestId
        }
    }, [editTestId])

    // Load test data when editTestId is present
    useEffect(() => {
        if (!editTestId) return
        if (loadedTestIdRef.current === editTestId && activeTestIdRef.current === editTestId && savedTestId === editTestId) {
            return
        }
        loadedTestIdRef.current = editTestId
        activeTestIdRef.current = editTestId
        let cancelled = false
        async function loadTestForEdit() {
            setLoadingEditData(true)
            try {
                const res = await fetch(`/api/exam/test/${encodeURIComponent(editTestId)}/edit-data`)
                const json = await res.json()
                if (cancelled) return
                if (!res.ok || !json.data?.test) {
                    throw new Error(json.error || "Failed to load test for editing")
                }
                const t = json.data.test

                const loadedSections: Section[] = (t.sections || []).map((s: any) => ({
                    id: s.id,
                    name: s.title || "General",
                    nameHindi: s.titleHi || "",
                    numQuestions: (s.questions && s.questions.length > 0) ? s.questions.length : 10,
                    positiveMarks: Number(s.positiveMarks) || 1,
                    negativeMarks: Number(s.negativeMarks) || 0.33,
                    hasSectionalTime: Boolean(s.timeLimitMins),
                    sectionalTimeMinutes: Number(s.timeLimitMins) || 20,
                }))

                const loadedQuestions: Question[] = []
                for (const s of t.sections || []) {
                    for (const q of s.questions || []) {
                        const correctIdx =
                            q.correctOption === "A" ? 0 :
                            q.correctOption === "B" ? 1 :
                            q.correctOption === "C" ? 2 :
                            q.correctOption === "D" ? 3 : null

                        loadedQuestions.push({
                            id: q.id,
                            sectionId: s.id,
                            textEnglish: q.questionEn || "",
                            textHindi: q.questionHi || "",
                            options: [
                                { english: q.optionAEn || "", hindi: q.optionAHi || "" },
                                { english: q.optionBEn || "", hindi: q.optionBHi || "" },
                                { english: q.optionCEn || "", hindi: q.optionCHi || "" },
                                { english: q.optionDEn || "", hindi: q.optionDHi || "" },
                            ],
                            correctAnswer: correctIdx,
                            explanationEnglish: q.explanationEn || "",
                            explanationHindi: q.explanationHi || "",
                            videoUrl: q.videoUrl || "",
                            difficulty: (q.difficulty === "HARD" ? "Hard" : q.difficulty === "EASY" ? "Easy" : "Moderate"),
                            subject: q.subject || "",
                            topic: q.topic || "",
                        })
                    }
                }

                let displayType = TEST_TYPE_LABELS.FULL_MOCK
                if (t.testType === "FULL_MOCK" || t.testType === "Full Mock Test" || t.testType === "Full Mock" || t.testType === "Full Test") displayType = TEST_TYPE_LABELS.FULL_MOCK
                else if (t.testType === "CHAPTER_TEST") displayType = "Chapter Test"
                else if (t.testType === "SECTIONAL_TEST") displayType = "Sectional Test"
                else if (t.testType === "PREVIOUS_YEAR" || t.testType === "PYQ") displayType = "Previous Year Paper"
                else if (t.testType === "LIVE_SPEED") displayType = "Live Speed Test"
                else if (t.testType === "CURRENT_AFFAIRS") displayType = "Current Affairs"

                const finalSections = loadedSections.length > 0 ? loadedSections : [createDefaultSection()]
                const finalQuestions = loadedQuestions.length > 0 ? loadedQuestions : buildInitialQuestions(finalSections)

                const editFormData: FormData = {
                    seriesId: t.seriesId || "",
                    title: t.title || "",
                    titleHindi: t.titleHi || "",
                    syllabus: t.syllabus || "",
                    syllabusHindi: t.syllabusHi || "",
                    examCategory: t.series?.category || "",
                    examName: t.series?.title || "",
                    testType: displayType,
                    accessMode: (t.accessMode || "FREE").toLowerCase() === "pro" ? "pro" : "free",
                    durationMinutes: Number(t.durationMinutes) || 60,
                    totalQuestions: Number(t.totalQuestions) || finalQuestions.length,
                    totalMarks: Number(t.totalMarks) || 100,
                    isLive: Boolean(t.isLive),
                    liveStartAt: t.liveStartAt ? new Date(t.liveStartAt).toISOString().slice(0, 16) : "",
                    liveEndAt: t.liveEndAt ? new Date(t.liveEndAt).toISOString().slice(0, 16) : "",
                    sections: finalSections,
                    questions: finalQuestions,
                }

                const loadedSnapshot = normalizeFormData(editFormData)
                setFormData(editFormData)
                setSavedSnapshot(loadedSnapshot)
                savedSnapshotRef.current = loadedSnapshot
                setSavedTestId(t.id)
                activeTestIdRef.current = t.id
                testUpdatedAtRef.current = t.updatedAt || null
                setIsPublishedTest(Boolean(t.isPublished))
                if (t.updatedAt) {
                    setLastSavedTime(
                        new Date(t.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    )
                }
            } catch (err: any) {
                console.error("Error loading test for editing:", err)
                setApiError(err.message || "Failed to load test details")
            } finally {
                setLoadingEditData(false)
            }
        }
        loadTestForEdit()
        return () => { cancelled = true }
    }, [editTestId, savedTestId])

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
        const removed = formData.sections[idx]
        if (!removed) return

        const questionsForSec = formData.questions.filter((q) => q.sectionId === removed.id)
        const filledCount = questionsForSec.filter(
            (q) => isQuestionFilled(q) || Boolean(q.textEnglish?.trim())
        ).length

        if (filledCount > 0) {
            const confirmed = window.confirm(
                `Section "${removed.name}" contains ${filledCount} question(s). Removing this section will permanently delete these questions. Are you sure you want to remove it?`
            )
            if (!confirmed) return
        }

        setFormData((prev) => {
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
            const ordered: Question[] = []
            for (const s of prev.sections) {
                if (s.id === secId) ordered.push(...updated)
                else ordered.push(...others.filter((q) => q.sectionId === s.id))
            }
            return { ...prev, questions: ordered }
        })
    }

    const updateSectionNumQuestions = (idx: number, numQuestions: number) => {
        const count = Math.max(1, numQuestions)
        const sec = formData.sections[idx]
        if (!sec) return

        if (count < sec.numQuestions) {
            const existingForSec = formData.questions.filter((q) => q.sectionId === sec.id)
            const droppedQuestions = existingForSec.slice(count)
            const filledCount = droppedQuestions.filter(
                (q) => isQuestionFilled(q) || Boolean(q.textEnglish?.trim())
            ).length

            if (filledCount > 0) {
                const confirmed = window.confirm(
                    `${filledCount} filled question(s) will be removed. Are you sure you want to reduce the section size?`
                )
                if (!confirmed) {
                    return
                }
            }
        }

        setFormData((prev) => {
            const secItem = prev.sections[idx]
            if (!secItem) return prev
            const secId = secItem.id
            const sections = prev.sections.map((s, i) => (i === idx ? { ...s, numQuestions: count } : s))
            const existingForSec = prev.questions.filter((q) => q.sectionId === secId)
            let updated = [...existingForSec]
            while (updated.length < count) updated.push(emptyQuestion(secId))
            if (updated.length > count) updated = updated.slice(0, count)

            const ordered: Question[] = []
            for (const s of sections) {
                if (s.id === secId) ordered.push(...updated)
                else ordered.push(...prev.questions.filter((q) => q.sectionId === s.id))
            }
            return {
                ...prev,
                sections,
                questions: ordered,
            }
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

        // Auto-save changes in background so nothing is lost when moving steps (only if already editing/persisted)
        if (editTestId) {
            handleSaveCurrent({ stayOnStep: true, silent: true }).catch(console.error)
        }

        if (step === 2) {
            // Rebuild question bank to match section counts while preserving existing questions
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
        setImportWarning(null)
    }

    const handleBack = () => {
        setImportWarning(null)
        setStep((s) => s - 1)
    }

    // Warn before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                e.preventDefault()
                e.returnValue = ""
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [])

    useEffect(() => {
        const handleAnchorClick = (e: MouseEvent) => {
            if (!isDirtyRef.current) return
            const target = e.target as HTMLElement | null
            const anchor = target?.closest("a")
            if (anchor && anchor.href && !anchor.href.startsWith("#") && !anchor.hasAttribute("download")) {
                const currentOrigin = window.location.origin
                if (anchor.href.startsWith(currentOrigin) || anchor.href.startsWith("/")) {
                    const confirmLeave = window.confirm(
                        "You have unsaved changes in this test. Are you sure you want to leave without saving?"
                    )
                    if (!confirmLeave) {
                        e.preventDefault()
                        e.stopPropagation()
                    }
                }
            }
        }
        document.addEventListener("click", handleAnchorClick, true)
        return () => document.removeEventListener("click", handleAnchorClick, true)
    }, [])

    const dirtyStatusElement = (
        <div className="flex items-center min-h-[28px]">
            {isDirty ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-in fade-in">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved changes
                </span>
            ) : lastSavedTime ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                    <Check className="h-3.5 w-3.5" />
                    All changes saved ({lastSavedTime})
                </span>
            ) : null}
        </div>
    )

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

    // ── Unified Sequential Question Importer ──
    // Fills empty/incomplete slots starting from Q1 across sections sequentially (Section 1 first, then Section 2, etc.)
    // Never grows totalQuestions or section numQuestions. Shows warning if incoming exceeds available empty slots.
    const fillQuestionsSequentially = (incoming: Array<{
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
        options?: string[] | [string, string, string, string]
        optionsHi?: string[] | [string, string, string, string]
        correctOption?: string | number
        explanationEn?: string
        explanationHi?: string
        difficulty?: string
        subject?: string
        topic?: string
        videoUrl?: string
    }>) => {
        if (!incoming || incoming.length === 0) return

        try {
            const totalSlots = formData.sections.reduce((sum, s) => sum + s.numQuestions, 0)

            // 1. Gather all empty/incomplete slots in strict sequential order (Section 1 first, then Section 2, etc.)
            const emptySlots: Question[] = []
            for (const sec of formData.sections) {
                const secQs = formData.questions.filter((q) => q.sectionId === sec.id)
                for (const q of secQs) {
                    if (!isQuestionFilled(q)) {
                        emptySlots.push(q)
                    }
                }
            }

            if (emptySlots.length === 0) {
                const msg = `⚠️ Cannot import: Test already has all ${totalSlots} questions filled. All ${incoming.length} incoming question(s) were skipped.`
                setUploadError(msg)
                setImportWarning(msg)
                return
            }

            const fitCount = Math.min(incoming.length, emptySlots.length)
            const skippedCount = incoming.length - fitCount
            const newlyFilledIds: string[] = []
            const updatesById = new Map<string, Question>()

            for (let i = 0; i < fitCount; i++) {
                const targetQ = emptySlots[i]
                const item = incoming[i]
                newlyFilledIds.push(targetQ.id)

                const optAEn = item.optionAEn ?? (Array.isArray(item.options) ? item.options[0] : "") ?? ""
                const optAHi = item.optionAHi ?? (Array.isArray(item.optionsHi) ? item.optionsHi[0] : "") ?? ""
                const optBEn = item.optionBEn ?? (Array.isArray(item.options) ? item.options[1] : "") ?? ""
                const optBHi = item.optionBHi ?? (Array.isArray(item.optionsHi) ? item.optionsHi[1] : "") ?? ""
                const optCEn = item.optionCEn ?? (Array.isArray(item.options) ? item.options[2] : "") ?? ""
                const optCHi = item.optionCHi ?? (Array.isArray(item.optionsHi) ? item.optionsHi[2] : "") ?? ""
                const optDEn = item.optionDEn ?? (Array.isArray(item.options) ? item.options[3] : "") ?? ""
                const optDHi = item.optionDHi ?? (Array.isArray(item.optionsHi) ? item.optionsHi[3] : "") ?? ""

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

                const rawDiff = (item.difficulty || "Moderate").toUpperCase()
                const difficulty =
                    rawDiff === "HARD" ? "Hard" : rawDiff === "EASY" ? "Easy" : "Moderate"

                const qTextEn = item.questionEn || ""
                const qTextHi = item.questionHi || (qTextEn ? `(हिंदी) ${qTextEn}` : "")
                const expEn = item.explanationEn || ""
                const expHi = item.explanationHi || (expEn ? `(हिंदी) ${expEn}` : "")

                updatesById.set(targetQ.id, {
                    id: targetQ.id,
                    sectionId: targetQ.sectionId,
                    textEnglish: qTextEn,
                    textHindi: qTextHi,
                    options: [
                        { english: optAEn, hindi: optAHi },
                        { english: optBEn, hindi: optBHi },
                        { english: optCEn, hindi: optCHi },
                        { english: optDEn, hindi: optDHi },
                    ],
                    correctAnswer: ansIdx,
                    explanationEnglish: expEn,
                    explanationHindi: expHi,
                    videoUrl: item.videoUrl || targetQ.videoUrl || "",
                    difficulty,
                    subject: item.subject || formData.examCategory || "General Studies",
                    topic: item.topic || "General",
                })
            }

            setFormData((prev) => ({
                ...prev,
                questions: prev.questions.map((q) => updatesById.get(q.id) ?? q),
            }))

            if (skippedCount > 0) {
                const warningMsg = `⚠️ Imported ${fitCount} question(s). ${skippedCount} question(s) were skipped because the test is full (${totalSlots} questions defined in Step 2).`
                setImportWarning(warningMsg)
                setUploadError(warningMsg)
                setUploadSuccess(`Imported ${fitCount} question(s) (${skippedCount} skipped).`)
                setImportToast({
                    message: warningMsg,
                    isWarning: true,
                    batch: { questionIds: newlyFilledIds },
                })
            } else {
                setImportWarning(null)
                setUploadError(null)
                const successMsg = `🎉 Successfully imported ${fitCount} question(s)!`
                setUploadSuccess(successMsg)
                setImportToast({
                    message: successMsg,
                    isWarning: false,
                    batch: { questionIds: newlyFilledIds },
                })
            }

            setTimeout(() => {
                setImportToast((curr) => (curr?.batch.questionIds === newlyFilledIds ? null : curr))
            }, 10000)
            setTimeout(() => setUploadSuccess(null), 4000)
        } catch (err: any) {
            console.error("Sequential import error:", err)
            setUploadError(err.message || "An error occurred during import. No questions were added.")
        }
    }

    // Canonical alias for backwards compatibility
    const importQuestionsIntoSection = fillQuestionsSequentially

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
            if (generated.length > 0) {
                fillQuestionsSequentially(generated)
            } else {
                setUploadError("AI could not generate questions for this topic. Please try another prompt.")
            }
        } catch (e: any) {
            console.error("AI Generate error", e)
            setUploadError(e?.message || "Failed to generate questions with AI.")
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
            if (parsed.length > 0) {
                fillQuestionsSequentially(parsed)
            } else {
                setUploadError("Could not extract any questions from the pasted text. Please verify formatting.")
            }
        } catch (e: any) {
            console.error("Raw paper parse error", e)
            setUploadError(e?.message || "Failed to parse raw paper text.")
        } finally {
            setRawLoading(false)
            setBulkImportOpen(false)
            setRawPaperText("")
        }
    }

    const handleUndoImport = () => {
        if (!importToast) return
        const { questionIds } = importToast.batch
        setFormData((prev) => ({
            ...prev,
            questions: prev.questions.map((q) => {
                if (questionIds.includes(q.id)) {
                    return {
                        ...emptyQuestion(q.sectionId),
                        id: q.id,
                    }
                }
                return q
            }),
        }))
        setImportToast(null)
        setImportWarning(null)
        setUploadSuccess("Import undone successfully.")
        setTimeout(() => setUploadSuccess(null), 3000)
    }

    // ── Bulk File Upload Handler (CSV / Multiple JSON) ──
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFiles = Array.from(e.target.files || [])
        if (rawFiles.length === 0) return

        setUploadError(null)

        // F6. File limits: only .json/.csv, max 5 MB per file
        for (const file of rawFiles) {
            const name = file.name.toLowerCase()
            if (!name.endsWith(".json") && !name.endsWith(".csv")) {
                setUploadError(`Invalid file format: "${file.name}". Only .json and .csv files are supported.`)
                e.target.value = ""
                return
            }
            if (file.size > 5 * 1024 * 1024) {
                setUploadError(`File too large: "${file.name}" exceeds the 5 MB limit.`)
                e.target.value = ""
                return
            }
        }

        // F8. Mixed selection check (CSV + JSON together)
        const hasCsv = rawFiles.some((f) => f.name.toLowerCase().endsWith(".csv"))
        const hasJson = rawFiles.some((f) => f.name.toLowerCase().endsWith(".json"))

        if (hasCsv && hasJson) {
            setUploadError("Select either CSV or JSON files, not both.")
            e.target.value = ""
            return
        }

        if (hasCsv) {
            // F7. CSV flow unchanged (processes single CSV file)
            const csvFile = rawFiles[0]
            setIsUploading(true)
            const reader = new FileReader()
            reader.onload = (event) => {
                try {
                    const text = (event.target?.result as string) || ""
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
                } catch (err: any) {
                    console.error("Bulk upload parse error:", err)
                    setUploadError(err.message || "Failed to parse file. Please verify CSV formatting.")
                } finally {
                    setIsUploading(false)
                    e.target.value = ""
                }
            }
            reader.onerror = () => {
                setUploadError("Could not read file from disk.")
                setIsUploading(false)
            }
            reader.readAsText(csvFile, "UTF-8")
        } else {
            // E1. Multi-file upload: natural-sort by filename (q1, q2, q10 order)
            const sortedFiles = naturalSortFiles(rawFiles)
            setIsUploading(true)

            const readPromises = sortedFiles.map((file) => {
                return new Promise<{ filename: string; content: string }>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = (event) =>
                        resolve({ filename: file.name, content: (event.target?.result as string) || "" })
                    reader.onerror = () => reject(new Error(`Could not read ${file.name} from disk.`))
                    reader.readAsText(file, "UTF-8")
                })
            })

            Promise.all(readPromises)
                .then((blocks) => {
                    setUploadedFileBlocks(blocks)
                    // Pass existing questions from test to dedupe against (E4)
                    const existingList = formData.questions.map((q) => ({ questionEn: q.textEnglish }))
                    const result = processBulkJsonImport(
                        blocks.map((b) => b.content),
                        existingList
                    )
                    setJsonPreview(result)
                    setSelectedQuestionIds(new Set(result.questions.map((q) => q.id)))
                })
                .catch((err: any) => {
                    console.error("Bulk JSON upload parse error:", err)
                    setUploadError(err.message || "Failed to parse JSON file(s).")
                    setJsonPreview(null)
                    setUploadedFileBlocks([])
                })
                .finally(() => {
                    setIsUploading(false)
                    e.target.value = ""
                })
        }
    }

    // E1. Move block up/down in file list
    const moveFileBlock = (index: number, direction: -1 | 1) => {
        const newIdx = index + direction
        if (newIdx < 0 || newIdx >= uploadedFileBlocks.length) return
        const nextBlocks = [...uploadedFileBlocks]
        const temp = nextBlocks[index]
        nextBlocks[index] = nextBlocks[newIdx]
        nextBlocks[newIdx] = temp
        setUploadedFileBlocks(nextBlocks)

        try {
            const existingList = formData.questions.map((q) => ({ questionEn: q.textEnglish }))
            const result = processBulkJsonImport(
                nextBlocks.map((b) => b.content),
                existingList
            )
            setJsonPreview(result)
            setSelectedQuestionIds(new Set(result.questions.map((q) => q.id)))
        } catch (err: any) {
            setUploadError(err.message || "Failed to reorder blocks.")
        }
    }

    const handleProcessPastedJson = () => {
        if (!rawJsonText.trim()) {
            setUploadError("No JSON input provided. Please paste JSON content into the text box.")
            return
        }
        setUploadError(null)
        setIsProcessingJson(true)
        setUploadedFileBlocks([])

        // F5: Yield with setTimeout so UI spinner renders immediately for large inputs
        setTimeout(() => {
            try {
                const existingList = formData.questions.map((q) => ({ questionEn: q.textEnglish }))
                const result = processBulkJsonImport(rawJsonText, existingList)
                setJsonPreview(result)
                setSelectedQuestionIds(new Set(result.questions.map((q) => q.id)))
            } catch (err: any) {
                console.error("Pasted JSON process error:", err)
                setUploadError(err.message || "Failed to parse pasted JSON.")
                setJsonPreview(null)
            } finally {
                setIsProcessingJson(false)
            }
        }, 10)
    }

    // F3. Atomic import of checked questions only; prevents double import
    const handleConfirmImport = () => {
        if (!jsonPreview || isImporting) return
        const selectedQuestions = jsonPreview.questions.filter((q) => selectedQuestionIds.has(q.id))
        if (selectedQuestions.length === 0) return

        setIsImporting(true)
        try {
            importQuestionsIntoSection(selectedQuestions)
            setJsonPreview(null)
            setRawJsonText("")
            setUploadedFileBlocks([])
            setBulkImportOpen(false)
        } finally {
            setIsImporting(false)
        }
    }

    // F2. Download skipped report JSON
    const downloadSkippedReport = () => {
        if (!jsonPreview || jsonPreview.skipped.length === 0) return
        const reportData = jsonPreview.skipped.map((s) => ({
            block: s.blockIndex,
            questionIndex: s.questionIndex,
            reason: s.reason,
            rawQuestion: s.rawItem || null,
        }))
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `skipped-questions-report-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const buildMappedSections = () => {
        return formData.sections.map((sec, sIdx) => {
            const secQs = formData.questions.filter((q) => q.sectionId === sec.id)
            return {
                id: sec.id,
                title: sec.name,
                titleHi: sec.nameHindi,
                order: sIdx + 1,
                positiveMarks: sec.positiveMarks,
                negativeMarks: sec.negativeMarks,
                timeLimitMins: sec.hasSectionalTime ? sec.sectionalTimeMinutes : null,
                questions: secQs.map((q, qIdx) => ({
                    id: q.id,
                    order: qIdx + 1,
                    questionEn: q.textEnglish,
                    questionHi: q.textHindi,
                    options: q.options.map((o) => o.english),
                    optionsHi: q.options.map((o) => o.hindi),
                    optionAEn: q.options[0]?.english || "",
                    optionBEn: q.options[1]?.english || "",
                    optionCEn: q.options[2]?.english || "",
                    optionDEn: q.options[3]?.english || "",
                    optionAHi: q.options[0]?.hindi || "",
                    optionBHi: q.options[1]?.hindi || "",
                    optionCHi: q.options[2]?.hindi || "",
                    optionDHi: q.options[3]?.hindi || "",
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

    const handleSaveCurrent = async (options?: {
        stayOnStep?: boolean
        silent?: boolean
        forceOverwrite?: boolean
    }): Promise<boolean> => {
        // Validate required Step 1 fields
        const errs: Record<string, string> = {}
        if (!formData.title.trim()) {
            errs.title = "Test title is required"
        }
        if (
            !formData.seriesId &&
            formData.testType !== "PYQ" &&
            formData.testType !== "Current Affairs" &&
            formData.testType !== "CURRENT_AFFAIRS"
        ) {
            errs.seriesId = "Please select a target test series package"
        }
        if (!formData.durationMinutes || formData.durationMinutes < 1) {
            errs.durationMinutes = "Duration must be at least 1 minute"
        }
        if (formData.isLive && !formData.liveStartAt) {
            errs.liveStartAt = "Live start time is required"
        }
        if (formData.isLive && !formData.liveEndAt) {
            errs.liveEndAt = "Live end time is required"
        }

        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            setApiError("Please fill in all required fields before saving.")
            return false
        }

        // If on step 2, validate sections too
        if (step === 2) {
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
            if (Object.keys(errs).length > 0) {
                setErrors(errs)
                setApiError("Please fix section validation errors before saving.")
                return false
            }
        }

        setIsSaving(true)
        setApiError(null)
        setApiErrorDetails([])
        setDraftWarnings([])

        try {
            const inFlightSnapshot = normalizeFormData(formData)
            const mappedSections = buildMappedSections()
            const mappedTestType = TEST_TYPE_MAP[formData.testType] || "FULL_MOCK"
            const mappedAccessMode = formData.accessMode === "free" ? "FREE" : "PRO"
            const targetId = activeTestIdRef.current || editTestId || savedTestId

            if (targetId) {
                // Existing test: PUT /api/exam/test/[id]/edit-data
                const res = await fetch(`/api/exam/test/${encodeURIComponent(targetId)}/edit-data`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: formData.title,
                        titleHi: formData.titleHindi || null,
                        syllabus: formData.syllabus || null,
                        syllabusHi: formData.syllabusHindi || null,
                        seriesId: formData.seriesId || undefined,
                        testType: mappedTestType,
                        accessMode: mappedAccessMode,
                        durationMinutes: formData.durationMinutes,
                        isLive: formData.isLive,
                        liveStartAt: formData.liveStartAt || null,
                        liveEndAt: formData.liveEndAt || null,
                        month: formData.month,
                        year: formData.year,
                        sections: mappedSections,
                        lastKnownUpdatedAt: testUpdatedAtRef.current || undefined,
                        forceOverwrite: options?.forceOverwrite,
                    }),
                })
                const json = await res.json()

                if (res.status === 409) {
                    const overwrite = window.confirm(
                        "Warning: This test was modified elsewhere after you loaded it.\n\nDo you want to overwrite those changes?"
                    )
                    if (overwrite) {
                        return await handleSaveCurrent({ ...options, forceOverwrite: true })
                    }
                    setIsSaving(false)
                    return false
                }

                if (!res.ok) {
                    const errMsg = json.error || `Save failed with status ${res.status}`
                    setApiError(errMsg)
                    if (Array.isArray(json.details)) setApiErrorDetails(json.details)
                    throw new Error(errMsg)
                }

                if (json.updatedAt) {
                    testUpdatedAtRef.current = json.updatedAt
                }
                if (json.isPublished !== undefined) {
                    setIsPublishedTest(Boolean(json.isPublished))
                }
                setSavedSnapshot(inFlightSnapshot)
                savedSnapshotRef.current = inFlightSnapshot
                isDirtyRef.current = false
                setLastSavedTime(
                    new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                )

                if (!options?.silent) {
                    setToastMessage(isPublishedTest ? "Changes saved to live test! 🎉" : "Saved")
                    setShowToast(true)
                }
                if (options?.stayOnStep === false) {
                    setTimeout(() => {
                        router.push("/teacher/test-series")
                    }, 1200)
                }
                return true
            } else {
                // New test: POST /api/exam/test/create
                const res = await fetch("/api/exam/test/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        seriesId: formData.seriesId || undefined,
                        pyqPaperId: formData.pyqPaperId || undefined,
                        title: formData.title,
                        titleHi: formData.titleHindi || null,
                        syllabus: formData.syllabus || undefined,
                        syllabusHi: formData.syllabusHindi || undefined,
                        testType: mappedTestType,
                        accessMode: mappedAccessMode,
                        durationMinutes: formData.durationMinutes,
                        isLive: formData.isLive,
                        liveStartAt: formData.liveStartAt || null,
                        liveEndAt: formData.liveEndAt || null,
                        sections: mappedSections,
                        isPublished: false,
                        month: formData.month,
                        year: formData.year,
                    }),
                })
                const json = await res.json()

                if (!res.ok || !json.data?.id) {
                    const errMsg = json.error || `Save draft failed with status ${res.status}`
                    setApiError(errMsg)
                    if (Array.isArray(json.details)) setApiErrorDetails(json.details)
                    throw new Error(errMsg)
                }

                const newId = json.data.id
                activeTestIdRef.current = newId
                loadedTestIdRef.current = newId
                setSavedTestId(newId)
                if (json.data.updatedAt) {
                    testUpdatedAtRef.current = json.data.updatedAt
                }
                setIsPublishedTest(false)
                setSavedSnapshot(inFlightSnapshot)
                savedSnapshotRef.current = inFlightSnapshot
                isDirtyRef.current = false
                setLastSavedTime(
                    new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                )

                // Update URL to ?editTestId=<id> via router.replace without reloading
                const params = new URLSearchParams(window.location.search)
                params.set("editTestId", newId)
                router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })

                if (!options?.silent) {
                    setToastMessage("Saved as draft")
                    setShowToast(true)
                }
                if (options?.stayOnStep === false) {
                    setTimeout(() => {
                        router.push("/teacher/test-series")
                    }, 1200)
                }
                return true
            }
        } catch (e: any) {
            console.error("Save error:", e)
            setApiError(e.message || "Failed to save test")
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveDraft = async () => {
        await handleSaveCurrent({ stayOnStep: false })
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
        if (!formData.seriesId && formData.testType !== "PYQ" && formData.testType !== "Current Affairs" && formData.testType !== "CURRENT_AFFAIRS") {
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

            const targetId = activeTestIdRef.current || editTestId || savedTestId

            if (targetId) {
                const res = await fetch(`/api/exam/test/${encodeURIComponent(targetId)}/edit-data`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: formData.title,
                        titleHi: formData.titleHindi || null,
                        syllabus: formData.syllabus || null,
                        syllabusHi: formData.syllabusHindi || null,
                        seriesId: formData.seriesId || undefined,
                        testType: mappedTestType,
                        accessMode: mappedAccessMode,
                        durationMinutes: formData.durationMinutes,
                        sections: mappedSections,
                        isPublished: true,
                    }),
                })
                const json = await res.json()
                if (!res.ok) {
                    const errMsg = json.error || `Publish failed with status ${res.status}`
                    setApiError(errMsg)
                    if (Array.isArray(json.details)) setApiErrorDetails(json.details)
                    throw new Error(errMsg)
                }
                const finalSnapshot = normalizeFormData(formData)
                setSavedSnapshot(finalSnapshot)
                savedSnapshotRef.current = finalSnapshot
                isDirtyRef.current = false
                setPublished(true)
                setToastMessage("Test updated and published successfully! 🎉 Redirecting to tests...")
                setShowToast(true)
                setTimeout(() => {
                    router.push("/teacher/test-series")
                }, 1500)
                return
            }

            const res = await fetch("/api/exam/test/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    seriesId: formData.seriesId || undefined,
                    pyqPaperId: formData.pyqPaperId || undefined,
                    title: formData.title,
                    titleHi: formData.titleHindi,
                    syllabus: formData.syllabus || undefined,
                    syllabusHi: formData.syllabusHindi || undefined,
                    testType: mappedTestType,
                    accessMode: mappedAccessMode,
                    durationMinutes: formData.durationMinutes,
                    isLive: formData.isLive,
                    liveStartAt: formData.liveStartAt || null,
                    liveEndAt: formData.liveEndAt || null,
                    sections: mappedSections,
                    isPublished: true,
                    month: formData.month,
                    year: formData.year,
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
            activeTestIdRef.current = publishedId
            loadedTestIdRef.current = publishedId
            setSavedTestId(publishedId)
            const finalSnapshot = normalizeFormData(formData)
            setSavedSnapshot(finalSnapshot)
            savedSnapshotRef.current = finalSnapshot
            isDirtyRef.current = false
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

    if (showStep4Review) {
        return (
            <ReviewAllQuestions
                title={formData.title}
                titleHindi={formData.titleHindi}
                sections={formData.sections}
                questions={formData.questions}
                onBack={() => setShowStep4Review(false)}
                onEditQuestion={(_qId, secId, qIdx) => {
                    setShowStep4Review(false)
                    const sIdx = formData.sections.findIndex((s) => s.id === secId)
                    if (sIdx !== -1) {
                        setCurrentSection(sIdx)
                        setCurrentQIdx(qIdx)
                        setStep(3)
                    }
                }}
            />
        )
    }

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
                                    ? `/test-series/${savedTestId}/attempt?testId=${savedTestId}&title=${encodeURIComponent(formData.title)}&questions=${computedTotalQuestions}&marks=${computedTotalMarks}&duration=${formData.durationMinutes}`
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

            {/* Import Toast with Undo */}
            {importToast && (
                <div
                    data-testid="import-toast"
                    className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl font-medium text-sm flex items-center gap-4 animate-in slide-in-from-bottom-5 border border-slate-700"
                >
                    <div className="flex items-center gap-2">
                        {importToast.isWarning ? (
                            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        )}
                        <span>{importToast.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleUndoImport}
                        className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                    >
                        Undo
                    </button>
                    <button
                        type="button"
                        onClick={() => setImportToast(null)}
                        className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
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
                        {editTestId ? "Edit Test in Studio" : "Test Authoring Studio"}
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        {editTestId
                            ? "Editing test questions, scoring, and metadata with live updates"
                            : "Create a new test with bilingual question support"}
                    </p>
                </div>
                <StepIndicator current={step} />
            </div>

            {loadingEditData && (
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0 text-[#00A8FF]" />
                    <div>
                        <p className="font-bold">Loading test data for editing...</p>
                        <p className="text-[11px] opacity-80">Fetching sections, questions, and test configuration.</p>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* STEP 1: Test Metadata */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {step === 1 && (
                <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <CardHeader
                        title={editTestId ? "Step 1 — Edit Test Metadata" : "Step 1 — Test Metadata"}
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

                        {/* Test Syllabus (English & Hindi) */}
                        <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5 text-[#00A8FF]" />
                                    <span>Test Syllabus &amp; Topics Covered</span>
                                </label>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Shown on learner test card &amp; syllabus modal</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Syllabus (English)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.syllabus}
                                        onChange={(e) => updateField("syllabus", e.target.value)}
                                        placeholder="e.g. Modern History (1857-1947), Indian Polity Articles 1-51A, Current Affairs..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 transition-all leading-relaxed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Syllabus (Hindi) <span className="text-gray-400 font-normal">optional</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.syllabusHindi}
                                        onChange={(e) => updateField("syllabusHindi", e.target.value)}
                                        placeholder="e.g. आधुनिक भारतीय इतिहास (1857-1947), भारतीय राजव्यवस्था अनुच्छेद 1-51A..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#00A8FF] focus:ring-2 focus:ring-[#00A8FF]/20 transition-all leading-relaxed"
                                    />
                                </div>
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

                            {selectedGoal && selectedGoal.id !== "all" && !showAllPackages && (
                                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 py-0.5">
                                    <span>Filtered by Target Goal: <strong className="text-sky-600 dark:text-sky-400">{selectedGoal.name || selectedGoal.id}</strong> ({seriesPackages.filter((pkg) => {
                                        if (formData.seriesId === pkg.id) return true
                                        const targetCategory = (queryCategory || selectedGoal?.id || selectedGoal?.name || "").toLowerCase().trim()
                                        if (!targetCategory || targetCategory === "all") return true
                                        const cat = (pkg.category || "").toLowerCase().trim()
                                        if (cat === targetCategory) return true
                                        if (targetCategory === "upsc") {
                                            const text = `${pkg.title || ""} ${pkg.category || ""}`.toLowerCase()
                                            if (text.includes("bpsc") || text.includes("bihar")) return false
                                            return cat.includes("upsc")
                                        }
                                        if (targetCategory === "bpsc") return cat.includes("bpsc")
                                        if (targetCategory === "ssc") return cat.includes("ssc")
                                        if (targetCategory === "state-pcs") return cat.includes("state") || cat.includes("pcs")
                                        if (targetCategory === "teaching") return cat.includes("teach") || cat.includes("tre")
                                        return cat.includes(targetCategory) || targetCategory.includes(cat)
                                    }).length} packages)</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowAllPackages(true)}
                                        className="text-[#00A8FF] font-semibold hover:underline cursor-pointer"
                                    >
                                        Show all packages
                                    </button>
                                </div>
                            )}

                            {showAllPackages && selectedGoal && selectedGoal.id !== "all" && (
                                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 py-0.5">
                                    <span>Showing all {seriesPackages.length} packages</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowAllPackages(false)}
                                        className="text-[#00A8FF] font-semibold hover:underline cursor-pointer"
                                    >
                                        Filter by {selectedGoal.name || selectedGoal.id}
                                    </button>
                                </div>
                            )}

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
                                {seriesPackages
                                    .filter((pkg) => {
                                        if (showAllPackages) return true
                                        if (formData.seriesId === pkg.id) return true
                                        const targetCategory = (queryCategory || selectedGoal?.id || selectedGoal?.name || "").toLowerCase().trim()
                                        if (!targetCategory || targetCategory === "all") return true
                                        const cat = (pkg.category || "").toLowerCase().trim()
                                        if (cat === targetCategory) return true
                                        if (targetCategory === "upsc") {
                                            const text = `${pkg.title || ""} ${pkg.category || ""}`.toLowerCase()
                                            if (text.includes("bpsc") || text.includes("bihar")) return false
                                            return cat.includes("upsc")
                                        }
                                        if (targetCategory === "bpsc") return cat.includes("bpsc")
                                        if (targetCategory === "ssc") return cat.includes("ssc")
                                        if (targetCategory === "state-pcs") return cat.includes("state") || cat.includes("pcs")
                                        if (targetCategory === "teaching") return cat.includes("teach") || cat.includes("tre")
                                        return cat.includes(targetCategory) || targetCategory.includes(cat)
                                    })
                                    .map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.title} ({s.category})
                                        </option>
                                    ))}
                            </select>
                            <FieldError msg={errors.seriesId} />

                            {/* Category Mismatch Warning */}
                            {(() => {
                                const selPkg = seriesPackages.find((s) => s.id === formData.seriesId)
                                const warn = selPkg ? detectCategoryMismatch(selPkg.title, selPkg.category) : null
                                if (!warn) return null
                                return (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs rounded-xl flex items-start gap-2 mt-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                        <div>
                                            <p className="font-bold">{warn}</p>
                                            <p className="text-[11px] opacity-80 mt-0.5">Please update the package's Category in Teacher Studio so it displays under the correct exam category.</p>
                                        </div>
                                    </div>
                                )
                            })()}
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

                        {/* Current Affairs Period Selector when testType is Current Affairs */}
                        {(formData.testType === "Current Affairs" || formData.testType === "CURRENT_AFFAIRS") && (
                            <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-3">
                                <label className="block text-xs font-bold text-teal-900 dark:text-teal-200">
                                    Current Affairs Period <span className="text-[#EF4444]">*</span>
                                </label>
                                <p className="text-[11px] text-teal-700 dark:text-teal-300">
                                    Select the Month and Year for this Current Affairs CBT quiz. It will automatically be categorized under Current Affairs.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-teal-800 dark:text-teal-300 mb-1">
                                            Month
                                        </label>
                                        <select
                                            value={formData.month || new Date().getMonth() + 1}
                                            onChange={(e) => updateField("month", Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-hidden"
                                            aria-label="Select CA Month"
                                        >
                                            {CA_MONTHS.map((m, idx) => (
                                                <option key={m} value={idx + 1}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-teal-800 dark:text-teal-300 mb-1">
                                            Year
                                        </label>
                                        <input
                                            type="number"
                                            min={2000}
                                            max={2100}
                                            value={formData.year || new Date().getFullYear()}
                                            onChange={(e) => updateField("year", Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-hidden"
                                            aria-label="Select CA Year"
                                        />
                                    </div>
                                </div>
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
                                    🔒 This test requires an active AspirantBook Pass subscription.
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
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center">
                                {dirtyStatusElement}
                            </div>
                            <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleSaveCurrent({ stayOnStep: true })}
                                    className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {isSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex items-center justify-center gap-2 px-7 py-3 bg-sky-700 hover:bg-sky-600 text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer min-h-[44px] flex-1 sm:flex-initial"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
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
                                                    updateSectionNumQuestions(idx, v)
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

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[44px] w-full sm:w-auto"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </button>
                        <div className="flex items-center">
                            {dirtyStatusElement}
                        </div>
                        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveCurrent({ stayOnStep: true })}
                                className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex items-center justify-center gap-2 px-7 py-3 bg-[#00A8FF] hover:bg-[#0096e6] text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer min-h-[44px] flex-1 sm:flex-initial"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────── */}
            {/* STEP 3: Question Authoring Studio */}
            {/* ──────────────────────────────────────────────────────────────── */}
            {step === 3 && (
                <div className="space-y-4">
                    {/* Overflow / Import warning banner */}
                    {importWarning && (
                        <div
                            data-testid="overflow-warning"
                            className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 font-medium animate-in fade-in"
                        >
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>{importWarning}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setImportWarning(null)}
                                className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-100 cursor-pointer"
                                aria-label="Dismiss warning"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                Questions Complete
                            </span>
                            <span className="text-xs font-black text-[#00A8FF]">
                                {completedCount} of {computedTotalQuestions} complete
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#00A8FF] to-[#00D084] rounded-full transition-all duration-500"
                                style={{
                                    width: `${computedTotalQuestions > 0 ? (completedCount / computedTotalQuestions) * 100 : 0}%`,
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
                                                        {filled}/{sec.numQuestions} complete
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
                                            {sectionForStep3?.numQuestions ?? questionsForCurrentSection.length}
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

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs sm:text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer w-full sm:w-auto min-h-[44px]"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Sections
                        </button>
                        <div className="flex items-center">
                            {dirtyStatusElement}
                        </div>
                        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveCurrent({ stayOnStep: true })}
                                className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer w-full sm:w-auto min-h-[44px] flex-1 sm:flex-initial"
                            >
                                Preview & Publish
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
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
                                            href={`/test-series/${savedTestId}/attempt?testId=${savedTestId}&title=${encodeURIComponent(formData.title)}&questions=${computedTotalQuestions}&marks=${computedTotalMarks}&duration=${formData.durationMinutes}`}
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

                    <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="flex items-center gap-2 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[44px]"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Back to Questions
                            </button>
                            {dirtyStatusElement}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setShowStep4Review(true)}
                                className="flex items-center gap-2 px-4 py-3 border border-sky-500 text-sky-700 dark:text-sky-400 font-bold text-sm rounded-xl hover:bg-sky-50 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[44px]"
                            >
                                <FileText className="h-4 w-4" />
                                <span>Review all questions</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className="flex items-center gap-2 px-5 py-3 border border-[#00A8FF] text-[#00A8FF] font-bold text-sm rounded-xl hover:bg-[#00A8FF]/10 transition-all cursor-pointer min-h-[44px]"
                            >
                                <Eye className="h-4 w-4" />
                                Preview
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleSaveDraft}
                                className="flex items-center gap-2 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all cursor-pointer min-h-[44px]"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {isSaving ? "Saving..." : (editTestId ? "Update Draft" : "Save Draft")}
                            </button>
                            <button
                                type="button"
                                disabled={isSaving || totalIncomplete > 0}
                                onClick={handlePublish}
                                className={`flex items-center gap-2 px-8 py-3 text-white font-black text-sm rounded-xl shadow-lg transition-all min-h-[44px] ${
                                    totalIncomplete > 0 || isSaving
                                        ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-60"
                                        : "bg-[#00A8FF] hover:bg-[#0096e6] active:scale-[0.98] cursor-pointer"
                                }`}
                            >
                                <Rocket className="h-4 w-4" />
                                {isSaving ? "Saving..." : (isPublishedTest ? "Update Test" : "Publish Test")}
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
                        style={{ maxWidth: "min(40rem, calc(100vw - 32px))" }}
                        className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-3xl w-full p-4 sm:p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto overflow-x-hidden box-border"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-black text-gray-900 dark:text-white break-words">
                                    Bulk Import / AI Generate
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                                    Import from Excel/CSV, paste raw JSON from Gemini/NotebookLM, or use AI
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setBulkImportOpen(false)
                                    setJsonPreview(null)
                                }}
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
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold">Upload Error</p>
                                    <p className="break-words">{uploadError}</p>
                                </div>
                            </div>
                        )}

                        {uploadSuccess && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <Check className="h-4 w-4 shrink-0" />
                                <span className="font-bold">{uploadSuccess}</span>
                            </div>
                        )}

                        {/* ── JSON Import Preview Screen ── */}
                        {jsonPreview ? (
                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <span>JSON Import Preview</span>
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setJsonPreview(null)
                                            setUploadedFileBlocks([])
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer"
                                    >
                                        Clear Preview
                                    </button>
                                </div>

                                {/* E1. Uploaded File Blocks Reorder List */}
                                {uploadedFileBlocks.length > 1 && (
                                    <div className="p-3 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl space-y-2">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            File Order (Natural-sorted, click ↑/↓ to reorder):
                                        </p>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                            {uploadedFileBlocks.map((block, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg text-xs"
                                                >
                                                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate min-w-0">
                                                        {idx + 1}. {block.filename}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={idx === 0}
                                                            onClick={() => moveFileBlock(idx, -1)}
                                                            className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold text-xs"
                                                            title="Move Up"
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={idx === uploadedFileBlocks.length - 1}
                                                            onClick={() => moveFileBlock(idx, 1)}
                                                            className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold text-xs"
                                                            title="Move Down"
                                                        >
                                                            ↓
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* F1. Stats Summary Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Total Found</span>
                                        <span className="text-base font-extrabold text-blue-700 dark:text-blue-300">{jsonPreview.totalFound}</span>
                                    </div>
                                    <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Valid to Import</span>
                                        <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">{jsonPreview.validCount}</span>
                                    </div>
                                    <div className="p-2.5 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-xl text-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Batch Duplicates</span>
                                        <span className="text-base font-extrabold text-purple-700 dark:text-purple-300">{jsonPreview.duplicatesRemoved}</span>
                                    </div>
                                    <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Already in Test</span>
                                        <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">{jsonPreview.alreadyInTestCount}</span>
                                    </div>
                                    <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Warnings</span>
                                        <span className="text-base font-extrabold text-amber-700 dark:text-amber-300">{jsonPreview.warningCount}</span>
                                    </div>
                                    <div className="p-2.5 bg-red-50/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">Skipped</span>
                                        <span className="text-base font-extrabold text-red-700 dark:text-red-300">{jsonPreview.skipped.length}</span>
                                    </div>
                                </div>

                                {/* F2. Skipped Items List + Download Skipped Report */}
                                {jsonPreview.skipped.length > 0 && (
                                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs space-y-2 max-h-40 overflow-y-auto">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                <span>Skipped Items ({jsonPreview.skipped.length})</span>
                                            </p>
                                            <button
                                                type="button"
                                                onClick={downloadSkippedReport}
                                                className="flex items-center gap-1 px-2.5 py-1 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 rounded-md font-bold text-[11px] hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
                                            >
                                                <FileDown className="h-3 w-3" />
                                                <span>Download Skipped Report (JSON)</span>
                                            </button>
                                        </div>
                                        <ul className="space-y-1 text-gray-700 dark:text-gray-300 text-[11px]">
                                            {jsonPreview.skipped.map((s, idx) => (
                                                <li key={idx} className="flex items-start gap-1.5">
                                                    <span className="font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                                                        Block {s.blockIndex}{s.questionIndex ? `, Q${s.questionIndex}` : ""}:
                                                    </span>
                                                    <span className="break-words">{s.reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* F1. Questions Preview List with Checkboxes & Warnings */}
                                {jsonPreview.validCount > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                Questions Ready ({selectedQuestionIds.size} of {jsonPreview.validCount} selected)
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedQuestionIds.size === jsonPreview.questions.length) {
                                                        setSelectedQuestionIds(new Set())
                                                    } else {
                                                        setSelectedQuestionIds(new Set(jsonPreview.questions.map((q) => q.id)))
                                                    }
                                                }}
                                                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                                            >
                                                {selectedQuestionIds.size === jsonPreview.questions.length ? "Deselect All" : "Select All"}
                                            </button>
                                        </div>

                                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100 dark:divide-gray-800/60 border border-gray-200 dark:border-gray-800 rounded-xl p-2.5 bg-white dark:bg-gray-900/40">
                                            {jsonPreview.questions.map((q) => {
                                                const isChecked = selectedQuestionIds.has(q.id)
                                                return (
                                                    <div key={q.id} className="pt-2 first:pt-0 space-y-1.5 text-xs">
                                                        <div className="flex items-start gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const next = new Set(selectedQuestionIds)
                                                                    if (e.target.checked) next.add(q.id)
                                                                    else next.delete(q.id)
                                                                    setSelectedQuestionIds(next)
                                                                }}
                                                                className="h-4 w-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-700 cursor-pointer shrink-0"
                                                                aria-label={`Select Question ${q.id}`}
                                                            />
                                                            <span className="font-bold text-[#00A8FF] shrink-0">Q{q.id}.</span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-gray-900 dark:text-gray-100 font-medium break-words">
                                                                    {q.questionEn}
                                                                </p>
                                                                {q.questionHi && (
                                                                    <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5 break-words">
                                                                        {q.questionHi}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="shrink-0 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] rounded-md">
                                                                Ans: {q.correctOption}
                                                            </span>
                                                        </div>

                                                        {/* Warnings per question (D1-D5, C5) */}
                                                        {q.warnings && q.warnings.length > 0 && (
                                                            <div className="ml-6 flex items-start gap-1 p-1.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                                    {q.warnings.map((w, wIdx) => (
                                                                        <p key={wIdx}>{w}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleConfirmImport}
                                        disabled={selectedQuestionIds.size === 0 || isImporting}
                                        className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm min-h-[44px]"
                                    >
                                        <Check className="h-4 w-4 shrink-0" />
                                        <span>
                                            {isImporting
                                                ? "Importing Questions…"
                                                : `Import ${selectedQuestionIds.size} questions`}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setJsonPreview(null)
                                            setUploadedFileBlocks([])
                                        }}
                                        className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer min-h-[44px]"
                                    >
                                        Back to Edit
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Download Templates & File Upload */}
                                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            Excel, CSV or Multiple JSON File Import
                                        </p>
                                        <span className="text-[10px] text-gray-500 font-semibold">Supports up to 150+ Qs</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={downloadSampleCsv}
                                            className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[#00A8FF]/40 text-sky-700 dark:text-sky-400 rounded-xl text-xs font-bold hover:bg-[#00A8FF]/5 transition-all cursor-pointer min-w-0 min-h-[44px]"
                                        >
                                            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">Download CSV Template</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={downloadSampleJson}
                                            className="flex items-center justify-center gap-1.5 py-2 px-3 border border-purple-400 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all cursor-pointer min-w-0 min-h-[44px]"
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
                                                    Reading and analyzing questions…
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-6 w-6 text-[#00A8FF]" />
                                                <div className="text-center">
                                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                                                        Click to upload .CSV or multiple .JSON files
                                                    </span>
                                                    <span className="text-[11px] text-gray-600 dark:text-gray-400">
                                                        Automatically cleans citations, fixes quotes &amp; merges blocks
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept=".csv,.json,text/csv,application/json"
                                            multiple
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {/* Paste JSON (multiple blocks allowed) */}
                                <div className="p-4 bg-gradient-to-r from-emerald-50/60 to-white dark:from-[#05231c] dark:to-[#071d33] rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Code2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                            Paste JSON (multiple blocks allowed)
                                        </p>
                                    </div>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                                        Paste multiple raw JSON blocks from Gemini or NotebookLM. Auto-cleans code fences, [1][2] citations, fixes quotes &amp; trailing commas, and keeps Hindi intact.
                                    </p>
                                    <textarea
                                        rows={4}
                                        value={rawJsonText}
                                        onChange={(e) => setRawJsonText(e.target.value)}
                                        placeholder='Paste raw JSON blocks here (e.g. [{"questionEn": "...", "questionHi": "...", "options": [...]}]). Multiple [ ... ] blocks allowed.'
                                        className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleProcessPastedJson}
                                        disabled={isProcessingJson || !rawJsonText.trim()}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm min-h-[44px]"
                                    >
                                        {isProcessingJson ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processing &amp; Validating…
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Process &amp; Preview
                                            </>
                                        )}
                                    </button>
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
                                            className="w-full sm:w-auto shrink-0 px-4 py-2 bg-[#9333EA] hover:bg-[#7c22d4] text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
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
                                        className="w-full py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm min-h-[44px]"
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
                            </>
                        )}

                        <button
                            onClick={() => {
                                setBulkImportOpen(false)
                                setJsonPreview(null)
                            }}
                            className="w-full py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer min-h-[44px]"
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
                                <span>🏆 {computedTotalMarks} marks</span>
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
