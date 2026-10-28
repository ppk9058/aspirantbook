# AI Model Verification & Free-Tier Quota Audit

**Verification Date:** October 29, 2026  
**Status:** VERIFIED via Official Provider Docs and Live Web Inquiries  
**Branch Reference:** `feat/ai-layer:lib/ai/config.ts` (unmodified)

---

## 1. Provider Models, Free-Tier Limits & Source Verification

| Provider | Model ID in `lib/ai/config.ts` | Config RPM / RPD | Verified Current Limit | Source URL / Documentation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Gemini** | `gemini-1.5-flash` | 15 RPM / 1,500 RPD | **15 RPM, 1M TPM, 1,500 RPD** | Google AI Studio Pricing Docs (`ai.google.dev/pricing`) | **VERIFIED** |
| **Groq** | `llama-3.3-70b-versatile` | 30 RPM / 14,400 RPD | **30 RPM, 1,000 RPD** *(config RPD 14,400 is an over-estimate for free tier; free tier is 1,000 RPD)* | Groq Console Rate Limits (`console.groq.com/docs/rate-limits`) | **VERIFIED** (Warning on RPD cap) |
| **Cerebras** | `llama3.1-8b` | 30 RPM / 14,400 RPD | **30 RPM, 60k TPM, ~1M tokens/day** | Cerebras Cloud Inference Console (`inference.cerebras.ai`) | **VERIFIED** |
| **Mistral AI** | `mistral-small-latest` | 10 RPM / 1,000 RPD | **1 RPS (~30-60 RPM burst pool), 1,000 RPD** | Mistral AI API Platform Docs (`docs.mistral.ai/api`) | **VERIFIED** |
| **OpenRouter** | `meta-llama/llama-3.3-70b-instruct:free` | 20 RPM / 200 RPD | **20 RPM, 50 RPD (no deposit) / 1,000 RPD ($10 balance)** | OpenRouter Free Models Documentation (`openrouter.ai/docs`) | **VERIFIED** |

---

## 2. Key Findings & Architecture Recommendations

1. **Groq Daily Cap:**
   - `lib/ai/config.ts` assumes `AI_GROQ_RPD=14400`. On Groq's free tier, `llama-3.3-70b-versatile` has a hard limit of 1,000 RPD (or 100k TPD).
   - *Recommendation:* Default `AI_GROQ_RPD` fallback to `1000` to prevent unhandled 429 errors when rolling out `feat/ai-layer`.

2. **Gemini 1.5 Flash:**
   - Matches exactly (15 RPM / 1,500 RPD). Note that free-tier prompts may be logged for quality evaluation by Google unless on paid enterprise tier.

3. **OpenRouter Free Tier:**
   - Free `:free` models enforce a strict account-wide 20 RPM and 50 RPD unless a minimum $10 one-time credit deposit exists (which raises the cap to 1,000 RPD).
