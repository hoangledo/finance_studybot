import { useCallback, useEffect, useRef, useState } from 'react'
import { recordCombo, reviewCard, undoReview } from '../../db/actions'
import { db } from '../../db/db'
import { XP } from '../../lib/gamify'
import { Rating, type Grade } from '../../lib/srs'
import type { StudyCard } from '../../types'
import type { Mood } from '../../components/mascot/Cappy'
import { burst } from '../gamify/fx'
import { play } from '../gamify/sounds'

const SESSION_CAP = 40
const MOOD_FOR: Record<number, Mood> = { 1: 'oops', 2: 'think', 3: 'happy', 4: 'cheer' }

export interface SessionStats {
  done: number
  correct: number
  combo: number
  best: number
  xp: number
}

const EMPTY: SessionStats = { done: 0, correct: 0, combo: 0, best: 0, xp: 0 }

interface UndoEntry {
  card: StudyCard // card as it was before rating (previous schedule)
  logId: number
  queue: StudyCard[]
  stats: SessionStats
}

/** Shared review-session state for classic and swipe modes. */
export function useReviewSession() {
  const [queue, setQueue] = useState<StudyCard[] | null>(null)
  const [stats, setStats] = useState<SessionStats>(EMPTY)
  const [mode, setMode] = useState<'due' | 'ahead'>('due')
  const [mood, setMood] = useState<Mood>('idle')
  const [last, setLast] = useState<UndoEntry | null>(null)
  const undone = useRef(new Set<string>()) // re-rating an undone card earns no XP
  const busy = useRef(false)

  const loadQueue = useCallback(async (m: 'due' | 'ahead') => {
    const all = await db.cards.filter((c) => !c.locked).toArray()
    const cutoff = m === 'due' ? Date.now() : Date.now() + 3 * 86_400_000
    const due = all
      .filter((c) => new Date(c.fsrs.due).getTime() <= cutoff)
      .sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime())
      .slice(0, SESSION_CAP)
    setMode(m)
    setQueue(due)
    setStats(EMPTY)
    setLast(null)
  }, [])

  useEffect(() => {
    loadQueue('due')
  }, [loadQueue])

  const rate = async (card: StudyCard, g: Grade) => {
    if (busy.current || !queue) return
    busy.current = true
    try {
      const earnsXp = !undone.current.has(card.id)
      const { next, logId } = await reviewCard(card, g, { xp: earnsXp })
      const correct = g >= Rating.Good
      setMood(MOOD_FOR[g])
      play(correct ? 'correct' : g === Rating.Again ? 'wrong' : 'tap')
      setLast({ card, logId, queue, stats })
      setStats((s) => {
        const combo = correct ? s.combo + 1 : 0
        if (combo > 0 && combo % 5 === 0) burst(0.4)
        if (combo > s.best) recordCombo(combo)
        return {
          done: s.done + 1,
          correct: s.correct + (correct ? 1 : 0),
          combo,
          best: Math.max(s.best, combo),
          xp: s.xp + (earnsXp ? (XP.review[g] ?? 5) : 0),
        }
      })
      setQueue((q) => {
        if (!q) return q
        const rest = q.slice(1)
        // "Again" cards due within this session come back at the end.
        if (next.due.getTime() - Date.now() < 15 * 60_000) return [...rest, { ...card, fsrs: next }]
        return rest
      })
    } finally {
      busy.current = false
    }
  }

  const undo = async () => {
    if (!last || busy.current) return
    busy.current = true
    try {
      await undoReview(last.card, last.logId)
      undone.current.add(last.card.id)
      setQueue(last.queue)
      setStats(last.stats)
      setMood('think')
      setLast(null)
      play('flip')
    } finally {
      busy.current = false
    }
  }

  return { queue, stats, mode, mood, loadQueue, rate, undo, canUndo: !!last }
}
