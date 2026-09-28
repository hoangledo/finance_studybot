import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, earnedAchievements, type Stats } from './achievements'
import { gatherStats } from '../db/achievementActions'
import { FinDB } from '../db/db'
import { ensureSeeded } from '../db/seed'

const zero: Stats = {
  lessonsDone: 0,
  lessonsTotal: 26,
  unitsDone: 0,
  level: 1,
  bestStreak: 0,
  reviews: 0,
  cardsMastered: 0,
  conceptsStarted: 0,
  conceptsAdded: 0,
  transactions: 0,
  monthsTracked: 0,
  bestMonthSavingsRate: 0,
  missionsDone: 0,
  missionsTotal: 12,
  simRuns: 0,
  simBestGrade: null,
}

describe('achievements', () => {
  it('have unique ids and nothing is earned at the start', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    expect(earnedAchievements(zero)).toEqual([])
  })

  it('unlock at their thresholds', () => {
    expect(earnedAchievements({ ...zero, lessonsDone: 1 })).toContain('first-lesson')
    expect(earnedAchievements({ ...zero, bestStreak: 7 })).toContain('streak-7')
    expect(earnedAchievements({ ...zero, bestStreak: 7 })).not.toContain('streak-30')
    expect(earnedAchievements({ ...zero, bestMonthSavingsRate: 0.2 })).toContain('saver-20')
    expect(earnedAchievements({ ...zero, simRuns: 1, simBestGrade: 'A' })).toEqual(expect.arrayContaining(['sim-played', 'sim-a']))
    expect(earnedAchievements({ ...zero, lessonsDone: 26 })).toEqual(expect.arrayContaining(['halfway', 'path-complete']))
  })

  it('gathers stats from the database', async () => {
    const db = new FinDB('ach-' + Math.random())
    await ensureSeeded(db)
    await db.lessonProgress.put({ lessonId: 'l-budget', bestScore: 1, completedAt: 1 })
    await db.transactions.bulkPut([
      { id: 't1', date: '2026-08-01', amountCents: 400000, kind: 'income', categoryId: 'cat-salary', note: '', createdAt: 1 },
      { id: 't2', date: '2026-08-02', amountCents: 200000, kind: 'expense', bucket: 'need', categoryId: 'cat-rent', note: '', createdAt: 1 },
    ])
    await db.missionProgress.put({ missionId: 'open-hysa', stepsDone: [0, 1, 2, 3], startedAt: 1, completedAt: 2 })
    const s = await gatherStats(db)
    expect(s.lessonsDone).toBe(1)
    expect(s.transactions).toBe(2)
    expect(s.monthsTracked).toBe(1)
    expect(s.bestMonthSavingsRate).toBeCloseTo(0.5)
    expect(s.missionsDone).toBe(1)
    expect(earnedAchievements(s)).toEqual(expect.arrayContaining(['first-lesson', 'first-entry', 'saver-20', 'mission-1']))
  })
})
