import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { Concept, Domain } from '../../types'

import { getApiKey, getModel } from './settings'

function client() {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Add your Anthropic API key in Settings to use AI features.')
  // The key never leaves this browser except to call the Anthropic API directly.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/** Model-specific request options: refusal fallbacks on Opus, effort where supported. */
function modelOptions(model: string) {
  const isHaiku = model.startsWith('claude-haiku')
  const isOpus = model.startsWith('claude-opus')
  return {
    ...(isOpus ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    ...(isHaiku ? {} : { effort: 'medium' as const }),
  }
}

/* ───────────── Concept drafting ───────────── */

const DOMAINS = [
  'budgeting',
  'emergency',
  'debt',
  'credit',
  'accounts',
  'tax',
  'investing',
  'bogleheads',
  'retirement',
  'insurance',
] as const satisfies readonly Domain[]

const DraftSchema = z.object({
  title: z.string().describe('Short concept name, e.g. "Mega backdoor Roth"'),
  domain: z.enum(DOMAINS),
  summary: z
    .string()
    .describe('2–4 short paragraphs of markdown explaining the concept for a US beginner. Bold key terms.'),
  cards: z
    .array(
      z.object({
        type: z.enum(['basic', 'cloze']),
        front: z.string().describe('Question. For cloze, a sentence with ____ where the answer goes.'),
        back: z.string().describe('Concise answer.'),
      }),
    )
    .describe('3 to 6 flashcards testing understanding, not trivia.'),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).describe('Exactly 4 answer choices.'),
        answerIndex: z.number().int().describe('0-based index of the correct option.'),
        explanation: z.string(),
      }),
    )
    .describe('2 multiple-choice questions, ideally applied scenarios.'),
  links: z
    .array(
      z.object({
        conceptId: z.string().describe('Must be one of the provided existing concept ids.'),
        type: z.enum(['prereq', 'partOf', 'related', 'contrasts', 'example']),
      }),
    )
    .describe('Up to 5 relationships from the new concept to existing concepts.'),
})

export type ConceptDraft = z.infer<typeof DraftSchema>

const SYSTEM = `You are a patient US personal-finance tutor in the spirit of the Bogleheads wiki and the r/personalfinance wiki.
You write accurate, plain-language study material for a motivated beginner.
Prefer evidence-based, low-cost, index-fund-centric guidance. Mention when numbers are year-specific (e.g. IRS limits) and could change.
Never give individualized investment advice; explain concepts and trade-offs.`

export async function draftConcept(input: string, existing: Pick<Concept, 'id' | 'title'>[]): Promise<ConceptDraft> {
  const model = getModel()
  const { effort, ...extra } = modelOptions(model)
  const catalog = existing.map((c) => `${c.id}: ${c.title}`).join('\n')
  const res = await client().beta.messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    ...extra,
    output_config: { format: betaZodOutputFormat(DraftSchema), ...(effort ? { effort } : {}) },
    messages: [
      {
        role: 'user',
        content: `Create study material for ONE concept based on the input below. If it's a pasted excerpt (e.g. from Bogleheads or Reddit), pick its central concept.

<input>
${input}
</input>

Existing concepts in my knowledge graph (id: title). Only link to these ids, and don't recreate one of them:
<existing>
${catalog}
</existing>`,
      },
    ],
  })
  if (res.stop_reason === 'refusal') throw new Error('The model declined this request. Try rephrasing.')
  const draft = res.parsed_output
  if (!draft) throw new Error('Could not read the AI response. Please try again.')
  const valid = new Set(existing.map((c) => c.id))
  return {
    ...draft,
    links: draft.links.filter((l) => valid.has(l.conceptId)),
    quiz: draft.quiz.filter((q) => q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length),
  }
}

/* ───────────── Explain like I'm new ───────────── */

export async function explainSimply(concept: Pick<Concept, 'title' | 'summary'>): Promise<string> {
  const model = getModel()
  const { effort, ...extra } = modelOptions(model)
  const res = await client().beta.messages.create({
    model,
    max_tokens: 4000,
    system: SYSTEM,
    ...extra,
    ...(effort ? { output_config: { effort } } : {}),
    messages: [
      {
        role: 'user',
        content: `Explain "${concept.title}" like I'm completely new to personal finance.
Use one everyday analogy, one concrete dollar example, and end with a one-line "Why it matters to you". Keep it under 200 words, markdown allowed.

For context, here is my current note on it:
${concept.summary}`,
      },
    ],
  })
  if (res.stop_reason === 'refusal') throw new Error('The model declined this request.')
  return res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')
}

export function describeAiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'Invalid API key — check Settings.'
  if (e instanceof Anthropic.RateLimitError) return 'Rate limited — wait a moment and retry.'
  if (e instanceof Anthropic.BadRequestError) return `Request rejected: ${e.message}`
  if (e instanceof Anthropic.APIError) return `API error ${e.status ?? ''}: ${e.message}`
  if (e instanceof Error) return e.message
  return String(e)
}
