import defaultTeacherLibrary from "@/data/teacher-library.json"

export interface ReusableTeacher {
  id: string
  name: string
  nameHi?: string | null
  role?: string | null
  roleHi?: string | null
  avatar?: string | null
  photo?: string | null
  credentials?: Array<{ label: string; labelHi?: string }>
  credentialsHi?: Array<{ label: string; labelHi?: string }>
  bio?: string | null
  bioHi?: string | null
  isPrimary?: boolean
}

function getNodeModule(name: string): any {
  if (typeof window !== "undefined") return null
  try {
    // eval("require") prevents Next.js client webpack bundle from failing on node built-ins
    const req = eval("require")
    return req(name)
  } catch {
    return null
  }
}

function getFilePath(): string | null {
  if (typeof window !== "undefined") return null
  try {
    const path = getNodeModule("path")
    if (!path) return null
    return path.join(process.cwd(), "data", "teacher-library.json")
  } catch {
    return null
  }
}

function readTeacherLibraryRaw(): ReusableTeacher[] {
  const filePath = getFilePath()
  if (!filePath) {
    return (defaultTeacherLibrary as ReusableTeacher[]) || []
  }

  try {
    const fs = getNodeModule("fs")
    if (!fs || !fs.existsSync(filePath)) {
      return (defaultTeacherLibrary as ReusableTeacher[]) || []
    }
    const content = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(content)
  } catch (err) {
    console.error("Error reading teacher library:", err)
    return (defaultTeacherLibrary as ReusableTeacher[]) || []
  }
}

function writeTeacherLibraryRaw(teachers: ReusableTeacher[]): void {
  const filePath = getFilePath()
  if (!filePath) return

  try {
    const fs = getNodeModule("fs")
    const path = getNodeModule("path")
    if (!fs || !path) return
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(teachers, null, 2), "utf-8")
  } catch (err) {
    console.error("Error writing teacher library:", err)
  }
}

export function getAllTeachers(): ReusableTeacher[] {
  return readTeacherLibraryRaw()
}

export function getTeacherById(id: string): ReusableTeacher | null {
  const all = readTeacherLibraryRaw()
  return all.find((t) => t.id === id) || null
}

export function upsertTeacher(teacher: ReusableTeacher): ReusableTeacher {
  const all = readTeacherLibraryRaw()
  const idx = all.findIndex((t) => t.id === teacher.id)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...teacher }
  } else {
    all.push(teacher)
  }
  writeTeacherLibraryRaw(all)
  return teacher
}

/**
 * Given a list of course teachers (from course metadata or editor state),
 * resolves any teacher referencing a reusable teacher id from data/teacher-library.json.
 * This guarantees that when a central teacher profile is updated, every attached course
 * immediately updates.
 */
export function resolveCourseTeachers(courseTeachers: any[]): ReusableTeacher[] {
  if (!Array.isArray(courseTeachers) || courseTeachers.length === 0) return []
  const library = readTeacherLibraryRaw()
  const libraryMap = new Map<string, ReusableTeacher>()
  for (const t of library) {
    libraryMap.set(t.id, t)
  }

  return courseTeachers.map((ct, idx) => {
    const refId = ct.teacherId || ct.id
    const central = refId ? libraryMap.get(refId) : null
    if (central) {
      return {
        ...central,
        isPrimary: ct.isPrimary !== undefined ? Boolean(ct.isPrimary) : idx === 0,
        // Allow course-level role override if specified
        role: ct.role || central.role,
        roleHi: ct.roleHi || central.roleHi,
      }
    }
    return {
      id: ct.id || `teacher-${idx}`,
      name: ct.name || "Faculty",
      nameHi: ct.nameHi || null,
      role: ct.role || null,
      roleHi: ct.roleHi || null,
      avatar: ct.avatar || ct.photo || null,
      credentials: ct.credentials || [],
      credentialsHi: ct.credentialsHi || [],
      bio: ct.bio || null,
      bioHi: ct.bioHi || null,
      isPrimary: ct.isPrimary !== undefined ? Boolean(ct.isPrimary) : idx === 0,
    }
  })
}
