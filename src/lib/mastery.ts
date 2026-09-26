import { State } from 'ts-fsrs'
import type { StudyCard } from '../types'

export type MasteryLevel = 'locked' | 'new' | 'learning' | 'familiar' | 'mastered'

/** A card counts as fully mastered once its memory stability reaches ~3 weeks. */
const MASTERED_STABILITY_DAYS = 21

export function cardScore(c: StudyCard) {
  if (c.locked || c.fsrs.state === State.New) return 0
  return Math.min(1, c.fsrs.stability / MASTERED_STABILITY_DAYS)
}

export function conceptMastery(cards: StudyCard[]): { level: MasteryLevel; score: number } {
  const active = cards.filter((c) => !c.locked)
  if (active.length === 0) return { level: 'locked', score: 0 }
  const reviewed = active.filter((c) => c.fsrs.state !== State.New)
  if (reviewed.length === 0) return { level: 'new', score: 0 }
  const score = active.reduce((s, c) => s + cardScore(c), 0) / active.length
  const level: MasteryLevel = score >= 0.7 ? 'mastered' : score >= 0.3 ? 'familiar' : 'learning'
  return { level, score }
}

export const MASTERY_STYLE: Record<MasteryLevel, { label: string; color: string; ring: string }> = {
  locked: { label: 'Not started', color: '#a9b0b6', ring: 'rgba(169,176,182,0.35)' },
  new: { label: 'Unlocked', color: '#4cb8ff', ring: 'rgba(76,184,255,0.35)' },
  learning: { label: 'Learning', color: '#ff7a45', ring: 'rgba(255,122,69,0.35)' },
  familiar: { label: 'Familiar', color: '#ffc93c', ring: 'rgba(255,201,60,0.4)' },
  mastered: { label: 'Mastered', color: '#1ed39a', ring: 'rgba(30,211,154,0.4)' },
}
