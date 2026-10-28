import { AiProviderAdapter, AiChatMessage } from "../types"
import { aiConfig } from "../config"

export class GeminiAdapter implements AiProviderAdapter {
  public readonly name = "gemini" as const

  public isConfigured(): boolean {
    return !!aiConfig.providers.gemini.apiKey
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
    const apiKey = aiConfig.providers.gemini.apiKey
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured")
    }

    const model = aiConfig.providers.gemini.model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const contents: any[] = []

    if (options.messages && options.messages.length > 0) {
      for (const msg of options.messages) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })
      }
    } else {
      contents.push({
        role: "user",
        parts: [{ text: options.prompt }],
      })
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    }

    if (options.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }],
      }
    }

    if (options.jsonMode) {
      body.generationConfig.responseMimeType = "application/json"
    }

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs || aiConfig.defaultTimeoutMs
    )

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        throw new Error(
          `Gemini API error status ${res.status}: ${res.statusText} ${errorText}`
        )
      }

      const json = await res.json()
      const candidateText =
        json.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const usage = json.usageMetadata

      return {
        text: candidateText,
        model,
        tokensUsed: usage
          ? {
              promptTokens: usage.promptTokenCount,
              completionTokens: usage.candidatesTokenCount,
              totalTokens: usage.totalTokenCount,
            }
          : undefined,
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
