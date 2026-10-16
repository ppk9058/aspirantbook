import { chunkContent } from "./chunker"

export interface ViewerContext {
  userId?: string | null
  role?: string | null
  isEntitled?: boolean
  isVerifiedBot?: boolean
}

export interface ContainerGateConfig {
  isGated?: boolean
  previewPercentage?: number
  seoMode?: "preview" | "bot-full" | string
  gateTitle?: string | null
  gateSubtitle?: string | null
  createdById?: string | null
  creatorId?: string | null
}

export interface ItemGateConfig {
  gateMode?: "inherit" | "free" | "preview" | "locked" | string
  previewPercentage?: number | null
  title?: string
}

export interface ResolveAccessInput {
  viewer: ViewerContext
  content: any // HTML string, JSON blocks, or question/item array
  containerGate?: ContainerGateConfig | null
  itemGate?: ItemGateConfig | null
  isOwner?: boolean
}

export interface ResolveAccessResult {
  isLockedForGuest: boolean
  previewBlocks: any[]
  totalItemsCount: number
  previewCount: number
  gateMode: "inherit" | "free" | "preview" | "locked"
  effectivePercentage: number
  isBotFullUnlocked: boolean
  isGated: boolean
  gateTitle?: string | null
  gateSubtitle?: string | null
}

function clampPercentage(val: number | null | undefined, fallback: number = 20): number {
  if (typeof val !== "number" || isNaN(val)) return fallback
  return Math.max(0, Math.min(100, Math.round(val)))
}

/**
 * Sanitizes question / quiz items so guests never receive answers or explanations.
 */
function sanitizeItemForGuest(item: any): any {
  if (!item || typeof item !== "object") return item

  // Deep clone to prevent mutating original
  const clone = { ...item }
  delete clone.correctOption
  delete clone.correctIndex
  delete clone.correctAnswer
  delete clone.explanation
  delete clone.explanationEn
  delete clone.explanationHi
  delete clone.solution
  delete clone.solutionEn
  delete clone.solutionHi
  delete clone.markingKey
  delete clone.topperAccuracy
  delete clone.paperPdfUrl
  delete clone.solutionPdfUrl
  return clone
}

/**
 * ONE central server-only helper that determines access and slices content server-side.
 * Used across Tutorials, Test Series, PYQ, Current Affairs, and Quizzes.
 */
export function resolveAccess({
  viewer,
  content,
  containerGate,
  itemGate,
  isOwner = false,
}: ResolveAccessInput): ResolveAccessResult {
  const allBlocks = chunkContent(content)
  const totalItemsCount = allBlocks.length

  const isGated = Boolean(containerGate?.isGated)
  const rawGateMode = (itemGate?.gateMode || "inherit").toLowerCase()
  const gateMode: "inherit" | "free" | "preview" | "locked" =
    rawGateMode === "free" || rawGateMode === "preview" || rawGateMode === "locked"
      ? rawGateMode
      : "inherit"

  const containerPercentage = clampPercentage(containerGate?.previewPercentage, 20)
  const seoMode = containerGate?.seoMode || "preview"
  const isVerifiedBot = Boolean(viewer.isVerifiedBot)

  // 1. Privileged / Logged-in access:
  // - Any logged in user unlocks reading content
  // - Admin or owning Teacher
  // - Owner override
  const isAuthenticatedUser = Boolean(viewer.userId)
  const isPrivileged =
    isAuthenticatedUser ||
    viewer.role === "ADMIN" ||
    (viewer.role === "TEACHER" && isOwner)

  if (isPrivileged) {
    return {
      isLockedForGuest: false,
      previewBlocks: allBlocks,
      totalItemsCount,
      previewCount: totalItemsCount,
      gateMode,
      effectivePercentage: 100,
      isBotFullUnlocked: false,
      isGated,
      gateTitle: containerGate?.gateTitle,
      gateSubtitle: containerGate?.gateSubtitle,
    }
  }

  // 2. Ungated content: 100% visible to guests
  if (!isGated) {
    return {
      isLockedForGuest: false,
      previewBlocks: allBlocks,
      totalItemsCount,
      previewCount: totalItemsCount,
      gateMode,
      effectivePercentage: 100,
      isBotFullUnlocked: false,
      isGated: false,
      gateTitle: containerGate?.gateTitle,
      gateSubtitle: containerGate?.gateSubtitle,
    }
  }

  // 3. Item-level override: "free" -> 100% visible to guests
  if (gateMode === "free") {
    return {
      isLockedForGuest: false,
      previewBlocks: allBlocks,
      totalItemsCount,
      previewCount: totalItemsCount,
      gateMode: "free",
      effectivePercentage: 100,
      isBotFullUnlocked: false,
      isGated: true,
      gateTitle: containerGate?.gateTitle,
      gateSubtitle: containerGate?.gateSubtitle,
    }
  }

  // 4. Verified search engine crawler in "bot-full" SEO mode
  if (isVerifiedBot && seoMode === "bot-full") {
    return {
      isLockedForGuest: false,
      previewBlocks: allBlocks,
      totalItemsCount,
      previewCount: totalItemsCount,
      gateMode,
      effectivePercentage: 100,
      isBotFullUnlocked: true,
      isGated: true,
      gateTitle: containerGate?.gateTitle,
      gateSubtitle: containerGate?.gateSubtitle,
    }
  }

  // 5. Gated and Locked for guest:
  let effectivePercentage: number
  if (gateMode === "locked") {
    effectivePercentage = 0
  } else if (gateMode === "preview") {
    effectivePercentage = clampPercentage(itemGate?.previewPercentage, containerPercentage)
  } else {
    // "inherit"
    effectivePercentage = containerPercentage
  }

  // Slicing logic:
  let previewCount = 0
  if (effectivePercentage > 0 && totalItemsCount > 0) {
    previewCount = Math.min(
      totalItemsCount,
      Math.max(1, Math.ceil((effectivePercentage / 100) * totalItemsCount))
    )
  }

  const rawSlice = allBlocks.slice(0, previewCount)
  // Ensure sensitive answer/solution fields are never leaked to guests
  const previewBlocks = rawSlice.map(sanitizeItemForGuest)

  return {
    isLockedForGuest: true,
    previewBlocks,
    totalItemsCount,
    previewCount,
    gateMode,
    effectivePercentage,
    isBotFullUnlocked: false,
    isGated: true,
    gateTitle: containerGate?.gateTitle,
    gateSubtitle: containerGate?.gateSubtitle,
  }
}
