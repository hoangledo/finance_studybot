import type { Card as FsrsCard } from 'ts-fsrs'
import type { AvatarConfig } from './features/avatar/parts'

export type Domain =
  | 'budgeting'
  | 'emergency'
  | 'debt'
  | 'credit'
  | 'accounts'
  | 'tax'
  | 'investing'
  | 'bogleheads'
  | 'retirement'
  | 'insurance'

export interface Concept {
  id: string
  title: string
  summary: string // markdown
  domain: Domain
  tags: string[]
  sourceUrls: string[]
  isSeed: boolean
  createdAt: number
}

export type EdgeType = 'prereq' | 'partOf' | 'related' | 'contrasts' | 'example'

export interface Edge {
  id: string
  from: string
  to: string
  type: EdgeType
}

export type CardType = 'basic' | 'reverse' | 'cloze' | 'mcq'

export interface StudyCard {
  id: string
  conceptId: string
  type: CardType
  front: string
  back: string
  /** Only for type 'mcq': answer choices and the index of the correct one. `back` holds the explanation. */
  options?: string[]
  answer?: number
  fsrs: FsrsCard
  /** Seed cards stay locked until their lesson is finished (or you start them manually). */
  locked: boolean
  isSeed: boolean
  createdAt: number
}

export interface ReviewLog {
  id?: number
  cardId: string
  rating: number
  ts: number
}

export interface LessonProgress {
  lessonId: string
  bestScore: number // 0..1
  completedAt: number
}

export interface ActivityDay {
  day: string // YYYY-MM-DD (local)
  xp: number
  reviews: number
  maxCombo?: number
  toolsUsed?: number
  questClaimed?: boolean
}

export interface Profile {
  id: 'me'
  xp: number
  streak: number
  bestStreak: number
  lastActiveDay: string | null
  freezes: number
  lastFreezeWeek: string | null
  dailyGoal: number
  onboarded: boolean
  avatar: AvatarConfig
}

/* ---------- Lessons (static content) ---------- */

export type WidgetId = 'compound' | 'fees' | 'rothTrad' | 'debt' | 'fire' | 'budget'

export type LessonStep =
  | { kind: 'read'; title: string; body: string }
  | { kind: 'widget'; widget: WidgetId; title: string; caption: string }
  | { kind: 'mcq'; q: string; options: string[]; answer: number; explain: string }
  | { kind: 'tf'; q: string; answer: boolean; explain: string }
  | { kind: 'rank'; prompt: string; items: string[]; explain: string } // items in correct order

export interface Lesson {
  id: string
  unit: string
  title: string
  icon: string // emoji
  blurb: string
  requires: string[]
  conceptIds: string[]
  steps: LessonStep[]
}
