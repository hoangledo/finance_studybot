import type { Profile } from '../types'
import { daysBetween, weekKey } from './dates'

export const XP = {
  review: { 1: 2, 2: 4, 3: 5, 4: 6 } as Record<number, number>,
  lessonBase: 40,
  lessonPerCorrect: 5,
  comboBonus: 2, // extra XP per combo step in lessons, capped
  comboCap: 5,
  addConcept: 15,
  mission: 30,
} as const

export const MAX_FREEZES = 2

/** XP needed to go from level n to n+1 grows linearly: 100, 150, 200, ... */
export function xpForLevel(n: number) {
  return 100 + (n - 1) * 50
}

export function levelFromXp(xp: number) {
  let level = 1
  let remaining = xp
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level++
  }
  return { level, into: remaining, needed: xpForLevel(level) }
}

const TITLES: [number, string][] = [
  [1, 'Broke Student'],
  [2, 'Budgeter'],
  [3, 'Saver'],
  [4, 'Debt Slayer'],
  [5, 'Emergency-Ready'],
  [6, 'Match Maker'],
  [7, 'Roth Rookie'],
  [8, 'Index Investor'],
  [10, 'Three-Fund Pro'],
  [12, 'Boglehead'],
  [15, 'Tax Ninja'],
  [18, 'Rebalancer'],
  [22, 'FI Sage'],
]

export function titleForLevel(level: number) {
  let t = TITLES[0][1]
  for (const [lvl, name] of TITLES) if (level >= lvl) t = name
  return t
}

export interface ActivityResult {
  profile: Profile
  leveledUp: number | null
  streakExtended: boolean
  freezesUsed: number
}

/**
 * Record XP earned on `today` and roll the streak forward.
 * - Same day: streak unchanged.
 * - Next day: streak + 1.
 * - Missed days that can be covered by stored freezes: consume them, streak + 1.
 * - Otherwise: streak resets to 1.
 * One freeze is granted per calendar week (max MAX_FREEZES stored).
 */
export function applyActivity(p: Profile, today: string, xp: number): ActivityResult {
  const next: Profile = { ...p }
  const beforeLevel = levelFromXp(p.xp).level
  next.xp = p.xp + xp

  const wk = weekKey(today)
  if (next.lastFreezeWeek !== wk) {
    next.freezes = Math.min(MAX_FREEZES, next.freezes + 1)
    next.lastFreezeWeek = wk
  }

  let streakExtended = false
  let freezesUsed = 0
  if (next.lastActiveDay !== today) {
    if (!next.lastActiveDay) {
      next.streak = 1
    } else {
      const gap = daysBetween(next.lastActiveDay, today)
      const missed = gap - 1
      if (gap <= 0) {
        // clock moved backwards; keep streak
      } else if (missed === 0) {
        next.streak += 1
      } else if (missed <= next.freezes) {
        next.freezes -= missed
        freezesUsed = missed
        next.streak += 1
      } else {
        next.streak = 1
      }
    }
    streakExtended = true
    next.lastActiveDay = today
    next.bestStreak = Math.max(next.bestStreak, next.streak)
  }

  const afterLevel = levelFromXp(next.xp).level
  return { profile: next, leveledUp: afterLevel > beforeLevel ? afterLevel : null, streakExtended, freezesUsed }
}

/** Streak as it should be displayed right now (it's "broken" if yesterday was missed and no freezes cover it). */
export function liveStreak(p: Profile, today: string) {
  if (!p.lastActiveDay) return 0
  const missed = daysBetween(p.lastActiveDay, today) - 1
  if (missed <= 0) return p.streak
  return missed <= p.freezes ? p.streak : 0
}
