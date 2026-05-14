/**
 * LLM utility — OpenAI-compatible API caller.
 * User brings their own API key, stored locally.
 */

const STORAGE_KEY = 'speakeasy_llm_settings'

export interface LLMSettings {
  apiKey: string
  provider: 'openai' | 'deepseek' | 'qwen' | 'custom'
  baseUrl: string
  model: string
}

const PROVIDER_PRESETS: Record<string, Omit<LLMSettings, 'apiKey'>> = {
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  deepseek: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  qwen: {
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
  },
  custom: {
    provider: 'custom',
    baseUrl: '',
    model: '',
  },
}

export function getSettings(): LLMSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSettings(settings: LLMSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasLLM(): boolean {
  const s = getSettings()
  return !!(s && s.apiKey && s.baseUrl && s.model)
}

export function getProviderPreset(provider: string) {
  return PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom
}

/** Simple in-memory cache to avoid repeated calls for identical prompts */
const cache = new Map<string, string>()

/**
 * Call LLM with a system + user prompt.
 * Returns the text response, or null on failure.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  const settings = getSettings()
  if (!settings || !settings.apiKey) return null

  const cacheKey = `${settings.model}::${systemPrompt.slice(0, 80)}::${userPrompt.slice(0, 200)}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)!

  try {
    const res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 500,
      }),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error(`LLM API error ${res.status}: ${err}`)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (content) cache.set(cacheKey, content)
    return content || null
  } catch (e) {
    console.error('LLM call failed:', e)
    return null
  }
}

/** Clear the response cache (e.g. when settings change) */
export function clearLLMCache(): void {
  cache.clear()
}
