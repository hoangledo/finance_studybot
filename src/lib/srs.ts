import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs'

export { Rating, State }
export type { Grade }

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }))

export function newFsrsCard(now = new Date()): FsrsCard {
  return createEmptyCard(now)
}

export function rate(card: FsrsCard, grade: Grade, now = new Date()): FsrsCard {
  return scheduler.next(card, now, grade).card
}

/** Human label for the next interval each rating would give, e.g. { 1: "10m", 3: "3d" }. */
export function previewIntervals(card: FsrsCard, now = new Date()): Record<Grade, string> {
  const preview = scheduler.repeat(card, now)
  const out = {} as Record<Grade, string>
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[g] = formatInterval(preview[g].card.due.getTime() - now.getTime())
  }
  return out
}

export function formatInterval(ms: number) {
  const min = ms / 60_000
  if (min < 60) return `${Math.max(1, Math.round(min))}m`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  const d = h / 24
  if (d < 30) return `${Math.round(d)}d`
  const mo = d / 30
  if (mo < 12) return `${mo.toFixed(1).replace(/\.0$/, '')}mo`
  return `${(d / 365).toFixed(1).replace(/\.0$/, '')}y`
}

export function retrievability(card: FsrsCard, now = new Date()) {
  if (card.state === State.New) return 0
  return scheduler.get_retrievability(card, now, false)
}

/** Dexie / JSON import can turn Dates into strings; restore them. */
export function reviveFsrs(card: FsrsCard): FsrsCard {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  }
}
