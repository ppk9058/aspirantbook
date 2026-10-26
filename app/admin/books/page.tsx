import { auth } from "@/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAllBooks, getAllOrders, getAllCoupons, getBookstoreStats } from "@/lib/books/bookService"
import OnlineBookstoreClient from "@/components/admin/books/OnlineBookstoreClient"
import { getDemoRole } from "@/lib/auth/demo-role"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Online Bookstore | Admin Studio",
  description: "Buy and sell eCommerce management for eBooks — Admin Panel",
}

export default async function AdminBookstorePage() {
  const session = await auth()
  const cookieStore = await cookies()
  const demoRole = getDemoRole(cookieStore)
  const effectiveRole = session?.user?.role || demoRole

  // STRICT ACCESS: Only ADMIN role can access Online Bookstore admin panel
  if (effectiveRole !== "ADMIN") {
    redirect("/teacher?error=unauthorized_bookstore")
  }

  const [books, orders, coupons, stats] = await Promise.all([
    getAllBooks(),
    getAllOrders(),
    getAllCoupons(),
    getBookstoreStats(),
  ])

  return (
    <OnlineBookstoreClient
      initialBooks={books}
      initialOrders={orders}
      initialCoupons={coupons}
      initialStats={stats}
    />
  )
}
