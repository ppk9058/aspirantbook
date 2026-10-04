import { notFound } from "next/navigation"
import { getBatchById } from "@/lib/batches-service"
import BatchForm from "@/components/admin/BatchForm"

interface EditBatchProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditBatchProps) {
  const { id } = await params
  const batch = await getBatchById(id)
  return {
    title: `Edit ${batch?.title || "Batch"} - Admin Portal`,
  }
}

export default async function EditBatchAdminPage({ params }: EditBatchProps) {
  const { id } = await params
  const batch = await getBatchById(id)

  if (!batch) {
    notFound()
  }

  return (
    <div className="p-2">
      <BatchForm initialData={batch} isEditing={true} />
    </div>
  )
}
