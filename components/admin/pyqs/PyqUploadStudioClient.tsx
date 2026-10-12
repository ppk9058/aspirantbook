"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Lock,
  Unlock,
  Zap,
  HelpCircle,
  X,
  FileCheck,
  ChevronDown,
} from "lucide-react"

interface SubExam {
  id: string
  categoryId: string
  name: string
  slug: string
}

interface Category {
  id: string
  name: string
  slug: string
  badgeColor?: string | null
  subExams: SubExam[]
}

export function PyqUploadStudioClient({ categories }: { categories: Category[] }) {
  const router = useRouter()

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || ""
  )
  const [selectedSubExamId, setSelectedSubExamId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [stage, setStage] = useState<string>("PRELIMS")
  const [shift, setShift] = useState("Shift 1 (Morning)")
  const [subject, setSubject] = useState("")
  const [durationMin, setDurationMin] = useState<number>(120)
  const [totalMarks, setTotalMarks] = useState<number>(150)
  const [totalQuestions, setTotalQuestions] = useState<number>(150)
  const [languages, setLanguages] = useState<string[]>(["English", "Hindi"])

  // PDF Uploads State
  const [paperPdfFile, setPaperPdfFile] = useState<File | null>(null)
  const [paperPdfUrl, setPaperPdfUrl] = useState<string>("")
  const [paperFileSizeKb, setPaperFileSizeKb] = useState<number | null>(null)
  const [isUploadingPaperPdf, setIsUploadingPaperPdf] = useState(false)

  const [solutionPdfFile, setSolutionPdfFile] = useState<File | null>(null)
  const [solutionPdfUrl, setSolutionPdfUrl] = useState<string>("")
  const [isUploadingSolutionPdf, setIsUploadingSolutionPdf] = useState(false)

  // Pricing & CBT
  const [accessType, setAccessType] = useState<"FREE" | "PAID">("PAID")
  const [unlockPrice, setUnlockPrice] = useState<number>(49)
  const [isPassIncluded, setIsPassIncluded] = useState<boolean>(true)
  const [hasCbtMode, setHasCbtMode] = useState<boolean>(true)
  const [cbtTestId, setCbtTestId] = useState<string>("")
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED")

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Get active category and its subExams
  const activeCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0]
  const availableSubExams = activeCategory?.subExams || []

  // Auto-fill title helper
  const handleQuickTitleFill = () => {
    const catName = activeCategory ? activeCategory.name : "BPSC"
    const subName = availableSubExams.find((s) => s.id === selectedSubExamId)?.name || ""
    const subText = subName ? ` ${subName.replace(catName, "").trim()}` : ""
    setTitle(`69th ${catName}${subText} PYQ Full Length Official Paper`)
  }

  // Handle PDF upload
  const handleFileUpload = async (file: File, isSolution: boolean) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are supported.")
      return
    }

    if (isSolution) {
      setIsUploadingSolutionPdf(true)
      setSolutionPdfFile(file)
    } else {
      setIsUploadingPaperPdf(true)
      setPaperPdfFile(file)
    }
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "pyq")

      const res = await fetch("/api/admin/pyqs/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "File upload failed")

      if (isSolution) {
        setSolutionPdfUrl(data.url)
      } else {
        setPaperPdfUrl(data.url)
        setPaperFileSizeKb(data.fileSizeKb)
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload file")
    } finally {
      if (isSolution) setIsUploadingSolutionPdf(false)
      else setIsUploadingPaperPdf(false)
    }
  }

  // Submit Paper
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!title.trim()) {
      setErrorMessage("Please enter a paper title.")
      return
    }

    if (!paperPdfUrl) {
      setErrorMessage("Please upload the main Question Paper PDF.")
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        categoryId: selectedCategoryId,
        subExamId: selectedSubExamId || undefined,
        title: title.trim(),
        year: Number(year),
        stage,
        shift: shift.trim() || undefined,
        subject: subject.trim() || undefined,
        durationMin: Number(durationMin),
        totalMarks: Number(totalMarks),
        totalQuestions: Number(totalQuestions),
        languages,
        paperPdfUrl,
        solutionPdfUrl: solutionPdfUrl || undefined,
        pdfFileSizeKb: paperFileSizeKb || undefined,
        accessType,
        unlockPrice: accessType === "PAID" ? Number(unlockPrice) : 0,
        isPassIncluded,
        hasCbtMode,
        cbtTestId: cbtTestId.trim() || undefined,
        status,
      }

      const res = await fetch("/api/admin/pyqs/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create PYQ Paper")

      setSuccessMessage(`Official PYQ Paper "${title}" successfully published!`)
      setTimeout(() => {
        router.push("/admin/pyqs")
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to publish paper")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <Link
            href="/admin/pyqs"
            className="text-xs font-semibold text-gray-500 hover:text-orange-600 flex items-center gap-1 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to PYQ Directory
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-orange-600" />
            Upload Official PYQ Paper
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure examination hierarchy, attach official question & answer PDFs, and set unlock monetization.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Exam Hierarchy Selection */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-bold flex items-center justify-center">
                1
              </span>
              Exam Category & Sub-Exam Head
            </h2>
            <Link
              href="/admin/pyqs/categories"
              target="_blank"
              className="text-xs text-orange-600 hover:underline font-medium"
            >
              + Add New Exam or Sub-Exam
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Major Exam Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Major Exam Head * (e.g. BPSC, UPSC, UPPSC)
              </label>
              <div className="relative">
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value)
                    setSelectedSubExamId("")
                  }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.slug.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-Exam Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Sub-Exam Specialization (e.g. CDPO, AEDO, CCE, TRE)
              </label>
              <select
                value={selectedSubExamId}
                onChange={(e) => setSelectedSubExamId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
              >
                <option value="">General / All Branches</option>
                {availableSubExams.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Paper Identification & Metadata */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-bold flex items-center justify-center">
                2
              </span>
              Paper Title & Specifications
            </h2>
            <button
              type="button"
              onClick={handleQuickTitleFill}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-generate Title
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Official Paper Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 69th BPSC PYQ Full Length Official Paper"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
            />
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Subject (e.g. General Studies, Mathematics, History, Hindi)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. General Studies - 1, Science, Social Science"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {["General Studies", "History", "Polity", "Geography", "Mathematics", "Science", "Hindi"].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setSubject(sug)}
                  className="px-2 py-0.5 rounded text-[11px] bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-gray-600 font-medium transition-colors cursor-pointer"
                >
                  +{sug}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Year */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Exam Year *</label>
              <input
                type="number"
                required
                min={2000}
                max={2030}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {/* Stage */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Exam Stage *</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none"
              >
                <option value="PRELIMS">Prelims</option>
                <option value="MAINS">Mains</option>
                <option value="INTERVIEW">Interview / Theory</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Duration (Mins)</label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none"
              />
            </div>

            {/* Total Marks */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shift */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Shift / Sitting</label>
              <input
                type="text"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                placeholder="e.g. Shift 1 (12:00 PM - 2:00 PM)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none"
              />
            </div>

            {/* Language checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Languages Available</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={languages.includes("Hindi")}
                    onChange={(e) => {
                      if (e.target.checked) setLanguages([...languages, "Hindi"])
                      else setLanguages(languages.filter((l) => l !== "Hindi"))
                    }}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  Hindi
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={languages.includes("English")}
                    onChange={(e) => {
                      if (e.target.checked) setLanguages([...languages, "English"])
                      else setLanguages(languages.filter((l) => l !== "English"))
                    }}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  English
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Dual PDF Uploader */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-bold flex items-center justify-center">
                3
              </span>
              PDF Documents Upload
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Upload original question paper and optional answer keys. Files are stored securely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Question Paper Dropzone */}
            <div className="border-2 border-dashed border-gray-200 hover:border-orange-400 rounded-2xl p-5 text-center transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto text-orange-600 mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-xs mb-1">
                Question Paper PDF *
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                Original question booklet (.pdf format, up to 50MB)
              </p>

              {paperPdfUrl ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-900 truncate">
                      {paperPdfFile?.name || "Uploaded PDF"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPaperPdfUrl("")
                      setPaperPdfFile(null)
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="inline-block px-4 py-2 bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors">
                  {isUploadingPaperPdf ? "Uploading..." : "Select Question PDF"}
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={isUploadingPaperPdf}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], false)
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Answer Key / Solutions Dropzone */}
            <div className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl p-5 text-center transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto text-blue-600 mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-xs mb-1">
                Detailed Solutions PDF (Optional)
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                Official answer key or faculty explanations
              </p>

              {solutionPdfUrl ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-blue-900 truncate">
                      {solutionPdfFile?.name || "Solution PDF Uploaded"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSolutionPdfUrl("")
                      setSolutionPdfFile(null)
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="inline-block px-4 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors">
                  {isUploadingSolutionPdf ? "Uploading..." : "Select Solution PDF"}
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={isUploadingSolutionPdf}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], true)
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Monetization & CBT Test Linkage */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-bold flex items-center justify-center">
                4
              </span>
              Unlock Pricing & CBT Test Engine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Access Mode */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">Access Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccessType("FREE")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    accessType === "FREE"
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    100% Free
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Unlocked after phone verification</p>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessType("PAID")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    accessType === "PAID"
                      ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-gray-900">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Paid Unlock
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Requires single-paper payment</p>
                </button>
              </div>

              {accessType === "PAID" && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unlock Price (₹ INR)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={unlockPrice}
                      onChange={(e) => setUnlockPrice(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2 text-sm font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPassIncluded}
                  onChange={(e) => setIsPassIncluded(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                Include in TrillionPass All-Access (₹499)
              </label>
            </div>

            {/* CBT Engine Link */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">
                Interactive CBT Test Mode
              </label>
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCbtMode}
                    onChange={(e) => setHasCbtMode(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Enable Live CBT Mode for this Paper
                </label>
                <p className="text-[11px] text-indigo-700/80">
                  Allows students to take this previous year paper under real exam conditions with negative marking and instant AIR ranking.
                </p>

                {hasCbtMode && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Link Existing Test Slug (Optional)
                    </label>
                    <input
                      type="text"
                      value={cbtTestId}
                      onChange={(e) => setCbtTestId(e.target.value)}
                      placeholder="e.g. bpsc-72nd-2026 or exam test ID"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-gray-200 bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-700">Status:</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="PUBLISHED"
                  checked={status === "PUBLISHED"}
                  onChange={() => setStatus("PUBLISHED")}
                  className="text-orange-600"
                />
                Published
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="DRAFT"
                  checked={status === "DRAFT"}
                  onChange={() => setStatus("DRAFT")}
                  className="text-orange-600"
                />
                Draft
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/pyqs"
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isSubmitting ? "Publishing Paper..." : "Publish Official Paper"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
