export interface ViewerContext {
  userId?: string | null;
  role?: string | null;
  isEntitled?: boolean;
  isVerifiedBot?: boolean;
}

export interface ContainerGateConfig {
  isGated?: boolean;
  previewPercentage?: number;
  seoMode?: "preview" | "bot-full" | string;
  gateTitle?: string | null;
  gateSubtitle?: string | null;
}

export interface ItemGateConfig {
  gateMode?: "inherit" | "free" | "preview" | "locked" | string;
  previewPercentage?: number | null;
  title?: string;
}

export interface PureResolveAccessInput {
  viewer: ViewerContext;
  blocks: any[];
  containerGate?: ContainerGateConfig | null;
  itemGate?: ItemGateConfig | null;
  isOwner?: boolean;
}

export interface PureResolveAccessResult {
  isLockedForGuest: boolean;
  previewBlocks: any[];
  totalItemsCount: number;
  previewCount: number;
  gateMode: "inherit" | "free" | "preview" | "locked";
  effectivePercentage: number;
  isBotFullUnlocked: boolean;
  isGated: boolean;
  gateTitle?: string | null;
  gateSubtitle?: string | null;
}

export function clampPercentage(val: number | null | undefined, fallback: number = 20): number {
  if (typeof val !== "number" || isNaN(val)) return fallback;
  return Math.max(0, Math.min(100, Math.round(val)));
}

/**
 * Sanitizes item payload to ensure solutions, answers and marking keys
 * are never transmitted to unauthenticated or unentitled viewers.
 */
export function sanitizeItemForGuest(item: any): any {
  if (!item || typeof item !== "object") return item;

  const clone = Array.isArray(item) ? [...item] : { ...item };

  delete clone.correctOption;
  delete clone.correctIndex;
  delete clone.correctAnswer;
  delete clone.explanation;
  delete clone.explanationEn;
  delete clone.explanationHi;
  delete clone.solution;
  delete clone.solutionEn;
  delete clone.solutionHi;
  delete clone.markingKey;
  delete clone.topperAccuracy;
  delete clone.paperPdfUrl;
  delete clone.solutionPdfUrl;

  // Rosera Schema quiz blocks
  delete clone.a;
  delete clone.why;
  delete clone.answer;

  if (clone.quiz && typeof clone.quiz === "object") {
    clone.quiz = sanitizeItemForGuest(clone.quiz);
  }

  return clone;
}

/**
 * Pure access resolution and preview calculation.
 * Guaranteed to fail closed: never reveals items past the calculated slice.
 */
export function pureResolveAccess({
  viewer,
  blocks,
  containerGate,
  itemGate,
  isOwner = false,
}: PureResolveAccessInput): PureResolveAccessResult {
  const allBlocks = Array.isArray(blocks) ? blocks : [];
  const totalItemsCount = allBlocks.length;

  const isGated = Boolean(containerGate?.isGated);
  const rawGateMode = (itemGate?.gateMode || "inherit").toLowerCase();
  const gateMode: "inherit" | "free" | "preview" | "locked" =
    rawGateMode === "free" || rawGateMode === "preview" || rawGateMode === "locked"
      ? rawGateMode
      : "inherit";

  const containerPercentage = clampPercentage(containerGate?.previewPercentage, 20);
  const seoMode = containerGate?.seoMode || "preview";
  const isVerifiedBot = Boolean(viewer.isVerifiedBot);

  // Authenticated user, admin, or owning teacher
  const isAuthenticatedUser = Boolean(viewer.userId);
  const isPrivileged =
    isAuthenticatedUser ||
    viewer.role === "ADMIN" ||
    (viewer.role === "TEACHER" && isOwner);

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
    };
  }

  // Ungated content
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
    };
  }

  // Explicitly free item
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
    };
  }

  // Search crawler with bot-full access
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
    };
  }

  // Calculate percentage for locked/preview/inherit
  let effectivePercentage: number;
  if (gateMode === "locked") {
    effectivePercentage = 0;
  } else if (gateMode === "preview") {
    effectivePercentage = clampPercentage(itemGate?.previewPercentage, containerPercentage);
  } else {
    effectivePercentage = containerPercentage;
  }

  if (effectivePercentage >= 100) {
    return {
      isLockedForGuest: false,
      previewBlocks: allBlocks,
      totalItemsCount,
      previewCount: totalItemsCount,
      gateMode,
      effectivePercentage: 100,
      isBotFullUnlocked: false,
      isGated: true,
      gateTitle: containerGate?.gateTitle,
      gateSubtitle: containerGate?.gateSubtitle,
    };
  }

  let previewCount = 0;
  if (effectivePercentage > 0 && totalItemsCount > 0) {
    // Slicing: at least 1 block if percentage > 0 and items exist, capped at total
    previewCount = Math.min(
      totalItemsCount,
      Math.max(1, Math.ceil((effectivePercentage / 100) * totalItemsCount))
    );
  }

  const rawSlice = allBlocks.slice(0, previewCount);
  const previewBlocks = rawSlice.map(sanitizeItemForGuest);

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
  };
}
