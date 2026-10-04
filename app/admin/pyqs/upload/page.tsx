import { getAllCategories } from "@/lib/pyqs-service"
import { PyqUploadStudioClient } from "@/components/admin/pyqs/PyqUploadStudioClient"

export const dynamic = "force-dynamic"

export default async function AdminPyqUploadPage() {
  const categories = await getAllCategories(true)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PyqUploadStudioClient categories={categories as any} />
    </div>
  )
}
