import { AppRole } from "./roles"

export type Permission =
  // Student permissions
  | "course.read"
  | "lecture.read.free"
  | "lecture.read.paid"
  | "test.read"
  | "test.attempt"
  | "chat.send"
  | "question.create"
  | "file.upload"
  | "payment.create"
  | "form.submit"
  // Teacher permissions
  | "class.create"
  | "class.update"
  | "class.start"
  | "class.end"
  | "student.mute"
  | "student.unmute"
  | "chat.enable"
  | "chat.disable"
  | "question.answer"
  | "test.create"
  | "test.update"
  | "test.publish"
  | "poll.create"
  | "resource.upload"
  // Course & Curriculum permissions
  | "course.create"
  | "course.update"
  | "course.delete"
  | "course.publish"
  | "chapter.create"
  | "chapter.update"
  | "chapter.delete"
  | "content.create"
  | "content.update"
  | "content.delete"
  | "content.publish"
  // Admin wildcard
  | "*"

/**
 * Static Role to Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  STUDENT: [
    "course.read",
    "lecture.read.free",
    "lecture.read.paid",
    "test.read",
    "test.attempt",
    "chat.send",
    "question.create",
    "file.upload",
    "payment.create",
    "form.submit",
  ],
  TEACHER: [
    "course.read",
    "lecture.read.free",
    "lecture.read.paid",
    "test.read",
    "chat.send",
    "class.create",
    "class.update",
    "class.start",
    "class.end",
    "student.mute",
    "student.unmute",
    "chat.enable",
    "chat.disable",
    "question.answer",
    "test.create",
    "test.update",
    "test.publish",
    "poll.create",
    "resource.upload",
    "file.upload",
    // Curriculum editing permissions
    "course.create",
    "course.update",
    "course.publish",
    "chapter.create",
    "chapter.update",
    "chapter.delete",
    "content.create",
    "content.update",
    "content.delete",
    "content.publish",
  ],
  ADMIN: ["*"],
}

/**
 * Checks if a given role has a specific permission
 */
export function hasPermission(role: AppRole, permission: Permission): boolean {
  if (role === "ADMIN") return true
  const permissions = ROLE_PERMISSIONS[role] || []
  if (permissions.includes("*")) return true
  return permissions.includes(permission)
}

export interface UserLike {
  id?: string
  role?: string | null
  [key: string]: any
}

export function normalizeUserRole(role?: string | null): AppRole {
  if (!role) return "STUDENT"
  const r = role.toUpperCase()
  if (r === "ADMIN" || r === "SUPER_ADMIN") return "ADMIN"
  if (r === "TEACHER" || r === "INSTRUCTOR" || r === "FACULTY") return "TEACHER"
  return "STUDENT"
}

export function isEditorUser(user?: UserLike | null): boolean {
  if (!user?.role) return false
  const role = normalizeUserRole(user.role)
  return role === "ADMIN" || role === "TEACHER"
}

export function canCreateCourse(user?: UserLike | null): boolean {
  return isEditorUser(user)
}

export function canEditCourse(user?: UserLike | null, course?: any): boolean {
  return isEditorUser(user)
}

export function canDeleteCourse(user?: UserLike | null, course?: any): boolean {
  if (!user?.role) return false
  const role = normalizeUserRole(user.role)
  return role === "ADMIN"
}

export function canEditChapter(user?: UserLike | null, chapter?: any): boolean {
  return isEditorUser(user)
}

export function canDeleteChapter(user?: UserLike | null, chapter?: any): boolean {
  return isEditorUser(user)
}

export function canEditContent(user?: UserLike | null, content?: any): boolean {
  return isEditorUser(user)
}

export function canDeleteContent(user?: UserLike | null, content?: any): boolean {
  return isEditorUser(user)
}

export function canPublishContent(user?: UserLike | null, content?: any): boolean {
  return isEditorUser(user)
}

