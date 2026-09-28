import type { Concept } from '../../types'

/** AI needs the internet; everything else in FinQuest works offline. */
export class OfflineError extends Error {
  constructor() {
    super('offline')
  }
}
const online = () => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OfflineError()
}

// The Anthropic SDK is only downloaded the first time an AI feature is used.
export const draftConcept = async (input: string, existing: Pick<Concept, 'id' | 'title'>[]) => {
  online()
  return (await import('./claude')).draftConcept(input, existing)
}

export const explainSimply = async (concept: Pick<Concept, 'title' | 'summary'>) => {
  online()
  return (await import('./claude')).explainSimply(concept)
}

export const describeAiError = async (e: unknown) =>
  e instanceof OfflineError
    ? 'You’re offline. AI help needs an internet connection — everything else still works, so keep learning!'
    : (await import('./claude')).describeAiError(e)
