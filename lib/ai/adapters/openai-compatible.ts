import { AiProviderAdapter, AiProviderName, AiChatMessage } from "../types"
import { aiConfig } from "../config"

export interface OpenAiCompatibleOptions {
  name: AiProviderName
  baseUrl: string
  getApiKey: () => string | undefined
  getModel: () => string
  extraHeaders?: Record<string, string>
}

export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  public readonly name: AiProviderName
  private readonly baseUrl: string
  private readonly getApiKey: () => string | undefined
  private readonly getModel: () => string
  private readonly extraHeaders?: Record<string, string>

  constructor(options: OpenAiCompatibleOptions) {
    this.name = options.name
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.getApiKey = options.getApiKey
    this.getModel = options.getModel
    this.extraHeaders = options.extraHeaders
  }

  public isConfigured(): boolean {
    return !!this.getApiKey()
  }

  public async generate(options: {
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
  }> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new Error(`API key for ${this.name} is not configured`)
    }

    const model = this.getModel()
    const url = `${this.baseUrl}/chat/completions`

    const messages: Array<{ role: string; content: string }> = []

    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt })
    }

    if (options.messages && options.messages.length > 0) {
      for (const m of options.messages) {
        messages.push({ role: m.role, content: m.content })
      }
    } else {
      messages.push({ role: "user", content: options.prompt })
    }

    const body: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
    }

    if (options.jsonMode) {
      body.response_format = { type: "json_object" }
    }

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs || aiConfig.defaultTimeoutMs
    )

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...this.extraHeaders,
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        throw new Error(
          `${this.name} API error status ${res.status}: ${res.statusText} ${errorText}`
        )
      }

      const json = await res.json()
      const text = json.choices?.[0]?.message?.content || ""
      const usage = json.usage

      return {
        text,
        model,
        tokensUsed: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }
          : undefined,
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
