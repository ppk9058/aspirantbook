"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import type { Batch, BatchTier, BatchFeature, BatchScheduleItem, BatchTeacher, BatchDemoVideo, BatchFAQ } from "@/lib/batches-service"

interface BatchFormProps {
  initialData?: Batch
  isEditing?: boolean
}

export default function BatchForm({ initialData, isEditing = false }: BatchFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const isTeacher = session?.user?.role === "TEACHER"
  const batchesUrl = isTeacher ? "/teacher/batches" : "/admin/batches"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Core Fields
  const [title, setTitle] = useState(initialData?.title || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [classTag, setClassTag] = useState(initialData?.classTag || "Class 6")
  const [category, setCategory] = useState(initialData?.category || "school-prep")
  const [language, setLanguage] = useState(initialData?.language || "HINGLISH")
  const [targetText, setTargetText] = useState(initialData?.targetText || "Targeted for students")
  const [scheduleText, setScheduleText] = useState(initialData?.scheduleText || "Starts on 13 Jul, 2026 Ends on 31 Mar, 2027")
  const [startDate, setStartDate] = useState(initialData?.startDate || "13 Jul 2026")
  const [endDate, setEndDate] = useState(initialData?.endDate || "31 Mar 2027")
  const [durationText, setDurationText] = useState(initialData?.durationText || "Full Academic Year")
  const [validityText, setValidityText] = useState(initialData?.validityText || "31 March 2027")
  const [price, setPrice] = useState(initialData?.price || "₹3,000")
  const [originalPrice, setOriginalPrice] = useState(initialData?.originalPrice || "₹4,000")
  const [discount, setDiscount] = useState(initialData?.discount || "25% OFF")
  const [image, setImage] = useState(initialData?.image || "/batch-green.svg")
  const [badge, setBadge] = useState(initialData?.badge || "ONLINE")

  // Tiers (Regular vs Infinity Pro)
  const [tiers, setTiers] = useState<BatchTier[]>(
    initialData?.tiers || [
      {
        id: "tier-regular",
        name: "Regular",
        price: "₹3,000",
        originalPrice: "₹4,000",
        isPopular: false,
        features: [
          "Live lectures by master educators",
          "Daily Home Assignments & DPPs",
          "24x7 In-app Doubt Support",
          "Periodic Board tests & rankings",
        ],
      },
      {
        id: "tier-infinity",
        name: "Infinity Pro",
        price: "₹8,500",
        originalPrice: "₹12,000",
        isPopular: true,
        features: [
          "Everything in Regular Batch",
          "Khazana 5000+ Recorded Concepts Library",
          "1:1 Personal Mentor & Homework Guidance",
          "Printed Workbooks delivered at doorstep",
        ],
      },
    ]
  )

  // Highlights & Details
  const [aboutHighlights, setAboutHighlights] = useState<string[]>(
    initialData?.aboutHighlights || [
      "Course Duration: Full Academic Year",
      "Live interactive classes with instant doubts resolution",
      "Subjective and objective periodic tests with All-India ranking",
    ]
  )
  const [newHighlight, setNewHighlight] = useState("")

  // Features List
  const [features, setFeatures] = useState<BatchFeature[]>(
    initialData?.features || [
      {
        title: "Live Interactive Classes",
        description: "High retention audio-visual lectures with instant doubt clearing.",
      },
      {
        title: "Daily Practice Papers (DPPs)",
        description: "Problem sets after every lecture with detailed video solutions.",
      },
    ]
  )

  // Teachers List
  const [teachers, setTeachers] = useState<BatchTeacher[]>(
    initialData?.teachers || [
      {
        name: "Dr. Arvind Sharma",
        role: "Head of Science & Physics",
        subject: "Physics & Science",
        experience: "10+ Years Experience",
        qualification: "Ph.D & M.Sc (Gold Medalist)",
        avatar: "/curious-avatar.svg",
        bio: "Trained 25,000+ school students with an intuitive experimental approach.",
      },
    ]
  )

  // Demo Videos List
  const [demoVideos, setDemoVideos] = useState<BatchDemoVideo[]>(
    initialData?.demoVideos || [
      {
        title: "Introduction to Motion & Measurement",
        subject: "Physics",
        duration: "45 mins",
        teacher: "Dr. Arvind Sharma",
        thumbnail: "/batch-green.svg",
        videoUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
      },
    ]
  )

  // FAQs List
  const [faqs, setFaqs] = useState<BatchFAQ[]>(
    initialData?.faqs || [
      {
        question: "When will the batch start and end?",
        answer: "The batch schedule begins on the start date listed and recordings remain accessible until the validity date.",
      },
      {
        question: "Can I watch the lectures after they are streamed live?",
        answer: "Yes, all live sessions are recorded and made available 24/7 in HD with speed controls.",
      },
    ]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    const payload = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      classTag,
      category,
      language,
      targetText,
      scheduleText,
      startDate,
      endDate,
      durationText,
      validityText,
      price,
      originalPrice,
      discount,
      image,
      badge,
      tiers,
      aboutHighlights,
      aboutDetails: initialData?.aboutDetails || [
        "This course is meticulously designed by master educators to provide complete conceptual clarity and academic mastery.",
      ],
      features,
      subjects: initialData?.subjects || ["Mathematics", "Science", "Social Science", "English"],
      weeklySchedule: initialData?.weeklySchedule || [
        { day: "Monday to Saturday", subjects: "Core Subjects", time: "04:30 PM - 07:30 PM", type: "Live Lectures" },
      ],
      teachers,
      demoVideos,
      faqs,
      moreDetails: initialData?.moreDetails || [],
    }

    try {
      const url = isEditing && initialData?.id ? `/api/admin/batches/${initialData.id}` : "/api/admin/batches"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to save batch")
      }

      const saved = await res.json()
      setSuccessMessage("Batch saved successfully!")
      setTimeout(() => {
        router.push(batchesUrl)
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href={batchesUrl}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              {isEditing ? `Edit: ${initialData?.title}` : "Create New Batch"}
            </h1>
            <p className="text-xs text-gray-500">
              Manage batch pricing, teachers, demo videos, schedule, and FAQs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {initialData?.slug && (
            <Link
              href={`/batches/${initialData.slug}`}
              target="_blank"
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all"
            >
              Preview Live Page ↗
            </Link>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Saving..." : "Save Batch"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. Basic Information */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
        <h2 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3">
          1. Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Batch Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Champs 2.0 2027 (Class 6)"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">URL Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. champs-6"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Class Tag</label>
            <select
              value={classTag}
              onChange={(e) => setClassTag(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none bg-white"
            >
              <option value="Class 6">Class 6</option>
              <option value="Class 7">Class 7</option>
              <option value="Class 8">Class 8</option>
              <option value="Class 9">Class 9</option>
              <option value="Class 10">Class 10</option>
              <option value="Class 11">Class 11</option>
              <option value="Class 12">Class 12</option>
              <option value="Skills">Skills</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none bg-white"
            >
              <option value="HINGLISH">HINGLISH</option>
              <option value="ENGLISH">ENGLISH</option>
              <option value="HINDI">HINDI</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Target Audience Subtitle</label>
            <input
              type="text"
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="e.g. Targeted for students of Class 6th"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Pricing & Dates */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
        <h2 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3">
          2. Pricing &amp; Dates
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Offer Price</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. ₹3,000"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Original Price (Strikethrough)</label>
            <input
              type="text"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="e.g. ₹4,000"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Discount Pill</label>
            <input
              type="text"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="e.g. 25% OFF"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Start Date</label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="e.g. 13 Jul 2026"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">End Date</label>
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="e.g. 31 Mar 2027"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Validity Text</label>
            <input
              type="text"
              value={validityText}
              onChange={(e) => setValidityText(e.target.value)}
              placeholder="e.g. 31 March 2027"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Poster Image Path</label>
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="/batch-green.svg"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Delivery Badge</label>
            <input
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="ONLINE"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B47FB] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Tiers (Regular & Infinity Pro) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              3. Package Tiers (Regular / Infinity Pro)
            </h2>
            <p className="text-xs text-gray-500">
              Configure tiered plans shown side-by-side to parents and students
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTiers([
                ...tiers,
                {
                  id: `tier-${Date.now()}`,
                  name: "New Tier",
                  price: "₹4,999",
                  isPopular: false,
                  features: ["Live lectures", "Doubt clearing"],
                },
              ])
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Tier</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tiers.map((tier, tIdx) => (
            <div
              key={tier.id}
              className="p-5 rounded-2xl border border-gray-200 bg-[#FAFBFD] space-y-4"
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => {
                    const newTiers = [...tiers]
                    newTiers[tIdx].name = e.target.value
                    setTiers(newTiers)
                  }}
                  className="font-black text-base text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-[#5B47FB] pb-0.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTiers(tiers.filter((_, idx) => idx !== tIdx))
                  }}
                  className="p-1 rounded-lg text-red-500 hover:bg-red-50"
                  title="Remove tier"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-600">Price</label>
                  <input
                    type="text"
                    value={tier.price}
                    onChange={(e) => {
                      const newTiers = [...tiers]
                      newTiers[tIdx].price = e.target.value
                      setTiers(newTiers)
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id={`popular-${tIdx}`}
                    checked={tier.isPopular || false}
                    onChange={(e) => {
                      const newTiers = [...tiers]
                      newTiers[tIdx].isPopular = e.target.checked
                      setTiers(newTiers)
                    }}
                    className="h-4 w-4 text-[#5B47FB] rounded"
                  />
                  <label htmlFor={`popular-${tIdx}`} className="text-xs font-bold text-gray-700">
                    Most Popular?
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 block mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={4}
                  value={tier.features.join("\n")}
                  onChange={(e) => {
                    const newTiers = [...tiers]
                    newTiers[tIdx].features = e.target.value.split("\n").filter((l) => l.trim().length > 0)
                    setTiers(newTiers)
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#5B47FB]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Teachers Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>4. Faculty Teachers</span>
              <GraduationCap className="h-5 w-5 text-[#5B47FB]" />
            </h2>
            <p className="text-xs text-gray-500">
              Manage the educators assigned to this batch
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTeachers([
                ...teachers,
                {
                  name: "New Teacher",
                  role: "Master Educator",
                  subject: "Mathematics",
                  experience: "5+ Years",
                  qualification: "M.Sc, B.Ed",
                  avatar: "/curious-avatar.svg",
                  bio: "Experienced subject matter expert.",
                },
              ])
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Teacher</span>
          </button>
        </div>

        <div className="space-y-4">
          {teachers.map((teacher, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-gray-200 bg-[#FAFBFD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Name</label>
                  <input
                    type="text"
                    value={teacher.name}
                    onChange={(e) => {
                      const updated = [...teachers]
                      updated[idx].name = e.target.value
                      setTeachers(updated)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Subject</label>
                  <input
                    type="text"
                    value={teacher.subject}
                    onChange={(e) => {
                      const updated = [...teachers]
                      updated[idx].subject = e.target.value
                      setTeachers(updated)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Experience</label>
                  <input
                    type="text"
                    value={teacher.experience}
                    onChange={(e) => {
                      const updated = [...teachers]
                      updated[idx].experience = e.target.value
                      setTeachers(updated)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Qualification</label>
                  <input
                    type="text"
                    value={teacher.qualification}
                    onChange={(e) => {
                      const updated = [...teachers]
                      updated[idx].qualification = e.target.value
                      setTeachers(updated)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTeachers(teachers.filter((_, i) => i !== idx))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Demo Videos Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>5. Free Demo Content</span>
              <Video className="h-5 w-5 text-red-500" />
            </h2>
            <p className="text-xs text-gray-500">
              Demo lectures with embedded YouTube preview links
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDemoVideos([
                ...demoVideos,
                {
                  title: "Sample Demo Lecture",
                  subject: "Core Subject",
                  duration: "30 mins",
                  teacher: teachers[0]?.name || "Faculty",
                  thumbnail: "/batch-purple.svg",
                  videoUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
                },
              ])
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Demo Video</span>
          </button>
        </div>

        <div className="space-y-4">
          {demoVideos.map((video, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-gray-200 bg-[#FAFBFD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500">Lecture Title</label>
                  <input
                    type="text"
                    value={video.title}
                    onChange={(e) => {
                      const updated = [...demoVideos]
                      updated[idx].title = e.target.value
                      setDemoVideos(updated)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500">Duration &bull; Subject</label>
                  <input
                    type="text"
                    value={`${video.duration} - ${video.subject}`}
                    onChange={(e) => {
                      const updated = [...demoVideos]
                      const parts = e.target.value.split("-")
                      updated[idx].duration = parts[0]?.trim() || "30 mins"
                      updated[idx].subject = parts[1]?.trim() || "Science"
                      setDemoVideos(updated)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-gray-500">Embed Video URL</label>
                  <input
                    type="text"
                    value={video.videoUrl || ""}
                    onChange={(e) => {
                      const updated = [...demoVideos]
                      updated[idx].videoUrl = e.target.value
                      setDemoVideos(updated)
                    }}
                    placeholder="https://www.youtube-nocookie.com/embed/..."
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDemoVideos(demoVideos.filter((_, i) => i !== idx))}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 6. FAQs Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>6. Q&amp;A Section (FAQs)</span>
              <HelpCircle className="h-5 w-5 text-amber-500" />
            </h2>
            <p className="text-xs text-gray-500">
              Questions answered in the More Details accordion
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFaqs([
                ...faqs,
                {
                  question: "New FAQ Question?",
                  answer: "Answer to the question goes here.",
                },
              ])
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add FAQ</span>
          </button>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-gray-200 bg-[#FAFBFD] space-y-2"
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => {
                    const updated = [...faqs]
                    updated[idx].question = e.target.value
                    setFaqs(updated)
                  }}
                  className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg bg-white"
                  placeholder="Question"
                />
                <button
                  type="button"
                  onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0 ml-3"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={faq.answer}
                onChange={(e) => {
                  const updated = [...faqs]
                  updated[idx].answer = e.target.value
                  setFaqs(updated)
                }}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                placeholder="Answer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit Bottom Bar */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href={batchesUrl}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold transition-all"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 rounded-xl bg-[#5B47FB] hover:bg-[#4A38E8] text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? "Saving Batch..." : "Save Batch"}</span>
        </button>
      </div>
    </form>
  )
}
