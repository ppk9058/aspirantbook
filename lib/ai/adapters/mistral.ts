import { OpenAiCompatibleAdapter } from "./openai-compatible"
import { aiConfig } from "../config"

export class MistralAdapter extends OpenAiCompatibleAdapter {
  constructor() {
    super({
      name: "mistral",
      baseUrl: "https://api.mistral.ai/v1",
      getApiKey: () => aiConfig.providers.mistral.apiKey,
      getModel: () => aiConfig.providers.mistral.model,
    })
  }
}
