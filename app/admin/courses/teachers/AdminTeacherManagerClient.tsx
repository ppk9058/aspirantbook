"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Users, Plus, Check, Edit2, BookOpen, ArrowLeft, Loader2, Sparkles, AlertCircle } from "lucide-react"

interface TeacherCourse {
  course: {
    id: string
    title: string
    slug: string
  }
}

interface Teacher {
  id: string
  name: string
  nameHi?: string | null
  role?: string | null
  roleHi?: string | null
  bio?: string | null
  bioHi?: string | null
  avatar?: string | null
  credentials?: any
  credentialsHi?: any
  courses?: TeacherCourse[]
}

interface CourseOption {
  id: string
  title: string
  slug: string
}

export function AdminTeacherManagerClient({
  initialTeachers,
  allCourses,
}: {
  initialTeachers: Teacher[]
  allCourses: CourseOption[]
}) {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [nameHi, setNameHi] = useState("")
  const [role, setRole] = useState("")
  const [roleHi, setRoleHi] = useState("")
  const [bio, setBio] = useState("")
  const [bioHi, setBioHi] = useState("")
  const [avatar, setAvatar] = useState("")
  const [credentialsStr, setCredentialsStr] = useState("")
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  const handleStartCreate = () => {
    setSelectedTeacher(null)
    setIsCreatingNew(true)
    setName("")
    setNameHi("")
    setRole("")
    setRoleHi("")
    setBio("")
    setBioHi("")
    setAvatar("")
    setCredentialsStr("")
    setSelectedCourseIds([])
    setMessage(null)
  }

  const handleStartEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsCreatingNew(false)
    setName(teacher.name || "")
    setNameHi(teacher.nameHi || "")
    setRole(teacher.role || "")
    setRoleHi(teacher.roleHi || "")
    setBio(teacher.bio || "")
    setBioHi(teacher.bioHi || "")
    setAvatar(teacher.avatar || "")
    const creds = Array.isArray(teacher.credentials)
      ? teacher.credentials.map((c: any) => (typeof c === "string" ? c : c.label)).join(", ")
      : ""
    setCredentialsStr(creds)
    const attachedCourseIds = teacher.courses?.map((c) => c.course.id) || []
    setSelectedCourseIds(attachedCourseIds)
    setMessage(null)
  }

  const toggleCourseAttachment = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setMessage({ text: "Teacher name is required", type: "error" })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const credentials = credentialsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({ label }))

      const payload = {
        id: selectedTeacher?.id,
        name: name.trim(),
        nameHi: nameHi.trim() || null,
        role: role.trim() || null,
        roleHi: roleHi.trim() || null,
        bio: bio.trim() || null,
        bioHi: bioHi.trim() || null,
        avatar: avatar.trim() || null,
        credentials,
        courseIds: selectedCourseIds,
      }

      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save teacher")
      }

      setMessage({ text: "Teacher saved and attached successfully!", type: "success" })

      // Update local state
      setTeachers((prev) => {
        const idx = prev.findIndex((t) => t.id === data.teacher.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = data.teacher
          return next
        }
        return [data.teacher, ...prev]
      })
      setSelectedTeacher(data.teacher)
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred", type: "error" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/courses"
              className="text-xs font-bold text-gray-500 hover:text-orange-600 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Courses
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-orange-600" />
            <span>Central Faculty &amp; Teacher Store</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Create or edit teachers once and attach them across multiple courses. Any update syncs to all public course pages instantly.
          </p>
        </div>
        <button
          type="button"
          data-testid="btn-create-teacher"
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm cursor-pointer transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Teacher</span>
        </button>
      </div>

      {message && (
        <div
          role="status"
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Teachers List Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
              Faculty Directory ({teachers.length})
            </h2>
          </div>

          <div className="space-y-2">
            {teachers.map((t) => {
              const isSelected = selectedTeacher?.id === t.id
              const attachedCount = t.courses?.length || 0
              return (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/40 shadow-xs"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 truncate" data-testid={`teacher-name-${t.id}`}>
                          {t.name}
                        </span>
                        {t.nameHi && (
                          <span className="text-xs text-gray-500 font-medium truncate">
                            ({t.nameHi})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-orange-700 font-medium truncate mt-0.5">
                        {t.role || "Faculty"}
                      </p>
                      {t.bio && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                          {t.bio}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-600">
                        <BookOpen className="w-3 h-3 text-gray-400" />
                        <span>Attached to {attachedCount} course(s)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`btn-edit-teacher-${t.id}`}
                      onClick={() => handleStartEdit(t)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 transition cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Editor & Attachment Column */}
        <div className="lg:col-span-7">
          {selectedTeacher || isCreatingNew ? (
            <form
              onSubmit={handleSave}
              className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                  <span>{isCreatingNew ? "Create New Faculty Profile" : `Edit Profile: ${name || "Teacher"}`}</span>
                </h3>
                {selectedTeacher?.id && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    ID: {selectedTeacher.id}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input
                    type="text"
                    data-testid="input-admin-teacher-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (Hindi)</label>
                  <input
                    type="text"
                    value={nameHi}
                    onChange={(e) => setNameHi(e.target.value)}
                    placeholder="e.g. डॉ. राजेश शर्मा"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Role / Designation (English) *</label>
                  <input
                    type="text"
                    data-testid="input-admin-teacher-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Faculty & Mentor"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Role / Designation (Hindi)</label>
                  <input
                    type="text"
                    value={roleHi}
                    onChange={(e) => setRoleHi(e.target.value)}
                    placeholder="e.g. वरिष्ठ शिक्षक एवं मेंटर"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Credentials (comma separated)</label>
                  <input
                    type="text"
                    value={credentialsStr}
                    onChange={(e) => setCredentialsStr(e.target.value)}
                    placeholder="e.g. Ph.D History, 12+ Yrs Teaching, AIR 14"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Bio / Profile Summary (English)</label>
                  <textarea
                    rows={3}
                    data-testid="input-admin-teacher-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief background, mentorship highlights..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Bio / Profile Summary (Hindi)</label>
                  <textarea
                    rows={2}
                    value={bioHi}
                    onChange={(e) => setBioHi(e.target.value)}
                    placeholder="संक्षिप्त विवरण या मेंटरिंग की मुख्य बातें..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Course Attachment Selector */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block font-extrabold text-xs text-gray-800 uppercase tracking-wider mb-2">
                  Attach Faculty to Courses ({selectedCourseIds.length} attached)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Check all courses where this teacher teaches. Any updates saved above will immediately appear on all attached course pages.
                </p>

                <div className="max-h-52 overflow-y-auto space-y-1.5 border border-gray-200 rounded-xl p-3 bg-gray-50/50 text-xs">
                  {allCourses.length === 0 ? (
                    <p className="text-gray-400 italic">No published courses available.</p>
                  ) : (
                    allCourses.map((c) => {
                      const isAttached = selectedCourseIds.includes(c.id)
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white transition cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            data-testid={`checkbox-attach-course-${c.slug || c.id}`}
                            checked={isAttached}
                            onChange={() => toggleCourseAttachment(c.id)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="font-semibold text-gray-800">{c.title}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({c.slug})</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  data-testid="btn-save-teacher"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-orange-600 hover:bg-orange-700 shadow-sm cursor-pointer disabled:opacity-60 transition"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Teacher &amp; Update Attached Courses</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-500 text-xs">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-sm text-gray-700">No Teacher Selected</p>
              <p className="mt-1">Select a faculty member from the directory on the left or create a new profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
