import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { SEED_CONCEPTS } from '../content/concepts'
import { FinDB } from './db'
import { ensureSeeded } from './seed'
import { exportAll, importAll } from './backup'

describe('database', () => {
  it('seeds once, keeps progress on re-seed, and round-trips a backup', async () => {
    const db = new FinDB('test-' + Math.random())
    await ensureSeeded(db)
    expect(await db.concepts.count()).toBe(SEED_CONCEPTS.length)
    const total = await db.cards.count()
    expect(total).toBe(SEED_CONCEPTS.reduce((s, c) => s + c.cards.length, 0))
    expect(await db.cards.filter((c) => !c.locked).count()).toBe(0)

    // Unlock + review a card, then re-run seeding: progress must survive.
    const card = (await db.cards.get('budget#0'))!
    const due = new Date('2030-01-01T00:00:00Z')
    await db.cards.update(card.id, { locked: false, fsrs: { ...card.fsrs, due, reps: 3 } })
    await db.meta.delete('seedVersion')
    await ensureSeeded(db)
    const after = (await db.cards.get('budget#0'))!
    expect(after.locked).toBe(false)
    expect(after.fsrs.reps).toBe(3)

    // Backup round-trip (via JSON, like a real file) restores Dates.
    const json = JSON.parse(JSON.stringify(await exportAll(db)))
    const db2 = new FinDB('test-' + Math.random())
    await importAll(db2, json)
    const restored = (await db2.cards.get('budget#0'))!
    expect(restored.fsrs.due).toBeInstanceOf(Date)
    expect(restored.fsrs.due.getTime()).toBe(due.getTime())
    expect(await db2.cards.count()).toBe(total)
  })

  it('rejects files that are not backups', async () => {
    const db = new FinDB('test-' + Math.random())
    await expect(importAll(db, { hello: 'world' })).rejects.toThrow(/Not a FinQuest backup/)
  })
})
