import { MISSION_BY_ID } from '../content/missions'
import { burst, toast } from '../features/gamify/fx'
import { play } from '../features/gamify/sounds'
import { awardXp } from './actions'
import { db } from './db'

/** Tick or untick one step of a mission. */
export async function toggleMissionStep(missionId: string, step: number) {
  await db.transaction('rw', db.missionProgress, async () => {
    const p = (await db.missionProgress.get(missionId)) ?? { missionId, stepsDone: [], startedAt: Date.now() }
    if (p.completedAt) return // finished missions are locked in
    const done = new Set(p.stepsDone)
    if (done.has(step)) done.delete(step)
    else done.add(step)
    await db.missionProgress.put({ ...p, stepsDone: [...done].sort((a, b) => a - b) })
  })
}

/** Complete a mission once all steps are ticked: XP, confetti and a toast (only the first time). */
export async function completeMission(missionId: string) {
  const m = MISSION_BY_ID[missionId]
  if (!m) return false
  const done = await db.transaction('rw', db.missionProgress, async () => {
    const p = await db.missionProgress.get(missionId)
    if (!p || p.completedAt || p.stepsDone.length < m.steps.length) return false
    await db.missionProgress.put({ ...p, completedAt: Date.now() })
    return true
  })
  if (!done) return false
  play('levelup')
  burst(1)
  toast({ kind: 'level', title: `${m.emoji} Mission complete!`, body: m.title })
  await awardXp(m.xp)
  return true
}
