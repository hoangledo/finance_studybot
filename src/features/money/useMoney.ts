import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import { DEFAULT_MONEY_SETTINGS } from '../../lib/budget'
import type { Category, MoneySettings } from '../../types'

/** Live money data for the current identity. `ready` is false until the first read completes. */
export function useMoney() {
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), [])
  const categories = useLiveQuery(() => db.categories.orderBy('id').toArray(), [])
  const recurring = useLiveQuery(() => db.recurring.toArray(), [])
  const settingsRow = useLiveQuery(() => db.meta.get('moneySettings'), [])
  const settings: MoneySettings = { ...DEFAULT_MONEY_SETTINGS, ...(settingsRow?.value as Partial<MoneySettings> | undefined) }
  const sorted = useMemo(() => [...(categories ?? [])].sort((a, b) => a.order - b.order), [categories])
  const catById = useMemo(() => new Map<string, Category>(sorted.map((c) => [c.id, c])), [sorted])
  return {
    ready: transactions !== undefined && categories !== undefined && recurring !== undefined,
    transactions: transactions ?? [],
    categories: sorted,
    catById,
    recurring: recurring ?? [],
    settings,
  }
}
