import { auth } from "@/auth"
import { normalizeDemoRole } from "@/lib/auth/demo-role"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAllBooks } from "@/lib/books/bookService"
import BookStudioClient from "@/components/admin/books/BookStudioClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Book Studio | Admin Panel",
  description: "Create, publish, approve and manage PDF books on TrillionSkill",
}

export default async function AdminBookStudioPage() {
  const session = await auth()
  const cookieStore = await cookies()
  const demoRole = normalizeDemoRole(cookieStore.get("ts_demo_role")?.value)
  const effectiveRole = session?.user?.role || demoRole

  if (effectiveRole !== "ADMIN") {
    redirect("/teacher?error=unauthorized_admin_studio")
  }

  const books = await getAllBooks()

  return (
    <BookStudioClient
      initialBooks={books}
      role="ADMIN"
      currentUserId={session?.user?.id}
    />
  )
}
