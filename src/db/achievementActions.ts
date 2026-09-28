import { ACHIEVEMENT_BY_ID, earnedAchievements, type Stats } from '../content/achievements'
import { LESSONS, UNITS } from '../content/lessons'
import { MISSIONS } from '../content/missions'
import { periodRange, summarize } from '../lib/budget'
import { levelFromXp } from '../lib/gamify'
import { cardScore } from '../lib/mastery'
import { burst, toast } from '../features/gamify/fx'
import { play } from '../features/gamify/sounds'
import { db, DEFAULT_PROFILE, type FinDB } from './db'

/** Snapshot of everything badges can depend on. */
export async function gatherStats(d: FinDB = db): Promise<Stats> {
  const [profile, progress, cards, reviews, concepts, txns, missions, sims] = await Promise.all([
    d.profile.get('me'),
    d.lessonProgress.toArray(),
    d.cards.toArray(),
    d.reviewLogs.count(),
    d.concepts.toArray(),
    d.transactions.toArray(),
    d.missionProgress.toArray(),
    d.simRuns.toArray(),
  ])
  const done = new Set(progress.map((p) => p.lessonId))
  const unitsDone = UNITS.filter((u) => LESSONS.filter((l) => l.unit === u.id).every((l) => done.has(l.id))).length
  const startedConcepts = new Set(cards.filter((c) => !c.locked).map((c) => c.conceptId))
  const months = [...new Set(txns.map((t) => t.date.slice(0, 7)))]
  const bestMonthSavingsRate = Math.max(0, ...months.map((m) => summarize(txns, periodRange('month', `${m}-01`)).savingsRate ?? 0))
  const grades = sims.map((s) => s.grade).sort()
  return {
    lessonsDone: done.size,
    lessonsTotal: LESSONS.length,
    unitsDone,
    level: levelFromXp((profile ?? DEFAULT_PROFILE).xp).level,
    bestStreak: (profile ?? DEFAULT_PROFILE).bestStreak,
    reviews,
    cardsMastered: cards.filter((c) => cardScore(c) >= 1).length,
    conceptsStarted: startedConcepts.size,
    conceptsAdded: concepts.filter((c) => !c.isSeed).length,
    transactions: txns.length,
    monthsTracked: months.length,
    bestMonthSavingsRate,
    missionsDone: missions.filter((m) => m.completedAt).length,
    missionsTotal: MISSIONS.length,
    simRuns: sims.length,
    simBestGrade: grades[0] ?? null,
  }
}

/** Unlock any newly earned badges and celebrate them. Returns the new ids. */
export async function checkAchievements(): Promise<string[]> {
  const stats = await gatherStats()
  const earned = earnedAchievements(stats)
  const have = new Set((await db.achievements.toCollection().primaryKeys()) as string[])
  const fresh = earned.filter((id) => !have.has(id))
  if (fresh.length === 0) return []
  const now = Date.now()
  await db.achievements.bulkPut(fresh.map((id) => ({ id, unlockedAt: now })))
  play('chest')
  burst(0.5)
  for (const id of fresh.slice(0, 3)) {
    const a = ACHIEVEMENT_BY_ID[id]
    toast({ kind: 'level', title: `${a.emoji} Badge unlocked: ${a.title}`, body: a.hint })
  }
  if (fresh.length > 3) toast({ kind: 'level', title: `🏅 +${fresh.length - 3} more badges`, body: 'See them on your Profile.' })
  return fresh
}

let timer: ReturnType<typeof setTimeout> | null = null
/** Debounced check — call after anything that might earn a badge. */
export function scheduleAchievementCheck(delay = 800) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    checkAchievements().catch(() => {})
  }, delay)
}
