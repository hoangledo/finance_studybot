/** Turn a number-crunch template + seed into a concrete multiple-choice question. Pure and deterministic. */
import { CALC_BY_ID, type CalcFormat, type Rng } from '../content/calcCards'
import type { StudyCard } from '../types'

/** Small, fast seeded PRNG (mulberry32). */
export function rng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    int: (min, max, step = 1) => min + Math.floor(next() * (Math.floor((max - min) / step) + 1)) * step,
    pick: (xs) => xs[Math.floor(next() * xs.length)],
  }
}

export function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Round money to a "nice" precision so options look like real estimates. */
function roundFor(format: CalcFormat, v: number) {
  if (format === 'percent') return Math.round(v * 1000) / 1000
  if (format === 'years') return Math.round(v * 10) / 10
  const a = Math.abs(v)
  const step = a >= 100_000 ? 1000 : a >= 10_000 ? 100 : a >= 1000 ? 10 : 1
  return Math.round(v / step) * step
}

export function formatCalc(format: CalcFormat, v: number) {
  if (format === 'percent') return `${Math.round(v * 1000) / 10}%`
  if (format === 'years') return `${Math.round(v * 10) / 10} years`
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export interface CalcQuestion {
  question: string
  options: string[]
  answerIndex: number
  explain: string
}

/** Build a question with exactly 4 distinct options (1 right, 3 wrong), shuffled deterministically. */
export function buildCalc(templateId: string, seed: number): CalcQuestion | null {
  const t = CALC_BY_ID[templateId]
  if (!t) return null
  const r = rng(seed)
  const d = t.draw(r)
  const right = formatCalc(d.format, roundFor(d.format, d.answer))
  const wrong: string[] = []
  const tryAdd = (v: number) => {
    if (!Number.isFinite(v) || v <= 0) return
    const s = formatCalc(d.format, roundFor(d.format, v))
    if (s !== right && !wrong.includes(s) && wrong.length < 3) wrong.push(s)
  }
  d.mistakes.forEach(tryAdd)
  // Top up with scaled versions of the answer if some mistakes collided.
  for (const f of [1.5, 0.6, 2.2, 0.4, 3, 0.25]) tryAdd(d.answer * f)
  const options = [right, ...wrong]
  // Deterministic shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = r.int(0, i)
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { question: d.question, options, answerIndex: options.indexOf(right), explain: d.explain }
}

/**
 * A calc card presented as a multiple-choice card. New numbers each time it's reviewed
 * (the seed includes the review count), stable while it's on screen.
 */
export function calcAsMcq(card: StudyCard): StudyCard {
  if (card.type !== 'calc' || !card.template) return card
  const q = buildCalc(card.template, hashSeed(`${card.id}:${card.fsrs.reps}:${card.fsrs.lapses}`))
  if (!q) return card
  return { ...card, type: 'mcq', front: q.question, options: q.options, answer: q.answerIndex, back: q.explain }
}
