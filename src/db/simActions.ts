import { burst, toast } from '../features/gamify/fx'
import { play } from '../features/gamify/sounds'
import { dayKey } from '../lib/dates'
import { uid } from '../lib/id'
import type { SimResult } from '../lib/sim'
import { awardXp } from './actions'
import { scheduleAchievementCheck } from './achievementActions'
import { db } from './db'

export const SIM_DAILY_XP = 20

/** Save a finished run. XP is awarded once per day so the game can't be farmed; returns the XP given. */
export async function saveSimRun(seed: number, r: SimResult): Promise<{ xp: number; best: boolean }> {
  const today = dayKey()
  const { playedToday, best } = await db.transaction('rw', db.simRuns, async () => {
    const runs = await db.simRuns.toArray()
    const playedToday = runs.some((x) => dayKey(new Date(x.finishedAt)) === today)
    const best = runs.every((x) => r.score > x.score)
    await db.simRuns.put({ id: uid('sim-'), seed, score: r.score, grade: r.grade, netWorthCents: Math.round(r.netWorth * 100), finishedAt: Date.now() })
    return { playedToday, best }
  })
  play(r.grade === 'A' || r.grade === 'B' ? 'levelup' : 'correct')
  if (r.grade === 'A' || best) burst(r.grade === 'A' ? 1.2 : 0.8)
  if (best) toast({ kind: 'level', title: '🏆 New best score!', body: `${r.score} points · grade ${r.grade}` })
  if (!playedToday) {
    await awardXp(SIM_DAILY_XP)
    return { xp: SIM_DAILY_XP, best }
  }
  scheduleAchievementCheck()
  return { xp: 0, best }
}
