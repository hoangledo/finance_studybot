import { describe, expect, it } from 'vitest'
import type { Recurring, Transaction } from '../types'
import {
  missingOccurrences,
  money,
  monthlyAverages,
  normalizeTargets,
  occurrences,
  parseAmount,
  periodRange,
  scaleMonthlyLimit,
  shiftPeriod,
  splitAdvice,
  summarize,
} from './budget'

let n = 0
const tx = (date: string, dollars: number, kind: Transaction['kind'], bucket?: Transaction['bucket'], categoryId = 'c'): Transaction => ({
  id: `t${n++}`,
  date,
  amountCents: Math.round(dollars * 100),
  kind,
  bucket,
  categoryId,
  note: '',
  createdAt: 0,
})

describe('amount parsing & formatting', () => {
  it('parses dollar strings to cents', () => {
    expect(parseAmount('12.5')).toBe(1250)
    expect(parseAmount('$1,200')).toBe(120000)
    expect(parseAmount('0')).toBeNull()
    expect(parseAmount('12.345')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
  })
  it('formats cents', () => {
    expect(money(123456)).toBe('$1,234.56')
    expect(money(100000)).toBe('$1,000')
    expect(money(-2500, { sign: true })).toBe('−$25')
    expect(money(1_250_000, { compact: true })).toBe('$12.5k')
  })
})

describe('periods', () => {
  it('computes Monday- and Sunday-start weeks', () => {
    expect(periodRange('week', '2026-09-27', 1)).toMatchObject({ start: '2026-09-21', end: '2026-09-27' }) // Sunday
    expect(periodRange('week', '2026-09-27', 0)).toMatchObject({ start: '2026-09-27', end: '2026-10-03' })
  })
  it('handles month and year edges', () => {
    expect(periodRange('month', '2028-02-10')).toMatchObject({ start: '2028-02-01', end: '2028-02-29', label: 'February 2028' })
    expect(periodRange('year', '2026-06-01')).toMatchObject({ start: '2026-01-01', end: '2026-12-31' })
    expect(shiftPeriod('month', '2026-01-31', -1)).toBe('2025-12-01')
    expect(shiftPeriod('week', '2026-09-27', 1)).toBe('2026-10-04')
  })
})

describe('summaries', () => {
  const r = periodRange('month', '2026-09-15')
  const data = [
    tx('2026-09-01', 4000, 'income'),
    tx('2026-09-02', 1600, 'expense', 'need', 'rent'),
    tx('2026-09-05', 400, 'expense', 'need', 'groceries'),
    tx('2026-09-06', 1200, 'expense', 'want', 'fun'),
    tx('2026-09-07', 500, 'expense', 'savings', 'invest'),
    tx('2026-10-01', 9999, 'expense', 'want'), // outside the period
  ]
  it('splits spending into buckets against income', () => {
    const s = summarize(data, r, [{ id: 'fun', name: 'Fun', emoji: '', kind: 'expense', monthlyLimitCents: 100000, isDefault: false, order: 0 }])
    expect(s.incomeCents).toBe(400000)
    expect(s.spentCents).toBe(320000)
    expect(s.savedCents).toBe(80000)
    expect(s.savingsRate).toBeCloseTo(0.2)
    expect(s.split.need).toBeCloseTo(0.5)
    expect(s.split.want).toBeCloseTo(0.3)
    expect(s.byCategory[0].categoryId).toBe('rent')
    expect(s.byCategory.find((c) => c.categoryId === 'fun')!.ratio).toBeCloseTo(1.2)
    expect(s.count).toBe(5)
  })
  it('gives advice only for meaningful gaps', () => {
    const s = summarize(data, r)
    expect(splitAdvice(s, { need: 50, want: 30, savings: 20 })).toBeNull()
    expect(splitAdvice(s, { need: 50, want: 20, savings: 30 })).toEqual({ bucket: 'want', diffPts: 10 })
  })
  it('scales monthly limits to weeks', () => {
    expect(scaleMonthlyLimit(43_500, periodRange('week', '2026-09-21'))).toBe(10_004)
    expect(scaleMonthlyLimit(43_500, r)).toBe(43_500)
  })
})

describe('monthly averages', () => {
  it('averages recent full months, falling back to the current month', () => {
    const data = [tx('2026-07-03', 3000, 'income'), tx('2026-08-03', 5000, 'income'), tx('2026-08-04', 1000, 'expense', 'need')]
    const a = monthlyAverages(data, '2026-09-20')!
    expect(a.monthsUsed).toBe(2)
    expect(a.incomeCents).toBe(400000)
    expect(a.bucketCents.need).toBe(50000)
    const onlyNow = monthlyAverages([tx('2026-09-02', 2000, 'income')], '2026-09-20')!
    expect(onlyNow.partial).toBe(true)
    expect(monthlyAverages([], '2026-09-20')).toBeNull()
  })
})

describe('recurring', () => {
  it('monthly on the 31st falls back to the last day of short months', () => {
    expect(occurrences({ cadence: 'monthly', startDate: '2026-01-31' }, '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })
  it('weekly/biweekly respect start, window and end date', () => {
    expect(occurrences({ cadence: 'weekly', startDate: '2026-09-01' }, '2026-09-10', '2026-09-30')).toEqual(['2026-09-15', '2026-09-22', '2026-09-29'])
    expect(occurrences({ cadence: 'biweekly', startDate: '2026-09-01', endDate: '2026-09-20' }, '2026-08-01', '2026-12-31')).toEqual(['2026-09-01', '2026-09-15'])
  })
  it('materializes only missing, non-skipped, non-paused occurrences', () => {
    const r: Recurring = {
      id: 'rent',
      amountCents: 160000,
      kind: 'expense',
      categoryId: 'cat-rent',
      bucket: 'need',
      note: 'Rent',
      cadence: 'monthly',
      startDate: '2026-07-01',
      skipped: ['2026-08-01'],
      createdAt: 0,
    }
    const first = missingOccurrences(r, new Set(), '2026-09-20')
    expect(first.map((t) => t.id)).toEqual(['rent@2026-07-01', 'rent@2026-09-01'])
    expect(missingOccurrences(r, new Set(first.map((t) => t.id)), '2026-09-20')).toEqual([])
    expect(missingOccurrences({ ...r, paused: true }, new Set(), '2026-09-20')).toEqual([])
  })
})

describe('targets', () => {
  it('always sums to 100, adjusting the buckets the user did not touch', () => {
    expect(normalizeTargets({ need: 60, want: 30, savings: 20 }, 'need')).toEqual({ need: 60, want: 20, savings: 20 })
    expect(normalizeTargets({ need: 100, want: 30, savings: 20 }, 'need')).toEqual({ need: 100, want: 0, savings: 0 })
    const t = normalizeTargets({ need: 33.3, want: 33.3, savings: 33.3 })
    expect(t.need + t.want + t.savings).toBe(100)
  })
})
