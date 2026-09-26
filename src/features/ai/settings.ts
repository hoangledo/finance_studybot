/* ───────────── Settings (browser-only) ───────────── */

export const MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', note: 'Best quality (default)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', note: 'Faster, cheaper' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: 'Fastest, cheapest' },
] as const

const KEY_STORAGE = 'finquest.anthropicKey'
const MODEL_STORAGE = 'finquest.model'

function ls(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const getApiKey = () => ls(KEY_STORAGE) ?? ''
export const getModel = () => ls(MODEL_STORAGE) ?? MODELS[0].id
export const hasApiKey = () => getApiKey().trim().length > 0

export function saveAiSettings(apiKey: string, model: string) {
  try {
    if (apiKey) localStorage.setItem(KEY_STORAGE, apiKey.trim())
    else localStorage.removeItem(KEY_STORAGE)
    localStorage.setItem(MODEL_STORAGE, model)
  } catch {
    /* ignore */
  }
}
