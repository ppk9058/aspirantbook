import PackageDetailView from "@/components/exam/PackageDetailView"

export default async function TeacherPackageDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <PackageDetailView packageId={id} basePath="/teacher/test-series" role="TEACHER" />
}
