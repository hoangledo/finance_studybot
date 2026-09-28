/** Daily quests: three per day, chosen deterministically from the date so they stay put all day. */

export type QuestKind = 'xp' | 'lesson' | 'reviews' | 'combo' | 'concept' | 'tool' | 'money'

export interface Quest {
  kind: QuestKind
  title: string
  target: number
  icon: string
}

export interface QuestInputs {
  xp: number
  reviews: number
  lessons: number
  maxCombo: number
  concepts: number
  tools: number
  txns: number
}

export const QUEST_BONUS_XP = 25

const POOL: Omit<Quest, 'title'>[] = [
  { kind: 'lesson', target: 1, icon: '📘' },
  { kind: 'reviews', target: 10, icon: '🃏' },
  { kind: 'combo', target: 5, icon: '⚡' },
  { kind: 'concept', target: 1, icon: '✍️' },
  { kind: 'tool', target: 1, icon: '🧮' },
  { kind: 'money', target: 1, icon: '💸' },
]

function titleFor(kind: QuestKind, target: number) {
  switch (kind) {
    case 'xp':
      return `Earn ${target} XP`
    case 'lesson':
      return target === 1 ? 'Finish a lesson' : `Finish ${target} lessons`
    case 'reviews':
      return `Review ${target} cards`
    case 'combo':
      return `Get a ${target}× combo`
    case 'concept':
      return 'Add your own concept'
    case 'tool':
      return 'Play with a Money Lab tool'
    case 'money':
      return 'Log an expense or income'
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** The XP quest is always first; two more rotate daily from the pool. */
export function dailyQuests(day: string, dailyGoal: number): Quest[] {
  const h = hash(day)
  const first = h % POOL.length
  let second = Math.floor(h / POOL.length) % (POOL.length - 1)
  if (second >= first) second++
  const picks = [POOL[first], POOL[second]]
  const xpTarget = Math.max(20, dailyGoal)
  return [
    { kind: 'xp', target: xpTarget, icon: '⭐', title: titleFor('xp', xpTarget) },
    ...picks.map((p) => ({ ...p, title: titleFor(p.kind, p.target) })),
  ]
}

export function questProgress(q: Quest, i: QuestInputs) {
  const v = {
    xp: i.xp,
    lesson: i.lessons,
    reviews: i.reviews,
    combo: i.maxCombo,
    concept: i.concepts,
    tool: i.tools,
    money: i.txns,
  }[q.kind]
  return Math.min(q.target, v)
}

export function questsDone(qs: Quest[], i: QuestInputs) {
  return qs.filter((q) => questProgress(q, i) >= q.target).length
}

export function canClaimChest(qs: Quest[], i: QuestInputs, claimed: boolean) {
  return !claimed && questsDone(qs, i) === qs.length
}
