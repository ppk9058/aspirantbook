import { auth } from "@/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAllBooks } from "@/lib/books/bookService"
import BookStudioClient from "@/components/admin/books/BookStudioClient"
import { getDemoRole } from "@/lib/auth/demo-role"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Book Studio | Admin Panel",
  description: "Create, publish, approve and manage PDF books on AspirantBook",
}

export default async function AdminBookStudioPage() {
  const session = await auth()
  const cookieStore = await cookies()
  const demoRole = getDemoRole(cookieStore)
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
