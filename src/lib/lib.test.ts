import { describe, expect, it } from 'vitest'
import { feeDrag, futureValue, loanPayment, payoffPlan, rothVsTraditional, yearsToFI } from './finance'
import { applyActivity, levelFromXp, liveStreak } from './gamify'
import { addDays, daysBetween, weekKey } from './dates'
import { newFsrsCard, rate, Rating } from './srs'
import { conceptMastery } from './mastery'
import type { Profile, StudyCard } from '../types'

describe('finance math', () => {
  it('compounds a lump sum', () => {
    // $10k at 12%/yr compounded monthly for 1 year = 10000 * 1.01^12
    expect(futureValue(10_000, 0, 0.12, 1)).toBeCloseTo(10_000 * Math.pow(1.01, 12), 2)
  })

  it('adds monthly contributions', () => {
    expect(futureValue(0, 100, 0, 10)).toBeCloseTo(12_000, 6)
  })

  it('shows a 1% fee costs a big chunk over 30 years', () => {
    const { lost } = feeDrag(100_000, 0, 0.07, 0.01, 30)
    expect(lost).toBeGreaterThan(150_000)
    expect(lost).toBeLessThan(250_000)
  })

  it('Roth and Traditional tie when tax rates are equal', () => {
    const r = rothVsTraditional(6_000, 0.07, 30, 0.22, 0.22)
    expect(r.roth).toBeCloseTo(r.traditional, 6)
    expect(rothVsTraditional(6_000, 0.07, 30, 0.12, 0.22).winner).toBe('roth')
    expect(rothVsTraditional(6_000, 0.07, 30, 0.32, 0.12).winner).toBe('traditional')
  })

  it('computes a standard mortgage payment', () => {
    // $300k, 6%, 30y ≈ $1,798.65
    expect(loanPayment(300_000, 0.06, 360)).toBeCloseTo(1798.65, 1)
  })

  it('avalanche never pays more interest than snowball', () => {
    const debts = [
      { name: 'Card A', balance: 5_000, rate: 0.24, minPayment: 100 },
      { name: 'Car', balance: 2_000, rate: 0.05, minPayment: 60 },
      { name: 'Card B', balance: 1_000, rate: 0.18, minPayment: 40 },
    ]
    const av = payoffPlan(debts, 600, 'avalanche')
    const sb = payoffPlan(debts, 600, 'snowball')
    expect(av.feasible && sb.feasible).toBe(true)
    expect(av.totalInterest).toBeLessThanOrEqual(sb.totalInterest)
    expect(sb.order[0]).toBe('Card B')
    expect(av.order[0]).toBe('Card A')
  })

  it('flags a budget below the minimums as infeasible', () => {
    expect(payoffPlan([{ name: 'x', balance: 1000, rate: 0.2, minPayment: 50 }], 40, 'avalanche').feasible).toBe(false)
  })

  it('matches the classic 50% savings rate ≈ 17 years to FI', () => {
    const y = yearsToFI(100_000, 0.5, 0.05, 0.04)
    expect(y).toBeGreaterThan(16)
    expect(y).toBeLessThan(17.5)
  })
})

describe('dates', () => {
  it('handles day math and weeks', () => {
    expect(daysBetween('2026-09-26', '2026-09-28')).toBe(2)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(weekKey('2026-09-27')).toBe('2026-09-21') // Sunday → Monday of that week
  })
})

const baseProfile: Profile = {
  id: 'me',
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  freezes: 0,
  lastFreezeWeek: null,
  dailyGoal: 50,
  onboarded: true,
  avatar: { animal: 'fox', color: 'sky', accessory: 'none' },
}

describe('gamification', () => {
  it('levels up at 100 XP', () => {
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(250).level).toBe(3)
    expect(applyActivity(baseProfile, '2026-09-21', 120).leveledUp).toBe(2)
  })

  it('extends streak on consecutive days, not on the same day', () => {
    let p = applyActivity(baseProfile, '2026-09-21', 10).profile
    expect(p.streak).toBe(1)
    p = applyActivity(p, '2026-09-21', 10).profile
    expect(p.streak).toBe(1)
    p = applyActivity(p, '2026-09-22', 10).profile
    expect(p.streak).toBe(2)
  })

  it('uses a freeze to cover one missed day', () => {
    let p = applyActivity(baseProfile, '2026-09-21', 10).profile // Monday: +1 freeze
    expect(p.freezes).toBe(1)
    const r = applyActivity(p, '2026-09-23', 10) // missed Tuesday
    expect(r.freezesUsed).toBe(1)
    expect(r.profile.streak).toBe(2)
    expect(r.profile.freezes).toBe(0)
    p = applyActivity(r.profile, '2026-09-26', 10).profile // missed 2 days, no freezes
    expect(p.streak).toBe(1)
    expect(p.bestStreak).toBe(2)
  })

  it('shows a broken streak as 0 before the user acts', () => {
    const p = { ...baseProfile, streak: 5, lastActiveDay: '2026-09-20', freezes: 0 }
    expect(liveStreak(p, '2026-09-21')).toBe(5)
    expect(liveStreak(p, '2026-09-23')).toBe(0)
  })
})

describe('srs + mastery', () => {
  it('a Good rating pushes the due date forward', () => {
    const now = new Date('2026-09-26T10:00:00')
    const c = newFsrsCard(now)
    const after = rate(c, Rating.Good, now)
    expect(after.due.getTime()).toBeGreaterThan(now.getTime())
    expect(after.reps).toBe(1)
  })

  it('classifies concept mastery', () => {
    const now = new Date('2026-09-26T10:00:00')
    const mk = (over: Partial<StudyCard>): StudyCard => ({
      id: 'x',
      conceptId: 'c',
      type: 'basic',
      front: '',
      back: '',
      fsrs: newFsrsCard(now),
      locked: false,
      isSeed: true,
      createdAt: 0,
      ...over,
    })
    expect(conceptMastery([mk({ locked: true })]).level).toBe('locked')
    expect(conceptMastery([mk({})]).level).toBe('new')
    const strong = { ...newFsrsCard(now), state: 2, stability: 40 }
    expect(conceptMastery([mk({ fsrs: strong })]).level).toBe('mastered')
  })
})
