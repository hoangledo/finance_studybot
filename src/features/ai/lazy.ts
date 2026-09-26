import type { Concept } from '../../types'

// The Anthropic SDK is only downloaded the first time an AI feature is used.
export const draftConcept = async (input: string, existing: Pick<Concept, 'id' | 'title'>[]) =>
  (await import('./claude')).draftConcept(input, existing)

export const explainSimply = async (concept: Pick<Concept, 'title' | 'summary'>) => (await import('./claude')).explainSimply(concept)

export const describeAiError = async (e: unknown) => (await import('./claude')).describeAiError(e)
