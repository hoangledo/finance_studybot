import { CALC_TEMPLATES } from '../content/calcCards'
import { DEFAULT_CATEGORIES } from '../content/categories'
import { SEED_CONCEPTS, SEED_EDGES } from '../content/concepts'
import { newFsrsCard } from '../lib/srs'
import type { Concept, Edge, StudyCard } from '../types'
import { DEFAULT_PROFILE, type FinDB } from './db'

/** Bump when seed content changes; new seed concepts/cards are merged in without touching user progress. */
export const SEED_VERSION = 3

export function buildSeed(now = Date.now()) {
  const concepts: Concept[] = SEED_CONCEPTS.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    domain: c.domain,
    tags: [],
    sourceUrls: c.sources,
    isSeed: true,
    createdAt: now,
  }))
  const cards: StudyCard[] = SEED_CONCEPTS.flatMap((c) =>
    c.cards.map(([front, back, type], i) => ({
      id: `${c.id}#${i}`,
      conceptId: c.id,
      type: type ?? 'basic',
      front,
      back,
      fsrs: newFsrsCard(new Date(now)),
      locked: true,
      isSeed: true,
      createdAt: now,
    })),
  )
  // Number-crunch cards: one per template, fresh numbers generated at review time.
  for (const t of CALC_TEMPLATES)
    cards.push({
      id: `calc:${t.id}`,
      conceptId: t.conceptId,
      type: 'calc',
      template: t.id,
      front: t.title,
      back: 'Fresh numbers every review — worked answer shown after you choose.',
      fsrs: newFsrsCard(new Date(now)),
      locked: true,
      isSeed: true,
      createdAt: now,
    })
  const edges: Edge[] = SEED_EDGES.map(([from, to, type]) => ({ id: `${from}>${to}`, from, to, type }))
  return { concepts, cards, edges }
}

export async function ensureSeeded(db: FinDB) {
  const v = await db.meta.get('seedVersion')
  if (v && (v.value as number) >= SEED_VERSION) return
  const { concepts, cards, edges } = buildSeed()
  await db.transaction('rw', [db.concepts, db.cards, db.edges, db.profile, db.meta, db.categories], async () => {
    // Only add what's missing so existing progress is preserved on content upgrades.
    const existingConcepts = new Set(await db.concepts.toCollection().primaryKeys())
    const existingCards = new Set(await db.cards.toCollection().primaryKeys())
    const existingEdges = new Set(await db.edges.toCollection().primaryKeys())
    await db.concepts.bulkPut(concepts.filter((c) => !existingConcepts.has(c.id)))
    // New seed cards join unlocked if you're already learning their concept.
    const learning = new Set((await db.cards.filter((c) => !c.locked).toArray()).map((c) => c.conceptId))
    await db.cards.bulkPut(cards.filter((c) => !existingCards.has(c.id)).map((c) => (learning.has(c.conceptId) ? { ...c, locked: false } : c)))
    await db.edges.bulkPut(edges.filter((e) => !existingEdges.has(e.id)))
    const existingCategories = new Set(await db.categories.toCollection().primaryKeys())
    await db.categories.bulkPut(DEFAULT_CATEGORIES.filter((c) => !existingCategories.has(c.id)))
    if (!(await db.profile.get('me'))) await db.profile.put(DEFAULT_PROFILE)
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION })
  })
}
