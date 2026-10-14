"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    updateUserRole,
    enrollUserInCourse,
    unenrollUserFromCourse,
    updateUserProfile,
    deleteUser,
    toggleUserActiveStatus,
    adminTriggerPasswordReset,
    adminResendVerification,
    anonymizeUser
} from "@/lib/actions/admin/users"
import {
    User,
    Mail,
    Calendar,
    Award,
    BookOpen,
    TrendingUp,
    Edit,
    Save,
    X,
    Trash2,
    ShieldAlert,
    Phone,
    CreditCard,
    FileText,
    KeyRound,
    Send,
    Ban,
    CheckCircle,
    UserX
} from "lucide-react"
import Link from "next/link"
import UserRoleBadge from "@/components/admin/UserRoleBadge"
import SubscriptionManagement from "@/components/admin/SubscriptionManagement"

export default function UserDetailClient({ user, allCourses }: any) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(user.name || "")
    const [email, setEmail] = useState(user.email)
    const [selectedCourse, setSelectedCourse] = useState("")

    const handleRoleChange = (newRole: string) => {
        if (confirm(`Change user role to ${newRole}?`)) {
            startTransition(async () => {
                await updateUserRole(user.id, newRole as any)
                router.refresh()
            })
        }
    }

    const handleEnroll = () => {
        if (!selectedCourse) return

        startTransition(async () => {
            try {
                await enrollUserInCourse(user.id, selectedCourse)
                router.refresh()
                setSelectedCourse("")
            } catch (error: any) {
                alert(error.message)
            }
        })
    }

    const handleUnenroll = (courseId: string) => {
        if (confirm("Remove this enrollment?")) {
            startTransition(async () => {
                await unenrollUserFromCourse(user.id, courseId)
                router.refresh()
            })
        }
    }

    const handleSaveProfile = () => {
        startTransition(async () => {
            await updateUserProfile(user.id, { name, email })
            router.refresh()
            setIsEditing(false)
        })
    }

    const handleDeleteUser = () => {
        if (confirm(`Are you sure you want to permanently DELETE and BAN user "${user.name || user.email}"?\n\nThis will remove their mobile credentials, unenroll them from all courses, and permanently erase their profile.`)) {
            startTransition(async () => {
                try {
                    await deleteUser(user.id)
                    alert("User and access deleted successfully.")
                    router.push("/admin/users")
                } catch (err: any) {
                    alert(err.message || "Failed to delete user")
                }
            })
        }
    }

    const handleToggleActive = () => {
        const action = user.isActive ? "deactivate / block" : "reactivate"
        if (confirm(`Are you sure you want to ${action} this user account?`)) {
            startTransition(async () => {
                try {
                    const res = await toggleUserActiveStatus(user.id, !user.isActive)
                    alert(res.message)
                    router.refresh()
                } catch (err: any) {
                    alert(err.message || "Failed to update user status")
                }
            })
        }
    }

    const handleTriggerReset = () => {
        if (confirm(`Send password reset email to ${user.email}?`)) {
            startTransition(async () => {
                try {
                    const res = await adminTriggerPasswordReset(user.id)
                    alert(res.message)
                    router.refresh()
                } catch (err: any) {
                    alert(err.message || "Failed to send reset email")
                }
            })
        }
    }

    const handleResendVerification = () => {
        if (confirm(`Resend verification email to ${user.email}?`)) {
            startTransition(async () => {
                try {
                    const res = await adminResendVerification(user.id)
                    alert(res.message)
                    router.refresh()
                } catch (err: any) {
                    alert(err.message || "Failed to resend verification")
                }
            })
        }
    }

    const handleAnonymize = () => {
        if (confirm(`Anonymize user "${user.name || user.email}"?\n\nThis will scrub personal identifying data (name, email, phone) per privacy standards while preserving anonymized records for reporting.`)) {
            startTransition(async () => {
                try {
                    const res = await anonymizeUser(user.id)
                    alert(res.message)
                    router.refresh()
                } catch (err: any) {
                    alert(err.message || "Failed to anonymize user")
                }
            })
        }
    }

    // Filter out already enrolled courses
    const enrolledCourseIds = user.enrollments.map((e: any) => e.courseId)
    const availableCourses = allCourses.filter((c: any) => !enrolledCourseIds.includes(c.id))

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-2xl font-bold text-purple-600">
                                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {user.name || "No name"}
                            </h1>
                            <p className="text-gray-600">{user.email}</p>
                        </div>
                    </div>
                    <UserRoleBadge role={user.role} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile Information */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Profile Information</CardTitle>
                                {!isEditing ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditing(false)
                                                setName(user.name || "")
                                                setEmail(user.email)
                                            }}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveProfile}
                                            disabled={isPending}
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            Save
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                    />
                                ) : (
                                    <p className="text-gray-900 mt-1">{user.name || "Not set"}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border rounded-md"
                                    />
                                ) : (
                                    <p className="text-gray-900 mt-1">{user.email}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Phone Number (Mobile Login)</label>
                                <p className="text-gray-900 mt-1 font-mono">{user.phoneNumber || "Not registered"}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Last Active</label>
                                <p className="text-gray-900 mt-1">
                                    {user.lastActive ? new Date(user.lastActive).toLocaleString() : "Never logged in"}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">User ID</label>
                                <p className="text-gray-600 mt-1 text-sm font-mono">{user.id}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Joined</label>
                                <p className="text-gray-900 mt-1">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Enrollments */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Enrollments ({user.enrollments.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Enroll in new course */}
                            <div className="mb-4 flex gap-2">
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-md"
                                    disabled={isPending}
                                >
                                    <option value="">Select a course to enroll...</option>
                                    {availableCourses.map((course: any) => (
                                        <option key={course.id} value={course.id}>
                                            {course.title}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    onClick={handleEnroll}
                                    disabled={!selectedCourse || isPending}
                                >
                                    Enroll
                                </Button>
                            </div>

                            {/* Enrolled courses list */}
                            <div className="space-y-3">
                                {user.enrollments.map((enrollment: any) => (
                                    <div
                                        key={enrollment.id}
                                        className="flex items-center justify-between p-3 border rounded-md"
                                    >
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {enrollment.course.title}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUnenroll(enrollment.courseId)}
                                            disabled={isPending}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}

                                {user.enrollments.length === 0 && (
                                    <p className="text-center text-gray-500 py-8">
                                        No course enrollments yet
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {user.progress.length > 0 ? (
                                <div className="space-y-2">
                                    {user.progress.slice(0, 5).map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3 text-sm">
                                            <span className="text-gray-500">
                                                {new Date(p.lastAccessed).toLocaleDateString()}
                                            </span>
                                            <span className="text-gray-900">{p.lesson.title}</span>
                                            {p.completed && (
                                                <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No activity yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Purchases & Payment Transactions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-emerald-600" />
                                Purchases & Payments ({user.payments?.length || 0})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {user.payments && user.payments.length > 0 ? (
                                <div className="space-y-3">
                                    {user.payments.map((pm: any) => (
                                        <div key={pm.id} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50/50 text-sm">
                                            <div>
                                                <p className="font-bold text-gray-900">
                                                    ₹{pm.amount.toLocaleString()} <span className="text-xs font-normal text-gray-500 font-mono">({pm.paymentProvider || "Payment"})</span>
                                                </p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                    ID: {pm.externalId || pm.id} &bull; {new Date(pm.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pm.status === "SUCCEEDED" || pm.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                                {pm.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-6 text-sm">No payment transactions recorded</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Test Series & Assessment Attempts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                Test Series & Assessments ({user.assessmentAttempts?.length || 0})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {user.assessmentAttempts && user.assessmentAttempts.length > 0 ? (
                                <div className="space-y-3">
                                    {user.assessmentAttempts.map((att: any) => (
                                        <div key={att.id} className="flex items-center justify-between p-3 border rounded-xl text-sm">
                                            <div>
                                                <p className="font-semibold text-gray-900">{att.assessment?.title || "Assessment"}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Started {new Date(att.startedAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-gray-900">Score: {att.score ?? "Pending"}</span>
                                                {att.status && (
                                                    <span className="block text-[11px] font-semibold text-gray-500 uppercase">{att.status}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-6 text-sm">No test series attempted yet</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">XP</span>
                                <span className="font-medium">{user.xp}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Level</span>
                                <span className="font-medium">{user.level}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Streak</span>
                                <span className="font-medium">{user.streak} days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Enrollments</span>
                                <span className="font-medium">{user.enrollments.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Achievements</span>
                                <span className="font-medium">{user.achievements.length}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Role Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Role Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                variant={user.role === "FREE" ? "default" : "outline"}
                                className="w-full justify-start"
                                onClick={() => handleRoleChange("FREE")}
                                disabled={isPending || user.role === "FREE"}
                            >
                                Free User
                            </Button>
                            <Button
                                variant={user.role === "PREMIUM" ? "default" : "outline"}
                                className="w-full justify-start"
                                onClick={() => handleRoleChange("PREMIUM")}
                                disabled={isPending || user.role === "PREMIUM"}
                            >
                                Premium User
                            </Button>
                            <Button
                                variant={user.role === "TEACHER" ? "default" : "outline"}
                                className="w-full justify-start"
                                onClick={() => handleRoleChange("TEACHER")}
                                disabled={isPending || user.role === "TEACHER"}
                            >
                                Teacher
                            </Button>
                            <Button
                                variant={user.role === "ADMIN" ? "default" : "outline"}
                                className="w-full justify-start"
                                onClick={() => handleRoleChange("ADMIN")}
                                disabled={isPending || user.role === "ADMIN"}
                            >
                                Admin
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Account Security & Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Status & Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b">
                                <span className="text-sm text-gray-600">Account Status</span>
                                {user.isActive ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                        <CheckCircle className="h-3 w-3" /> Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                        <Ban className="h-3 w-3" /> Blocked
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between pb-2 border-b">
                                <span className="text-sm text-gray-600">Email Verification</span>
                                {user.emailVerified ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                        Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                        Unverified
                                    </span>
                                )}
                            </div>

                            <Button
                                variant={user.isActive ? "outline" : "default"}
                                className={`w-full justify-start text-sm ${user.isActive ? "text-red-700 hover:bg-red-50 hover:text-red-800 border-red-200" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                                onClick={handleToggleActive}
                                disabled={isPending}
                            >
                                {user.isActive ? (
                                    <>
                                        <Ban className="h-4 w-4 mr-2" /> Deactivate / Block Account
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" /> Reactivate Account
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-start text-sm"
                                onClick={handleTriggerReset}
                                disabled={isPending}
                            >
                                <KeyRound className="h-4 w-4 mr-2 text-indigo-600" />
                                Trigger Password Reset Link
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-start text-sm"
                                onClick={handleResendVerification}
                                disabled={isPending}
                            >
                                <Send className="h-4 w-4 mr-2 text-blue-600" />
                                Resend Verification Email
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Subscription Management */}
                    <SubscriptionManagement userId={user.id} subscriptions={user.subscriptions || []} />

                    {/* Achievements */}
                    {user.achievements.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Achievements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {user.achievements.slice(0, 5).map((ua: any) => (
                                        <div key={ua.id} className="flex items-center gap-2">
                                            <Award className="h-4 w-4 text-yellow-500" />
                                            <span className="text-sm">{ua.achievement.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Danger Zone: Anonymize, Ban & Delete User */}
                    <Card className="border-2 border-red-200 bg-red-50/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-red-700 flex items-center gap-2 text-sm font-bold">
                                <ShieldAlert className="h-4 w-4 text-red-600" />
                                Danger Zone &bull; Privacy & Removal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                            <p className="text-xs text-red-600 leading-relaxed">
                                Scrub PII for GDPR compliance or permanently erase user credentials, sessions, and records.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-semibold flex items-center justify-center gap-2"
                                onClick={handleAnonymize}
                                disabled={isPending}
                            >
                                <UserX className="h-4 w-4 text-amber-700" />
                                Anonymize User (Soft Delete)
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs"
                                onClick={handleDeleteUser}
                                disabled={isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                                {isPending ? "Deleting..." : "Permanently Delete & Ban User"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
