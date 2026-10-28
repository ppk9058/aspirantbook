import { z } from "zod"

export type AiProviderName = "gemini" | "groq" | "cerebras" | "mistral" | "openrouter"

export interface AiChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AiGenerateOptions {
  task: string
  promptVersion?: string
  language?: string
  systemPrompt?: string
  prompt: string
  messages?: AiChatMessage[]
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  userId?: string
  skipCache?: boolean
}

export interface AiGenerateResult {
  text: string
  provider: AiProviderName
  model: string
  cached: boolean
  promptHash: string
  durationMs: number
  tokensUsed?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export interface AiJsonGenerateResult<T> extends AiGenerateResult {
  data: T
}

export interface AiProviderConfig {
  name: AiProviderName
  apiKey?: string
  model: string
  rpmLimit: number
  rpdLimit: number
  baseUrl?: string
}

export interface AiProviderAdapter {
  name: AiProviderName
  isConfigured(): boolean
  generate(options: {
    systemPrompt?: string
    prompt: string
    messages?: AiChatMessage[]
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
    jsonMode?: boolean
  }): Promise<{
    text: string
    model: string
    tokensUsed?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
  }>
}
