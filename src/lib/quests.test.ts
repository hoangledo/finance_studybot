import { describe, expect, it } from 'vitest'
import { canClaimChest, dailyQuests, questProgress, questsDone, type QuestInputs } from './quests'
import { isUnlocked, ACCESSORIES, streakUnlocksBetween, unlocksBetween } from '../features/avatar/parts'

const none: QuestInputs = { xp: 0, reviews: 0, lessons: 0, maxCombo: 0, concepts: 0, tools: 0, txns: 0 }

describe('daily quests', () => {
  it('are stable for a day and have three distinct kinds with XP first', () => {
    const a = dailyQuests('2026-09-26', 50)
    expect(dailyQuests('2026-09-26', 50)).toEqual(a)
    expect(a).toHaveLength(3)
    expect(a[0].kind).toBe('xp')
    expect(a[0].target).toBe(50)
    expect(new Set(a.map((q) => q.kind)).size).toBe(3)
  })

  it('rotate across days', () => {
    const kinds = new Set<string>()
    for (let d = 1; d <= 28; d++) dailyQuests(`2026-10-${String(d).padStart(2, '0')}`, 50).slice(1).forEach((q) => kinds.add(q.kind))
    expect(kinds.size).toBeGreaterThanOrEqual(4)
  })

  it('includes the money-logging quest in the rotation', () => {
    const kinds = new Set<string>()
    for (let d = 1; d <= 60; d++) dailyQuests(`2026-${String(10 + Math.floor((d - 1) / 30)).padStart(2, '0')}-${String(((d - 1) % 28) + 1).padStart(2, '0')}`, 50).forEach((q) => kinds.add(q.kind))
    expect(kinds.has('money')).toBe(true)
  })

  it('tracks progress and allows the chest only once all are done and unclaimed', () => {
    const qs = dailyQuests('2026-09-26', 30)
    expect(questsDone(qs, none)).toBe(0)
    const all: QuestInputs = { xp: 999, reviews: 99, lessons: 5, maxCombo: 9, concepts: 2, tools: 3, txns: 1 }
    expect(questProgress(qs[0], all)).toBe(qs[0].target) // clamped
    expect(canClaimChest(qs, all, false)).toBe(true)
    expect(canClaimChest(qs, all, true)).toBe(false)
    expect(canClaimChest(qs, { ...all, xp: 1 }, false)).toBe(false)
  })
})

describe('avatar unlocks', () => {
  it('returns exactly the level unlocks crossed', () => {
    expect(unlocksBetween(1, 2).map((a) => a.id)).toEqual(['cap'])
    expect(unlocksBetween(4, 8).map((a) => a.id)).toEqual(['beanie', 'headphones', 'sunglasses'])
    expect(unlocksBetween(5, 6)).toEqual([])
    expect(streakUnlocksBetween(6, 7).map((a) => a.id)).toEqual(['party'])
  })

  it('gates by level and streak', () => {
    const crown = ACCESSORIES.find((a) => a.id === 'crown')!
    const halo = ACCESSORIES.find((a) => a.id === 'halo')!
    expect(isUnlocked(crown, 14, 100)).toBe(false)
    expect(isUnlocked(crown, 15, 0)).toBe(true)
    expect(isUnlocked(halo, 99, 29)).toBe(false)
    expect(isUnlocked(halo, 1, 30)).toBe(true)
  })
})
