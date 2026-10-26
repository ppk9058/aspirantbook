import { auth } from "@/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAllBooks } from "@/lib/books/bookService"
import BookStudioClient from "@/components/admin/books/BookStudioClient"
import { getDemoRole } from "@/lib/auth/demo-role"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Book Studio | Teacher Panel",
  description: "Create and manage your PDF eBooks for store publishing",
}

export default async function TeacherBookStudioPage() {
  const session = await auth()
  const cookieStore = await cookies()
  const demoRole = getDemoRole(cookieStore)
  const effectiveRole = session?.user?.role || demoRole

  if (effectiveRole !== "TEACHER" && effectiveRole !== "ADMIN") {
    redirect("/login?error=unauthorized_teacher_studio")
  }

  const books = await getAllBooks()

  return (
    <BookStudioClient
      initialBooks={books}
      role={effectiveRole === "ADMIN" ? "ADMIN" : "TEACHER"}
      currentUserId={session?.user?.id}
    />
  )
}
