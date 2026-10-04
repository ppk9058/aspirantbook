import { getAllCategories } from "@/lib/pyqs-service"
import { ExamCategoriesManagerClient } from "@/components/admin/pyqs/ExamCategoriesManagerClient"

export const dynamic = "force-dynamic"

export default async function AdminPyqCategoriesPage() {
  const categories = await getAllCategories(true)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ExamCategoriesManagerClient initialCategories={categories as any} />
    </div>
  )
}
