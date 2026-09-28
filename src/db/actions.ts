import type { Grade } from 'ts-fsrs'
import { LESSON_BY_ID } from '../content/lessons'
import { dayKey } from '../lib/dates'
import { applyActivity, levelFromXp, XP } from '../lib/gamify'
import { QUEST_BONUS_XP } from '../lib/quests'
import { slugify, uid } from '../lib/id'
import { newFsrsCard, rate } from '../lib/srs'
import { streakUnlocksBetween, unlocksBetween } from '../features/avatar/parts'
import { burst, toast, useFx } from '../features/gamify/fx'
import { play } from '../features/gamify/sounds'
import { scheduleAchievementCheck } from './achievementActions'
import type { ActivityDay, CardType, Concept, Domain, EdgeType, StudyCard } from '../types'
import { db, DEFAULT_PROFILE } from './db'

/* ───────────── XP / streak ───────────── */

export async function awardXp(amount: number, opts: { review?: boolean; silent?: boolean } = {}) {
  const today = dayKey()
  const result = await db.transaction('rw', db.profile, db.activity, async () => {
    const p = (await db.profile.get('me')) ?? DEFAULT_PROFILE
    const r = applyActivity(p, today, amount)
    await db.profile.put(r.profile)
    const day = (await db.activity.get(today)) ?? { day: today, xp: 0, reviews: 0 }
    const before = day.xp
    day.xp += amount
    if (opts.review) day.reviews += 1
    await db.activity.put(day)
    return {
      ...r,
      prevLevel: levelFromXp(p.xp).level,
      prevBest: p.bestStreak,
      goalHit: before < r.profile.dailyGoal && day.xp >= r.profile.dailyGoal,
    }
  })

  const fx = useFx.getState()
  if (!opts.silent && amount > 0) toast({ kind: 'xp', title: `+${amount} XP` })
  if (result.freezesUsed > 0)
    toast({ kind: 'streak', title: '🧊 Streak freeze used', body: `Your ${result.profile.streak}-day streak survived.` })
  if (result.streakExtended) {
    // First XP of the day: celebrate the streak — but don't interrupt a review session.
    if (opts.review) {
      if (result.profile.streak > 1) toast({ kind: 'streak', title: `🔥 ${result.profile.streak}-day streak!` })
    } else fx.showStreak(result.profile.streak)
  }
  if (result.goalHit) {
    toast({ kind: 'goal', title: '🎯 Daily goal complete!', body: 'Cappy is doing a happy dance.' })
    burst(0.6)
  }
  const streakUnlocks = streakUnlocksBetween(result.prevBest, result.profile.bestStreak).map((a) => a.id)
  if (result.leveledUp) {
    play('levelup')
    fx.showLevelUp(result.leveledUp, [...unlocksBetween(result.prevLevel, result.leveledUp).map((a) => a.id), ...streakUnlocks])
  } else if (streakUnlocks.length) {
    toast({ kind: 'level', title: '🎁 New avatar item unlocked!', body: 'Check your profile.' })
  }
  scheduleAchievementCheck()
  return result
}

async function patchToday(fn: (d: ActivityDay) => ActivityDay) {
  const today = dayKey()
  await db.transaction('rw', db.activity, async () => {
    const day = (await db.activity.get(today)) ?? { day: today, xp: 0, reviews: 0 }
    await db.activity.put(fn(day))
  })
}

/** Track the best combo of the day (for the combo quest). */
export function recordCombo(n: number) {
  return patchToday((d) => ((d.maxCombo ?? 0) >= n ? d : { ...d, maxCombo: n }))
}

/** Count Money Lab tool uses (for the tool quest). */
export function recordToolUse() {
  return patchToday((d) => ({ ...d, toolsUsed: (d.toolsUsed ?? 0) + 1 }))
}

/** Open the daily quest chest: once per day, all quests must be complete. */
export async function claimQuestChest() {
  const today = dayKey()
  const claimed = await db.transaction('rw', db.activity, async () => {
    const day = (await db.activity.get(today)) ?? { day: today, xp: 0, reviews: 0 }
    if (day.questClaimed) return false
    await db.activity.put({ ...day, questClaimed: true })
    return true
  })
  if (!claimed) return false
  play('chest')
  burst(0.9)
  await awardXp(QUEST_BONUS_XP)
  return true
}

/* ───────────── Reviews ───────────── */

export async function reviewCard(card: StudyCard, grade: Grade, opts: { xp?: boolean } = {}) {
  const next = rate(card.fsrs, grade)
  await db.cards.update(card.id, { fsrs: next })
  const logId = await db.reviewLogs.add({ cardId: card.id, rating: grade, ts: Date.now() })
  if (opts.xp !== false) await awardXp(XP.review[grade] ?? 5, { review: true, silent: true })
  return { next, logId: logId as number }
}

/** Undo a review: restore the card's previous schedule and drop the review log. */
export async function undoReview(card: StudyCard, logId: number) {
  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.cards.update(card.id, { fsrs: card.fsrs })
    await db.reviewLogs.delete(logId)
  })
}

/* ───────────── Lessons ───────────── */

export async function completeLesson(lessonId: string, correct: number, total: number, comboBonus = 0) {
  const lesson = LESSON_BY_ID[lessonId]
  const score = total ? correct / total : 1
  const prev = await db.lessonProgress.get(lessonId)
  await db.lessonProgress.put({
    lessonId,
    bestScore: Math.max(score, prev?.bestScore ?? 0),
    completedAt: Date.now(),
  })
  let unlocked = 0
  if (lesson) {
    for (const cid of lesson.conceptIds) unlocked += await unlockConcept(cid)
  }
  // Replays still earn XP, but less.
  const base = XP.lessonBase + correct * XP.lessonPerCorrect + comboBonus + (lessonId.startsWith('m-') ? XP.mission : 0)
  const xp = prev ? Math.round(base / 2) : base
  await awardXp(xp)
  return { xp, unlocked, firstTime: !prev }
}

/** Unlock a concept's cards into the review queue. Returns how many were newly unlocked. */
export async function unlockConcept(conceptId: string) {
  const locked = await db.cards.where('conceptId').equals(conceptId).filter((c) => c.locked).toArray()
  const now = new Date()
  await db.cards.bulkPut(locked.map((c) => ({ ...c, locked: false, fsrs: newFsrsCard(now) })))
  return locked.length
}

/* ───────────── Concepts, cards, edges ───────────── */

export interface NewCardInput {
  front: string
  back: string
  type: CardType
  options?: string[]
  answer?: number
}

export interface NewConceptInput {
  title: string
  summary: string
  domain: Domain
  tags: string[]
  sourceUrls: string[]
  links: { to: string; type: EdgeType }[]
  cards: NewCardInput[]
}

export async function addConcept(input: NewConceptInput) {
  const base = slugify(input.title) || 'concept'
  let id = base
  while (await db.concepts.get(id)) id = `${base}-${uid()}`
  const now = Date.now()
  const concept: Concept = {
    id,
    title: input.title.trim(),
    summary: input.summary.trim(),
    domain: input.domain,
    tags: input.tags,
    sourceUrls: input.sourceUrls.filter(Boolean),
    isSeed: false,
    createdAt: now,
  }
  await db.transaction('rw', db.concepts, db.cards, db.edges, async () => {
    await db.concepts.add(concept)
    await db.cards.bulkAdd(input.cards.filter((c) => c.front.trim() && c.back.trim()).map((c) => makeCard(id, c)))
    await db.edges.bulkPut(input.links.map((l) => ({ id: `${id}>${l.to}`, from: id, to: l.to, type: l.type })))
  })
  await awardXp(XP.addConcept)
  return id
}

export function makeCard(conceptId: string, c: NewCardInput): StudyCard {
  return {
    id: `${conceptId}#${uid()}`,
    conceptId,
    type: c.type,
    front: c.front.trim(),
    back: c.back.trim(),
    ...(c.type === 'mcq' ? { options: c.options, answer: c.answer } : {}),
    fsrs: newFsrsCard(),
    locked: false,
    isSeed: false,
    createdAt: Date.now(),
  }
}

export async function addCard(conceptId: string, c: NewCardInput) {
  const card = makeCard(conceptId, c)
  await db.cards.add(card)
  return card
}

export async function updateConcept(id: string, patch: Partial<Concept>) {
  await db.concepts.update(id, patch)
}

export async function deleteConcept(id: string) {
  await db.transaction('rw', db.concepts, db.cards, db.edges, async () => {
    await db.concepts.delete(id)
    await db.cards.where('conceptId').equals(id).delete()
    await db.edges.where('from').equals(id).delete()
    await db.edges.where('to').equals(id).delete()
  })
}

export async function addEdge(from: string, to: string, type: EdgeType) {
  if (from === to) return
  await db.edges.put({ id: `${from}>${to}`, from, to, type })
}

export async function deleteEdge(id: string) {
  await db.edges.delete(id)
}

export async function updateCard(id: string, patch: Partial<StudyCard>) {
  await db.cards.update(id, patch)
}

export async function deleteCard(id: string) {
  await db.cards.delete(id)
}

export async function setProfile(patch: Partial<typeof DEFAULT_PROFILE>) {
  const p = (await db.profile.get('me')) ?? DEFAULT_PROFILE
  await db.profile.put({ ...p, ...patch })
}
