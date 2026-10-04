import BatchForm from "@/components/admin/BatchForm"

export const metadata = {
  title: "Create New Batch - Admin Portal",
}

export default function CreateBatchAdminPage() {
  return (
    <div className="p-2">
      <BatchForm isEditing={false} />
    </div>
  )
}
