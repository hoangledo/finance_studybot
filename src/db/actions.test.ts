import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { reviewCard, undoReview } from './actions'
import { db } from './db'
import { ensureSeeded } from './seed'
import { Rating } from '../lib/srs'

describe('review undo', () => {
  it('restores the previous schedule and removes the review log', async () => {
    await ensureSeeded(db)
    await db.cards.update('budget#0', { locked: false })
    const before = (await db.cards.get('budget#0'))!
    const { next, logId } = await reviewCard(before, Rating.Good)
    expect(next.reps).toBe(before.fsrs.reps + 1)
    expect(await db.reviewLogs.get(logId)).toBeTruthy()

    await undoReview(before, logId)
    const after = (await db.cards.get('budget#0'))!
    expect(after.fsrs.reps).toBe(before.fsrs.reps)
    expect(new Date(after.fsrs.due).getTime()).toBe(new Date(before.fsrs.due).getTime())
    expect(await db.reviewLogs.get(logId)).toBeUndefined()
  })

  it('can rate without awarding XP (re-rating an undone card)', async () => {
    const xpBefore = (await db.profile.get('me'))!.xp
    const card = (await db.cards.get('budget#0'))!
    await reviewCard(card, Rating.Easy, { xp: false })
    expect((await db.profile.get('me'))!.xp).toBe(xpBefore)
  })
})
