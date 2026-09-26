import { describe, expect, it } from 'vitest'
import { SEED_CONCEPTS, SEED_EDGES } from './concepts'
import { LESSONS, UNITS } from './lessons'

const conceptIds = new Set(SEED_CONCEPTS.map((c) => c.id))
const lessonIds = new Set(LESSONS.map((l) => l.id))

describe('seed content integrity', () => {
  it('has unique concept ids and at least one card each', () => {
    expect(conceptIds.size).toBe(SEED_CONCEPTS.length)
    for (const c of SEED_CONCEPTS) expect(c.cards.length, c.id).toBeGreaterThan(0)
  })

  it('edges point at real concepts', () => {
    for (const [from, to] of SEED_EDGES) {
      expect(conceptIds.has(from), from).toBe(true)
      expect(conceptIds.has(to), to).toBe(true)
    }
  })

  it('lessons reference real concepts, lessons and units', () => {
    const unitIds = new Set(UNITS.map((u) => u.id))
    expect(lessonIds.size).toBe(LESSONS.length)
    for (const l of LESSONS) {
      expect(unitIds.has(l.unit), l.id).toBe(true)
      for (const c of l.conceptIds) expect(conceptIds.has(c), `${l.id} → ${c}`).toBe(true)
      for (const r of l.requires) expect(lessonIds.has(r), `${l.id} requires ${r}`).toBe(true)
    }
  })

  it('quiz answers are valid', () => {
    for (const l of LESSONS)
      for (const s of l.steps) {
        if (s.kind === 'mcq') expect(s.answer, `${l.id}: ${s.q}`).toBeLessThan(s.options.length)
        if (s.kind === 'rank') expect(s.items.length).toBeGreaterThanOrEqual(3)
      }
  })

  it('every concept is taught by some lesson', () => {
    const taught = new Set(LESSONS.flatMap((l) => l.conceptIds))
    const missing = [...conceptIds].filter((c) => !taught.has(c))
    expect(missing).toEqual([])
  })
})
