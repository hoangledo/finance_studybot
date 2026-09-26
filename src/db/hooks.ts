import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { dayKey } from '../lib/dates'
import { dailyQuests, type QuestInputs } from '../lib/quests'
import type { ActivityDay } from '../types'
import { db, DEFAULT_PROFILE } from './db'

export function useProfile() {
  const p = useLiveQuery(() => db.profile.get('me'), [])
  // Older saves predate some fields (e.g. avatar) — fill them from defaults.
  return p ? { ...DEFAULT_PROFILE, ...p, avatar: { ...DEFAULT_PROFILE.avatar, ...p.avatar } } : DEFAULT_PROFILE
}

export function useToday(): ActivityDay {
  const today = dayKey()
  return useLiveQuery(() => db.activity.get(today), [today]) ?? { day: today, xp: 0, reviews: 0 }
}

/** Today's quests plus the inputs that drive their progress. */
export function useQuests() {
  const profile = useProfile()
  const today = useToday()
  const start = startOfToday()
  const extra = useLiveQuery(async () => {
    const lessons = await db.lessonProgress.filter((l) => l.completedAt >= start).count()
    const concepts = await db.concepts.filter((c) => !c.isSeed && c.createdAt >= start).count()
    return { lessons, concepts }
  }, [start]) ?? { lessons: 0, concepts: 0 }
  const quests = dailyQuests(today.day, profile.dailyGoal)
  const inputs: QuestInputs = {
    xp: today.xp,
    reviews: today.reviews,
    lessons: extra.lessons,
    maxCombo: today.maxCombo ?? 0,
    concepts: extra.concepts,
    tools: today.toolsUsed ?? 0,
  }
  return { quests, inputs, claimed: !!today.questClaimed }
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function useConcepts() {
  return useLiveQuery(() => db.concepts.toArray(), [])
}

export function useEdges() {
  return useLiveQuery(() => db.edges.toArray(), [])
}

export function useCards() {
  return useLiveQuery(() => db.cards.toArray(), [])
}

export function useLessonProgress() {
  return useLiveQuery(async () => {
    const rows = await db.lessonProgress.toArray()
    return Object.fromEntries(rows.map((r) => [r.lessonId, r]))
  }, [])
}

/** Re-render every minute so "due" cards appear without a reload. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function useDueCount() {
  const now = useNow()
  return (
    useLiveQuery(
      () =>
        db.cards
          .filter((c) => !c.locked && new Date(c.fsrs.due) <= now)
          .count(),
      [now.getTime()],
    ) ?? 0
  )
}
