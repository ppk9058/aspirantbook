import { OpenAiCompatibleAdapter } from "./openai-compatible"
import { aiConfig } from "../config"

export class GroqAdapter extends OpenAiCompatibleAdapter {
  constructor() {
    super({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      getApiKey: () => aiConfig.providers.groq.apiKey,
      getModel: () => aiConfig.providers.groq.model,
    })
  }
}
