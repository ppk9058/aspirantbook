import { OpenAiCompatibleAdapter } from "./openai-compatible"
import { aiConfig } from "../config"

export class OpenRouterAdapter extends OpenAiCompatibleAdapter {
  constructor() {
    super({
      name: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      getApiKey: () => aiConfig.providers.openrouter.apiKey,
      getModel: () => aiConfig.providers.openrouter.model,
      extraHeaders: {
        "HTTP-Referer": "https://aspirantbook.com",
        "X-Title": "AspirantBook / TrillionSkill",
      },
    })
  }
}
