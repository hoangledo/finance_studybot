import { describe, expect, it } from 'vitest'
import { CALC_TEMPLATES } from '../content/calcCards'
import { SEED_CONCEPTS } from '../content/concepts'
import { newFsrsCard } from './srs'
import { buildCalc, calcAsMcq, formatCalc, rng } from './calc'
import { loanPayment } from './finance'
import type { StudyCard } from '../types'

describe('number-crunch cards', () => {
  it('every template maps to a real concept', () => {
    const ids = new Set(SEED_CONCEPTS.map((c) => c.id))
    for (const t of CALC_TEMPLATES) expect(ids.has(t.conceptId), t.id).toBe(true)
  })

  it('always yields 4 distinct options with exactly one right answer', () => {
    for (const t of CALC_TEMPLATES) {
      for (let seed = 1; seed <= 200; seed++) {
        const q = buildCalc(t.id, seed)!
        expect(q.options, `${t.id}#${seed}`).toHaveLength(4)
        expect(new Set(q.options).size, `${t.id}#${seed}`).toBe(4)
        expect(q.answerIndex).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('is deterministic per seed and varies across seeds', () => {
    expect(buildCalc('compound-lump', 42)).toEqual(buildCalc('compound-lump', 42))
    const questions = new Set(Array.from({ length: 20 }, (_, i) => buildCalc('compound-lump', i + 1)!.question))
    expect(questions.size).toBeGreaterThan(5)
  })

  it('computes answers with the finance formulas', () => {
    // Re-draw the same inputs the template will use, then check the marked answer.
    const r = rng(7)
    const p = r.int(200, 500, 25) * 1000
    const rate = r.pick([0.05, 0.06, 0.07] as const)
    const q = buildCalc('mortgage-payment', 7)!
    // Options round amounts ≥ $1,000 to the nearest $10.
    const expected = formatCalc('money', Math.round(loanPayment(p, rate, 360) / 10) * 10)
    expect(q.options[q.answerIndex]).toBe(expected)
  })

  it('renders a calc card as a multiple-choice card with new numbers after each review', () => {
    const base: StudyCard = {
      id: 'calc:four-percent',
      conceptId: 'four-percent-rule',
      type: 'calc',
      template: 'four-percent',
      front: 'Number crunch',
      back: '',
      fsrs: newFsrsCard(new Date('2026-01-01')),
      locked: false,
      isSeed: true,
      createdAt: 0,
    }
    const a = calcAsMcq(base)
    expect(a.type).toBe('mcq')
    expect(a.options).toHaveLength(4)
    expect(calcAsMcq(base).front).toBe(a.front) // stable while on screen
    const fronts = new Set(Array.from({ length: 8 }, (_, reps) => calcAsMcq({ ...base, fsrs: { ...base.fsrs, reps } }).front))
    expect(fronts.size).toBeGreaterThan(3)
  })
})
