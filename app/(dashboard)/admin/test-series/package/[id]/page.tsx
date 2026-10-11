import PackageDetailView from "@/components/exam/PackageDetailView"

export default async function AdminPackageDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <PackageDetailView packageId={id} basePath="/admin/test-series" role="ADMIN" />
}
