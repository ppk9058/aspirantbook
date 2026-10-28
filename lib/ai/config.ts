import { AiProviderName } from "./types"

function getEnvInt(name: string, fallback: number): number {
  const val = process.env[name]
  if (!val) return fallback
  const parsed = parseInt(val, 10)
  return isNaN(parsed) ? fallback : parsed
}

function getEnvBool(name: string, fallback: boolean): boolean {
  const val = process.env[name]?.toLowerCase()?.trim()
  if (val === "true" || val === "1") return true
  if (val === "false" || val === "0") return false
  return fallback
}

export const aiConfig = {
  get isEnabled(): boolean {
    return getEnvBool("AI_ENABLED", false)
  },

  get isKillSwitchActive(): boolean {
    return getEnvBool("AI_KILL_SWITCH", false)
  },

  get defaultTimeoutMs(): number {
    return getEnvInt("AI_REQUEST_TIMEOUT_MS", 15000)
  },

  get circuitBreakerFailureThreshold(): number {
    return getEnvInt("AI_CIRCUIT_BREAKER_FAILURES", 3)
  },

  get circuitBreakerCooldownMs(): number {
    return getEnvInt("AI_CIRCUIT_BREAKER_COOLDOWN_MS", 60000)
  },

  get providerOrder(): AiProviderName[] {
    const raw = process.env.AI_PROVIDER_ORDER
    if (raw) {
      const parts = raw
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter((p): p is AiProviderName =>
          ["gemini", "groq", "cerebras", "mistral", "openrouter"].includes(p)
        )
      if (parts.length > 0) return parts
    }
    return ["gemini", "groq", "cerebras", "mistral", "openrouter"]
  },

  // Student Doubt Quotas & Protection
  get studentDoubtsEnabled(): boolean {
    return getEnvBool("AI_STUDENT_DOUBTS_ENABLED", true)
  },

  get studentDailyQuota(): number {
    return getEnvInt("AI_STUDENT_DAILY_QUOTA", 5)
  },

  get studentMaxQuestionLength(): number {
    return getEnvInt("AI_STUDENT_MAX_QUESTION_LENGTH", 500)
  },

  // Semantic Search
  get searchEnabled(): boolean {
    return getEnvBool("AI_SEARCH_ENABLED", false)
  },

  get embeddingModel(): string {
    return process.env.AI_EMBEDDING_MODEL || "text-embedding-004"
  },

  // Provider-specific Free-tier Configurations (keys, models, rate limits)
  providers: {
    gemini: {
      get apiKey(): string | undefined {
        return process.env.GEMINI_API_KEY
      },
      get model(): string {
        return process.env.GEMINI_MODEL || "gemini-1.5-flash"
      },
      get rpmLimit(): number {
        return getEnvInt("AI_GEMINI_RPM", 15)
      },
      get rpdLimit(): number {
        return getEnvInt("AI_GEMINI_RPD", 1500)
      },
    },

    groq: {
      get apiKey(): string | undefined {
        return process.env.GROQ_API_KEY
      },
      get model(): string {
        return process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
      },
      get rpmLimit(): number {
        return getEnvInt("AI_GROQ_RPM", 30)
      },
      get rpdLimit(): number {
        return getEnvInt("AI_GROQ_RPD", 14400)
      },
    },

    cerebras: {
      get apiKey(): string | undefined {
        return process.env.CEREBRAS_API_KEY
      },
      get model(): string {
        return process.env.CEREBRAS_MODEL || "llama3.1-8b"
      },
      get rpmLimit(): number {
        return getEnvInt("AI_CEREBRAS_RPM", 30)
      },
      get rpdLimit(): number {
        return getEnvInt("AI_CEREBRAS_RPD", 14400)
      },
    },

    mistral: {
      get apiKey(): string | undefined {
        return process.env.MISTRAL_API_KEY
      },
      get model(): string {
        return process.env.MISTRAL_MODEL || "mistral-small-latest"
      },
      get rpmLimit(): number {
        return getEnvInt("AI_MISTRAL_RPM", 10)
      },
      get rpdLimit(): number {
        return getEnvInt("AI_MISTRAL_RPD", 1000)
      },
    },

    openrouter: {
      get apiKey(): string | undefined {
        return process.env.OPENROUTER_API_KEY
      },
      get model(): string {
        return (
          process.env.OPENROUTER_MODEL ||
          "meta-llama/llama-3.3-70b-instruct:free"
        )
      },
      get rpmLimit(): number {
        return getEnvInt("AI_OPENROUTER_RPM", 20)
      },
      get rpdLimit(): number {
        return getEnvInt("AI_OPENROUTER_RPD", 200)
      },
    },
  },
}
