"use client"

import { useRouter } from "next/navigation"
import { useSamePageBuyNow } from "@/lib/payments/useSamePageBuyNow"
import type { DetailCourse } from "./types"

export function useEnrollActions(course: DetailCourse) {
  const router = useRouter()
  const { handleBuyNow, isProcessing } = useSamePageBuyNow()

  const buyNow = () => {
    handleBuyNow({
      type: "course",
      id: course.id,
      title: course.title,
      price: course.price || 0,
      slug: course.slug,
    })
  }

  const startTrial = () => {
    router.push(`/courses/${course.slug}/learn`)
  }

  return { startTrial, buyNow, isProcessing }
}
