import { OpenAiCompatibleAdapter } from "./openai-compatible"
import { aiConfig } from "../config"

export class CerebrasAdapter extends OpenAiCompatibleAdapter {
  constructor() {
    super({
      name: "cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      getApiKey: () => aiConfig.providers.cerebras.apiKey,
      getModel: () => aiConfig.providers.cerebras.model,
    })
  }
}
