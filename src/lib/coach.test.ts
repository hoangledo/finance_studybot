import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { DEFAULT_MONEY_SETTINGS } from './budget'
import { coachInsights, type CoachInput } from './coach'

let n = 0
const tx = (date: string, dollars: number, kind: Transaction['kind'], categoryId: string, bucket?: Transaction['bucket']): Transaction => ({
  id: `t${n++}`,
  date,
  amountCents: dollars * 100,
  kind,
  categoryId,
  bucket,
  note: '',
  createdAt: 0,
})

const base = (transactions: Transaction[], over: Partial<CoachInput> = {}): CoachInput => ({
  transactions,
  settings: DEFAULT_MONEY_SETTINGS,
  today: '2026-09-20',
  lessonsDone: new Set(),
  missionsDone: new Set(),
  ...over,
})
const ids = (i: CoachInput) => coachInsights(i).map((t) => t.id)

describe('money coach', () => {
  it('asks for data first', () => {
    expect(ids(base([]))).toEqual(['no-data'])
  })

  it('flags high wants, missing emergency fund and missing investing, ranked by priority', () => {
    const data = [tx('2026-09-01', 4000, 'income', 'cat-salary'), tx('2026-09-02', 1500, 'expense', 'cat-rent', 'need'), tx('2026-09-05', 1800, 'expense', 'cat-dining', 'want')]
    const tips = coachInsights(base(data))
    expect(tips.map((t) => t.id)).toEqual(['wants-high', 'no-emergency', 'low-savings', 'no-investing'].filter((id) => tips.some((t) => t.id === id)))
    expect(tips[0].id).toBe('wants-high')
    expect(tips[0].to).toBe('/lesson/l-budget')
  })

  it('points to a mission once the lesson is done, and skips finished missions', () => {
    const data = [tx('2026-09-01', 4000, 'income', 'cat-salary'), tx('2026-09-02', 500, 'expense', 'cat-rent', 'need')]
    const tip = coachInsights(base(data, { lessonsDone: new Set(['l-emergency']), missionsDone: new Set(['open-hysa']) })).find((t) => t.id === 'no-emergency')!
    expect(tip.to).toBe('/missions#starter-fund')
  })

  it('warns when spending exceeds income', () => {
    const data = [tx('2026-09-01', 2000, 'income', 'cat-salary'), tx('2026-09-02', 2500, 'expense', 'cat-rent', 'need')]
    expect(ids(base(data))[0]).toBe('overspent')
  })

  it('celebrates a healthy month', () => {
    const data = [
      tx('2026-09-01', 5000, 'income', 'cat-salary'),
      tx('2026-09-02', 2000, 'expense', 'cat-rent', 'need'),
      tx('2026-09-03', 500, 'expense', 'cat-emergency', 'savings'),
      tx('2026-09-04', 500, 'expense', 'cat-invest', 'savings'),
    ]
    expect(ids(base(data))).toEqual(['on-track'])
  })

  it('never returns two tips to the same place', () => {
    const data = [tx('2026-09-01', 2000, 'income', 'cat-salary'), tx('2026-09-02', 2500, 'expense', 'cat-dining', 'want')]
    const tips = coachInsights(base(data))
    expect(new Set(tips.map((t) => t.to)).size).toBe(tips.length)
  })
})
