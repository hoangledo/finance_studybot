/*
 * AI settings live only in this browser (never in the cloud), scoped to the current identity
 * so accounts sharing a browser don't see each other's API key. Sign-out removes the key.
 */

export const MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', note: 'Best quality (default)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', note: 'Faster, cheaper' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: 'Fastest, cheapest' },
] as const

let scope = 'guest'

/** Called when the active identity changes ('guest' or a user id). */
export function setAiScope(identity: string) {
  scope = identity
}

const keyStorage = (s = scope) => `finquest.anthropicKey:${s}`
const modelStorage = (s = scope) => `finquest.model:${s}`

function ls(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const getApiKey = () => ls(keyStorage()) ?? ''
export const getModel = () => ls(modelStorage()) ?? MODELS[0].id
export const hasApiKey = () => getApiKey().trim().length > 0

export function saveAiSettings(apiKey: string, model: string) {
  try {
    if (apiKey) localStorage.setItem(keyStorage(), apiKey.trim())
    else localStorage.removeItem(keyStorage())
    localStorage.setItem(modelStorage(), model)
  } catch {
    /* ignore */
  }
}

export function clearAiKey(identity: string) {
  try {
    localStorage.removeItem(keyStorage(identity))
  } catch {
    /* ignore */
  }
}
