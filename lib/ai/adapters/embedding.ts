import { aiConfig } from "../config"
import { stripPII } from "../pii"

export class EmbeddingAdapter {
  public static isConfigured(): boolean {
    return !!aiConfig.providers.gemini.apiKey
  }

  public static async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = aiConfig.providers.gemini.apiKey
    if (!apiKey) {
      throw new Error("Embedding generation requires GEMINI_API_KEY to be configured")
    }

    const { sanitizedText } = stripPII(text)
    const model = aiConfig.embeddingModel
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text: sanitizedText.slice(0, 2048) }],
          },
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        throw new Error(`Embedding API error ${res.status}: ${errorText}`)
      }

      const json = await res.json()
      const values = json.embedding?.values
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Invalid embedding response structure")
      }

      return values
    } finally {
      clearTimeout(timeout)
    }
  }
}
