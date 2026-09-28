/** Pure money-tracker logic: periods, summaries, averages and recurring schedules. Amounts are integer cents. */
import type { Bucket, Category, MoneySettings, Recurring, Transaction } from '../types'
import { addDays, dayKey, daysBetween, parseDay } from './dates'

export type PeriodKind = 'week' | 'month' | 'year'

export interface Range {
  start: string // inclusive YYYY-MM-DD
  end: string // inclusive
  label: string
}

export const DEFAULT_MONEY_SETTINGS: MoneySettings = { targets: { need: 50, want: 30, savings: 20 }, weekStart: 1 }

export const BUCKETS: Bucket[] = ['need', 'want', 'savings']
export const BUCKET_LABEL: Record<Bucket, string> = { need: 'Needs', want: 'Wants', savings: 'Savings' }

/* ───────── Parsing & formatting ───────── */

/** "12.5" / "$1,200" → cents; null when not a positive amount. */
export function parseAmount(input: string): number | null {
  const clean = input.replace(/[$,\s]/g, '')
  if (!/^\d*\.?\d{0,2}$/.test(clean) || clean === '' || clean === '.') return null
  const cents = Math.round(parseFloat(clean) * 100)
  return cents > 0 ? cents : null
}

export function money(cents: number, opts: { sign?: boolean; compact?: boolean } = {}) {
  const v = cents / 100
  const s =
    opts.compact && Math.abs(v) >= 10_000
      ? `$${(Math.abs(v) / 1000).toFixed(Math.abs(v) >= 100_000 ? 0 : 1)}k`
      : Math.abs(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(v) ? 0 : 2 })
  return `${opts.sign ? (v < 0 ? '−' : '+') : v < 0 ? '−' : ''}${s}`
}

/* ───────── Periods ───────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function lastDayOfMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

export function periodRange(kind: PeriodKind, anchor: string, weekStart: 0 | 1 = 1): Range {
  const d = parseDay(anchor)
  if (kind === 'week') {
    const offset = (d.getDay() - weekStart + 7) % 7
    const start = addDays(anchor, -offset)
    const end = addDays(start, 6)
    const s = parseDay(start)
    const e = parseDay(end)
    const label =
      s.getMonth() === e.getMonth()
        ? `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`
        : `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
    return { start, end, label }
  }
  if (kind === 'month') {
    const y = d.getFullYear()
    const m = d.getMonth()
    return {
      start: dayKey(new Date(y, m, 1)),
      end: dayKey(new Date(y, m, lastDayOfMonth(y, m))),
      label: `${d.toLocaleString('en-US', { month: 'long' })} ${y}`,
    }
  }
  const y = d.getFullYear()
  return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y) }
}

export function shiftPeriod(kind: PeriodKind, anchor: string, delta: number): string {
  if (kind === 'week') return addDays(anchor, 7 * delta)
  const d = parseDay(anchor)
  if (kind === 'month') return dayKey(new Date(d.getFullYear(), d.getMonth() + delta, 1))
  return dayKey(new Date(d.getFullYear() + delta, 0, 1))
}

export const inRange = (date: string, r: Range) => date >= r.start && date <= r.end

/* ───────── Summaries ───────── */

export interface CategoryTotal {
  categoryId: string
  cents: number
  limitCents?: number // monthly limit scaled to the period
  ratio?: number // cents / limitCents
}

export interface Summary {
  incomeCents: number
  spentCents: number // needs + wants (consumption)
  bucketCents: Record<Bucket, number> // savings = money explicitly put aside
  savedCents: number // income − needs − wants (explicit savings + unspent)
  savingsRate: number | null // savedCents / income (null without income)
  split: Record<Bucket, number> // share of income (or of outflow when there is no income), 0..1
  byCategory: CategoryTotal[]
  count: number
}

/** Scale a monthly limit to the length of a period. */
export function scaleMonthlyLimit(monthlyCents: number, r: Range) {
  const days = daysBetween(r.start, r.end) + 1
  if (days >= 28 && days <= 31) return monthlyCents
  return Math.round((monthlyCents * days) / (365.25 / 12))
}

export function summarize(txns: Transaction[], r: Range, categories: Category[] = []): Summary {
  const bucketCents: Record<Bucket, number> = { need: 0, want: 0, savings: 0 }
  let incomeCents = 0
  const perCat = new Map<string, number>()
  let count = 0
  for (const t of txns) {
    if (!inRange(t.date, r)) continue
    count++
    if (t.kind === 'income') {
      incomeCents += t.amountCents
      continue
    }
    bucketCents[t.bucket ?? 'want'] += t.amountCents
    perCat.set(t.categoryId, (perCat.get(t.categoryId) ?? 0) + t.amountCents)
  }
  const spentCents = bucketCents.need + bucketCents.want
  const savedCents = incomeCents - spentCents
  const base = incomeCents > 0 ? incomeCents : spentCents + bucketCents.savings
  const split: Record<Bucket, number> =
    base > 0
      ? incomeCents > 0
        ? { need: bucketCents.need / base, want: bucketCents.want / base, savings: Math.max(0, savedCents) / base }
        : { need: bucketCents.need / base, want: bucketCents.want / base, savings: bucketCents.savings / base }
      : { need: 0, want: 0, savings: 0 }
  const catById = new Map(categories.map((c) => [c.id, c]))
  const byCategory: CategoryTotal[] = [...perCat.entries()]
    .map(([categoryId, cents]) => {
      const lim = catById.get(categoryId)?.monthlyLimitCents
      const limitCents = lim ? scaleMonthlyLimit(lim, r) : undefined
      return { categoryId, cents, limitCents, ratio: limitCents ? cents / limitCents : undefined }
    })
    .sort((a, b) => b.cents - a.cents)
  return {
    incomeCents,
    spentCents,
    bucketCents,
    savedCents,
    savingsRate: incomeCents > 0 ? savedCents / incomeCents : null,
    split,
    byCategory,
    count,
  }
}

/** A friendly note comparing the actual split to the targets (largest gap wins). */
export function splitAdvice(s: Summary, targets: Record<Bucket, number>): { bucket: Bucket; diffPts: number } | null {
  if (s.incomeCents <= 0) return null
  let worst: { bucket: Bucket; diffPts: number } | null = null
  for (const b of BUCKETS) {
    const diff = Math.round(s.split[b] * 100 - targets[b])
    // For savings, falling short is the problem; for needs/wants, going over is.
    const bad = b === 'savings' ? -diff : diff
    if (bad >= 5 && (!worst || bad > Math.abs(worst.diffPts))) worst = { bucket: b, diffPts: diff }
  }
  return worst
}

/* ───────── Averages for "Use my numbers" ───────── */

export interface MonthlyAverages {
  incomeCents: number
  bucketCents: Record<Bucket, number>
  monthsUsed: number
  partial: boolean // based on the current (incomplete) month only
}

/** Average per month over the last `months` full months that have data; falls back to this month. */
export function monthlyAverages(txns: Transaction[], today: string, months = 3): MonthlyAverages | null {
  if (txns.length === 0) return null
  const ranges: Range[] = []
  for (let i = 1; i <= months; i++) ranges.push(periodRange('month', shiftPeriod('month', today, -i)))
  const full = ranges.map((r) => summarize(txns, r)).filter((s) => s.count > 0)
  const use = full.length > 0 ? full : [summarize(txns, periodRange('month', today))].filter((s) => s.count > 0)
  if (use.length === 0) return null
  const avg = (f: (s: Summary) => number) => Math.round(use.reduce((a, s) => a + f(s), 0) / use.length)
  return {
    incomeCents: avg((s) => s.incomeCents),
    bucketCents: { need: avg((s) => s.bucketCents.need), want: avg((s) => s.bucketCents.want), savings: avg((s) => s.bucketCents.savings) },
    monthsUsed: use.length,
    partial: full.length === 0,
  }
}

/* ───────── Recurring ───────── */

export const CADENCE_LABEL = { weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' } as const

/** Dates (inclusive of from/to) on which a recurring item occurs. Monthly items on the 29th–31st fall on the last day of shorter months. */
export function occurrences(r: Pick<Recurring, 'cadence' | 'startDate' | 'endDate'>, from: string, to: string): string[] {
  const last = r.endDate && r.endDate < to ? r.endDate : to
  const out: string[] = []
  if (r.cadence === 'monthly') {
    const s = parseDay(r.startDate)
    const day = s.getDate()
    for (let i = 0; i < 1200; i++) {
      const y = s.getFullYear() + Math.floor((s.getMonth() + i) / 12)
      const m = (s.getMonth() + i) % 12
      const date = dayKey(new Date(y, m, Math.min(day, lastDayOfMonth(y, m))))
      if (date > last) break
      if (date >= from) out.push(date)
    }
    return out
  }
  const step = r.cadence === 'weekly' ? 7 : 14
  // Jump close to `from` instead of iterating from the start date.
  let date = r.startDate
  if (from > date) date = addDays(date, Math.floor(daysBetween(date, from) / step) * step)
  for (; date <= last; date = addDays(date, step)) if (date >= from && date >= r.startDate) out.push(date)
  return out
}

export const occurrenceId = (recurringId: string, date: string) => `${recurringId}@${date}`

/** Transactions a recurring item should have produced up to `today` that don't exist yet. */
export function missingOccurrences(r: Recurring, existingIds: Set<string>, today: string, now = Date.now()): Transaction[] {
  if (r.paused) return []
  const skipped = new Set(r.skipped ?? [])
  return occurrences(r, r.startDate, today)
    .filter((d) => !skipped.has(d) && !existingIds.has(occurrenceId(r.id, d)))
    .map((date) => ({
      id: occurrenceId(r.id, date),
      date,
      amountCents: r.amountCents,
      kind: r.kind,
      categoryId: r.categoryId,
      bucket: r.kind === 'expense' ? r.bucket : undefined,
      note: r.note,
      recurringId: r.id,
      createdAt: now,
    }))
}

/** Normalize targets so they are non-negative integers that add up to exactly 100. */
export function normalizeTargets(t: Record<Bucket, number>, changed?: Bucket): Record<Bucket, number> {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
  const out = { need: clamp(t.need), want: clamp(t.want), savings: clamp(t.savings) }
  const others = BUCKETS.filter((b) => b !== changed)
  let diff = 100 - (out.need + out.want + out.savings)
  // Distribute the difference across the buckets the user didn't just change.
  for (const b of others.length ? others : BUCKETS) {
    if (diff === 0) break
    const next = clamp(out[b] + diff)
    diff -= next - out[b]
    out[b] = next
  }
  return out
}
