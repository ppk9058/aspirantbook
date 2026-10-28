import { z } from "zod"
import {
  AiProviderName,
  AiGenerateOptions,
  AiGenerateResult,
  AiJsonGenerateResult,
  AiProviderAdapter,
} from "./types"
import { aiConfig } from "./config"
import { stripPII, hashPrompt } from "./pii"
import { circuitBreaker } from "./circuit-breaker"
import { AiRateLimiter } from "./rate-limiter"
import { AiCacheService } from "./cache"
import { GeminiAdapter } from "./adapters/gemini"
import { GroqAdapter } from "./adapters/groq"
import { CerebrasAdapter } from "./adapters/cerebras"
import { MistralAdapter } from "./adapters/mistral"
import { OpenRouterAdapter } from "./adapters/openrouter"
import { EmbeddingAdapter } from "./adapters/embedding"

export class AiGatewayError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = "AiGatewayError"
  }
}

export class AiDisabledError extends AiGatewayError {
  constructor(message = "AI layer is disabled or kill switch is active") {
    super(message, "AI_DISABLED")
  }
}

export class AiAllProvidersExhaustedError extends AiGatewayError {
  constructor(message = "All available AI model providers exhausted or timed out") {
    super(message, "ALL_PROVIDERS_EXHAUSTED")
  }
}

export class AiValidationError extends AiGatewayError {
  constructor(message: string) {
    super(message, "SCHEMA_VALIDATION_FAILED")
  }
}

class AiProviderGateway {
  private adapters: Map<AiProviderName, AiProviderAdapter> = new Map()

  constructor() {
    this.registerAdapter(new GeminiAdapter())
    this.registerAdapter(new GroqAdapter())
    this.registerAdapter(new CerebrasAdapter())
    this.registerAdapter(new MistralAdapter())
    this.registerAdapter(new OpenRouterAdapter())
  }

  public registerAdapter(adapter: AiProviderAdapter) {
    this.adapters.set(adapter.name, adapter)
  }

  public getAdapter(name: AiProviderName): AiProviderAdapter | undefined {
    return this.adapters.get(name)
  }

  /**
   * Generates text via the fallback provider chain.
   * Protects quotas, circuits, strips PII, and leverages caching.
   */
  public async generateText(options: AiGenerateOptions): Promise<AiGenerateResult> {
    // 1. Global kill switch & feature flag checks
    if (!aiConfig.isEnabled || aiConfig.isKillSwitchActive) {
      throw new AiDisabledError()
    }

    // 2. Strict PII Redaction before anything touches models
    const { sanitizedText: sanitizedPrompt } = stripPII(options.prompt)
    const sanitizedMessages = options.messages?.map((msg) => ({
      role: msg.role,
      content: stripPII(msg.content).sanitizedText,
    }))

    const promptHash = hashPrompt(sanitizedPrompt)
    const task = options.task || "general"
    const language = options.language || "en"
    const promptVersion = options.promptVersion || "v1"

    // 3. Cache lookup
    if (!options.skipCache) {
      const cached = await AiCacheService.get({
        task,
        input: sanitizedPrompt,
        language,
        promptVersion,
      })

      if (cached) {
        return {
          text: cached.outputText,
          provider: cached.provider as AiProviderName,
          model: cached.modelUsed,
          cached: true,
          promptHash,
          durationMs: 0,
        }
      }
    }

    // 4. Determine ordered candidate providers
    const providerOrder = aiConfig.providerOrder
    const errors: Array<{ provider: AiProviderName; error: string }> = []
    const startTime = Date.now()

    for (const providerName of providerOrder) {
      const adapter = this.adapters.get(providerName)
      if (!adapter || !adapter.isConfigured()) {
        continue
      }

      // Check circuit breaker
      if (!circuitBreaker.canAttempt(providerName)) {
        errors.push({
          provider: providerName,
          error: "Circuit breaker is OPEN (cooldown active)",
        })
        continue
      }

      // Check Rate Limiter (RPM & RPD)
      const rateCheck = await AiRateLimiter.checkAndIncrement(providerName)
      if (!rateCheck.allowed) {
        errors.push({
          provider: providerName,
          error: rateCheck.reason || "Rate limit exceeded",
        })
        continue
      }

      // Attempt generation
      try {
        const result = await adapter.generate({
          systemPrompt: options.systemPrompt,
          prompt: sanitizedPrompt,
          messages: sanitizedMessages,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          timeoutMs: options.timeoutMs || aiConfig.defaultTimeoutMs,
          jsonMode: false,
        })

        // On success: update circuit breaker & cache
        circuitBreaker.recordSuccess(providerName)

        if (!options.skipCache) {
          await AiCacheService.set({
            task,
            input: sanitizedPrompt,
            language,
            promptVersion,
            outputText: result.text,
            modelUsed: result.model,
            provider: providerName,
          })
        }

        return {
          text: result.text,
          provider: providerName,
          model: result.model,
          cached: false,
          promptHash,
          durationMs: Date.now() - startTime,
          tokensUsed: result.tokensUsed,
        }
      } catch (err: any) {
        // Record failure in circuit breaker
        circuitBreaker.recordFailure(providerName)
        const errMsg = err?.message || String(err)
        errors.push({ provider: providerName, error: errMsg })

        // Safe logging with prompt hash only — never logs user text or secrets
        console.warn(`[AI Gateway] Provider ${providerName} failed for prompt ${promptHash}: ${errMsg}`)
      }
    }

    throw new AiAllProvidersExhaustedError(
      `All AI providers failed or were skipped: ${JSON.stringify(errors)}`
    )
  }

  /**
   * Generates structured JSON with Zod validation and 1 automatic retry on schema mismatch.
   */
  public async generateJson<T>(
    options: AiGenerateOptions,
    schema: z.ZodSchema<T>
  ): Promise<AiJsonGenerateResult<T>> {
    // 1. First attempt
    const jsonSystemPrompt = [
      options.systemPrompt || "You are a precise JSON generator assistant.",
      "IMPORTANT: You MUST respond ONLY with valid JSON matching the required schema. Do not wrap in markdown tags or add extra commentary.",
    ].join("\n")

    let rawResult = await this.generateTextInternal({
      ...options,
      systemPrompt: jsonSystemPrompt,
      jsonMode: true,
    })

    const parseAndValidate = (text: string) => {
      // Clean possible markdown code fences (e.g. ```json ... ```)
      let cleaned = text.trim()
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7)
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3)
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3)
      }
      cleaned = cleaned.trim()

      const parsed = JSON.parse(cleaned)
      return schema.parse(parsed)
    }

    try {
      const data = parseAndValidate(rawResult.text)
      return {
        ...rawResult,
        data,
      }
    } catch (firstError: any) {
      // Schema validation failed: RETRY ONCE with error feedback
      console.warn(`[AI Gateway] First JSON validation attempt failed, retrying once:`, firstError.message)

      const retryPrompt = [
        options.prompt,
        "",
        `[ATTENTION: Previous attempt failed schema validation with error: ${firstError.message}. Please correct the output structure and return valid JSON.]`,
      ].join("\n")

      try {
        const retryResult = await this.generateTextInternal({
          ...options,
          prompt: retryPrompt,
          systemPrompt: jsonSystemPrompt,
          jsonMode: true,
          skipCache: true, // Don't return invalid cached output
        })

        const data = parseAndValidate(retryResult.text)
        return {
          ...retryResult,
          data,
        }
      } catch (retryError: any) {
        throw new AiValidationError(
          `Structured JSON output validation failed after retry: ${retryError.message}`
        )
      }
    }
  }

  /**
   * Internal text generator supporting jsonMode for structured responses.
   */
  private async generateTextInternal(
    options: AiGenerateOptions & { jsonMode?: boolean }
  ): Promise<AiGenerateResult> {
    if (!aiConfig.isEnabled || aiConfig.isKillSwitchActive) {
      throw new AiDisabledError()
    }

    const { sanitizedText: sanitizedPrompt } = stripPII(options.prompt)
    const promptHash = hashPrompt(sanitizedPrompt)
    const task = options.task || "general"
    const language = options.language || "en"
    const promptVersion = options.promptVersion || "v1"

    if (!options.skipCache) {
      const cached = await AiCacheService.get({
        task,
        input: sanitizedPrompt,
        language,
        promptVersion,
      })

      if (cached) {
        return {
          text: cached.outputText,
          provider: cached.provider as AiProviderName,
          model: cached.modelUsed,
          cached: true,
          promptHash,
          durationMs: 0,
        }
      }
    }

    const providerOrder = aiConfig.providerOrder
    const errors: Array<{ provider: AiProviderName; error: string }> = []
    const startTime = Date.now()

    for (const providerName of providerOrder) {
      const adapter = this.adapters.get(providerName)
      if (!adapter || !adapter.isConfigured()) {
        continue
      }

      if (!circuitBreaker.canAttempt(providerName)) {
        continue
      }

      const rateCheck = await AiRateLimiter.checkAndIncrement(providerName)
      if (!rateCheck.allowed) {
        continue
      }

      try {
        const result = await adapter.generate({
          systemPrompt: options.systemPrompt,
          prompt: sanitizedPrompt,
          messages: options.messages,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          timeoutMs: options.timeoutMs || aiConfig.defaultTimeoutMs,
          jsonMode: options.jsonMode,
        })

        circuitBreaker.recordSuccess(providerName)

        if (!options.skipCache) {
          await AiCacheService.set({
            task,
            input: sanitizedPrompt,
            language,
            promptVersion,
            outputText: result.text,
            modelUsed: result.model,
            provider: providerName,
          })
        }

        return {
          text: result.text,
          provider: providerName,
          model: result.model,
          cached: false,
          promptHash,
          durationMs: Date.now() - startTime,
          tokensUsed: result.tokensUsed,
        }
      } catch (err: any) {
        circuitBreaker.recordFailure(providerName)
        errors.push({ provider: providerName, error: err?.message || String(err) })
      }
    }

    throw new AiAllProvidersExhaustedError(
      `All AI providers failed: ${JSON.stringify(errors)}`
    )
  }

  /**
   * Generates a 768-dimensional semantic embedding.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!aiConfig.isEnabled || aiConfig.isKillSwitchActive) {
      throw new AiDisabledError()
    }
    return EmbeddingAdapter.generateEmbedding(text)
  }
}

export const aiGateway = new AiProviderGateway()
