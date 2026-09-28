import { reviveFsrs } from '../lib/srs'
import type { FinDB } from './db'

const TABLES = [
  'concepts',
  'edges',
  'cards',
  'reviewLogs',
  'lessonProgress',
  'activity',
  'profile',
  'meta',
  'transactions',
  'categories',
  'recurring',
] as const

export interface Backup {
  app: 'finquest'
  version: 1
  exportedAt: string
  data: Record<(typeof TABLES)[number], unknown[]>
}

export async function exportAll(db: FinDB): Promise<Backup> {
  const data = {} as Backup['data']
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { app: 'finquest', version: 1, exportedAt: new Date().toISOString(), data }
}

/** Replace everything with the backup's contents. Dates inside FSRS state are revived. */
export async function importAll(db: FinDB, raw: unknown) {
  const backup = raw as Backup
  if (!backup || backup.app !== 'finquest' || !backup.data) throw new Error('Not a FinQuest backup file')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      let rows = backup.data[t] ?? []
      if (t === 'cards') rows = rows.map((c) => ({ ...(c as object), fsrs: reviveFsrs((c as { fsrs: never }).fsrs) }))
      await db.table(t).bulkPut(rows)
    }
  })
}

export async function resetAll(db: FinDB) {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear()
  })
}
