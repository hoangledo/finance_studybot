import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_AVATAR } from '../features/avatar/parts'
import type { ActivityDay, Concept, Edge, LessonProgress, Profile, ReviewLog, StudyCard } from '../types'

export class FinDB extends Dexie {
  concepts!: EntityTable<Concept, 'id'>
  edges!: EntityTable<Edge, 'id'>
  cards!: EntityTable<StudyCard, 'id'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>
  activity!: EntityTable<ActivityDay, 'day'>
  profile!: EntityTable<Profile, 'id'>
  meta!: EntityTable<{ key: string; value: unknown }, 'key'>

  constructor(name = 'finquest') {
    super(name)
    this.version(1).stores({
      concepts: 'id, domain, isSeed, createdAt',
      edges: 'id, from, to',
      cards: 'id, conceptId, locked',
      reviewLogs: '++id, cardId, ts',
      lessonProgress: 'lessonId',
      activity: 'day',
      profile: 'id',
      meta: 'key',
    })
  }
}

export const db = new FinDB()

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  freezes: 0,
  lastFreezeWeek: null,
  dailyGoal: 50,
  onboarded: false,
  avatar: DEFAULT_AVATAR,
}
