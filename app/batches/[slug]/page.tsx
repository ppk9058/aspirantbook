import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getBatchBySlug, getAllBatches } from "@/lib/batches-service"
import { hasRealBatchesAvailable } from "@/lib/home/has-real-batches"
import BatchDetailClient from "./BatchDetailClient"

interface BatchPageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const batches = await getAllBatches()
    return batches.map((b) => ({ slug: b.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: BatchPageProps): Promise<Metadata> {
  const { slug } = await params
  const batch = await getBatchBySlug(slug)
  if (!batch) {
    return {
      title: "Batch Not Found - aspirantbook",
    }
  }
  return {
    title: `${batch.title} - aspirantbook`,
    description: batch.targetText || `Enroll in ${batch.title} with live classes, study material & tests.`,
  }
}

export default async function BatchDetailPage({ params }: BatchPageProps) {
  const { slug } = await params
  const batch = await getBatchBySlug(slug)

  if (!batch) {
    notFound()
  }

  const hasRealBatches = await hasRealBatchesAvailable()

  return <BatchDetailClient batch={batch} hasRealBatches={hasRealBatches} />
}
