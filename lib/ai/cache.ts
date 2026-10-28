import { createHash } from "crypto"
import { prisma } from "../prisma"

export interface CacheKeyParams {
  task: string
  input: string
  language?: string
  promptVersion?: string
}

export function computeCacheKey({
  task,
  input,
  language = "en",
  promptVersion = "v1",
}: CacheKeyParams): string {
  const normalized = [
    task.trim().toLowerCase(),
    language.trim().toLowerCase(),
    promptVersion.trim(),
    input.trim(),
  ].join("::")

  return createHash("sha256").update(normalized).digest("hex")
}

export class AiCacheService {
  /**
   * Retrieves a cached AI response if present.
   */
  public static async get(params: CacheKeyParams) {
    const key = computeCacheKey(params)
    try {
      const cached = await prisma.aiCache.findUnique({
        where: { key },
      })
      return cached
    } catch {
      return null
    }
  }

  /**
   * Saves a generated AI response into the cache.
   */
  public static async set(
    params: CacheKeyParams & {
      outputText: string
      metadata?: any
      modelUsed: string
      provider: string
    }
  ) {
    const key = computeCacheKey(params)
    const language = params.language || "en"
    const promptVersion = params.promptVersion || "v1"

    try {
      const saved = await prisma.aiCache.upsert({
        where: { key },
        update: {
          outputText: params.outputText,
          metadata: params.metadata,
          modelUsed: params.modelUsed,
          provider: params.provider,
        },
        create: {
          key,
          task: params.task,
          promptVersion,
          language,
          inputText: params.input.slice(0, 10000), // Protect against unbounded sizes
          outputText: params.outputText,
          metadata: params.metadata,
          modelUsed: params.modelUsed,
          provider: params.provider,
        },
      })
      return saved
    } catch {
      return null
    }
  }
}
