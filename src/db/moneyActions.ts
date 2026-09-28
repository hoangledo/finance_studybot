import { dayKey } from '../lib/dates'
import { DEFAULT_MONEY_SETTINGS, missingOccurrences, normalizeTargets } from '../lib/budget'
import { uid } from '../lib/id'
import type { Bucket, Cadence, Category, MoneySettings, Recurring, Transaction, TxnKind } from '../types'
import { awardXp } from './actions'
import { scheduleAchievementCheck } from './achievementActions'
import { db } from './db'

export const MONEY_LOG_XP = 5
export const MONEY_LOG_XP_DAILY_CAP = 20

export interface TxnInput {
  date: string
  amountCents: number
  kind: TxnKind
  categoryId: string
  bucket?: Bucket
  note: string
}

/** Add a hand-entered transaction, optionally as the first of a recurring series. */
export async function addTransaction(input: TxnInput, repeat?: Cadence) {
  const now = Date.now()
  let recurringId: string | undefined
  if (repeat) {
    recurringId = uid('rec-')
    await db.recurring.add({ id: recurringId, ...cleanTemplate(input), cadence: repeat, startDate: input.date, createdAt: now })
  }
  const id = recurringId ? `${recurringId}@${input.date}` : uid('tx-')
  await db.transactions.add({ id, ...cleanTemplate(input), date: input.date, recurringId, createdAt: now })
  await rewardLogging()
  if (recurringId) await materializeRecurring()
  scheduleAchievementCheck()
  return id
}

function cleanTemplate(i: TxnInput) {
  return {
    amountCents: i.amountCents,
    kind: i.kind,
    categoryId: i.categoryId,
    bucket: i.kind === 'expense' ? (i.bucket ?? 'want') : undefined,
    note: i.note.trim(),
  }
}

/** +XP for logging, capped per day so it can't be farmed. Also feeds the daily quest. */
async function rewardLogging() {
  const today = dayKey()
  const xp = await db.transaction('rw', db.activity, async () => {
    const day = (await db.activity.get(today)) ?? { day: today, xp: 0, reviews: 0 }
    const earned = day.moneyXp ?? 0
    const grant = Math.max(0, Math.min(MONEY_LOG_XP, MONEY_LOG_XP_DAILY_CAP - earned))
    await db.activity.put({ ...day, txnsLogged: (day.txnsLogged ?? 0) + 1, moneyXp: earned + grant })
    return grant
  })
  if (xp > 0) await awardXp(xp)
}

export async function updateTransaction(id: string, patch: Partial<TxnInput>) {
  const t = await db.transactions.get(id)
  if (!t) return
  const next = { ...t, ...patch }
  if (next.kind === 'income') next.bucket = undefined
  else next.bucket ??= 'want'
  await db.transactions.put(next)
}

/** Delete a transaction. Recurring occurrences are remembered as skipped so they aren't recreated. */
export async function deleteTransaction(id: string) {
  await db.transaction('rw', db.transactions, db.recurring, async () => {
    const t = await db.transactions.get(id)
    if (!t) return
    if (t.recurringId) {
      const r = await db.recurring.get(t.recurringId)
      if (r) await db.recurring.update(r.id, { skipped: [...new Set([...(r.skipped ?? []), t.date])] })
    }
    await db.transactions.delete(id)
  })
}

/** Create any recurring occurrences that are due up to today. Idempotent. */
export async function materializeRecurring(today = dayKey()) {
  await db.transaction('rw', db.transactions, db.recurring, async () => {
    const all = await db.recurring.toArray()
    for (const r of all) {
      const existing = new Set((await db.transactions.where('recurringId').equals(r.id).primaryKeys()) as string[])
      const add = missingOccurrences(r, existing, today)
      if (add.length) await db.transactions.bulkPut(add) // put, not add: concurrent runs stay idempotent
    }
  })
}

export async function updateRecurring(id: string, patch: Partial<Omit<Recurring, 'id' | 'createdAt'>>) {
  await db.recurring.update(id, patch)
}

/** Stop a series. Past transactions stay; future ones won't be created. */
export async function deleteRecurring(id: string) {
  await db.transaction('rw', db.transactions, db.recurring, async () => {
    await db.recurring.delete(id)
    // Detach its past transactions so they read as normal entries.
    await db.transactions.where('recurringId').equals(id).modify((t: Transaction) => {
      delete t.recurringId
    })
  })
}

/* ───────── Categories & settings ───────── */

export async function saveCategory(c: Omit<Category, 'id' | 'isDefault' | 'order'> & { id?: string }) {
  if (c.id) {
    await db.categories.update(c.id, { name: c.name, emoji: c.emoji, kind: c.kind, bucket: c.kind === 'expense' ? c.bucket : undefined, monthlyLimitCents: c.monthlyLimitCents, archived: c.archived })
    return c.id
  }
  const id = uid('cat-')
  const order = (await db.categories.count()) + 100
  await db.categories.add({ ...c, id, isDefault: false, order, bucket: c.kind === 'expense' ? c.bucket : undefined })
  return id
}

export async function setCategoryLimit(id: string, monthlyLimitCents: number | undefined) {
  await db.categories.update(id, { monthlyLimitCents })
}

export async function archiveCategory(id: string, archived = true) {
  await db.categories.update(id, { archived })
}

export async function getMoneySettings(): Promise<MoneySettings> {
  const row = await db.meta.get('moneySettings')
  return { ...DEFAULT_MONEY_SETTINGS, ...(row?.value as Partial<MoneySettings> | undefined) }
}

export async function setMoneySettings(patch: Partial<MoneySettings>, changed?: Bucket) {
  const cur = await getMoneySettings()
  const next = { ...cur, ...patch }
  if (patch.targets) next.targets = normalizeTargets(patch.targets, changed)
  await db.meta.put({ key: 'moneySettings', value: next })
}
