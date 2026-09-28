import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'framer-motion'
import { ArrowUp, Check, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { DOMAIN_META } from '../../content/concepts'
import { Rating, type Grade } from '../../lib/srs'
import { Md, Pill } from '../../components/ui'
import type { Concept, StudyCard } from '../../types'
import { play } from '../gamify/sounds'

const DIST = 110 // px drag distance that commits a swipe
const VELOCITY = 600 // px/s flick that commits a swipe

type Dir = 'left' | 'right' | 'up'
const GRADE_FOR: Record<Dir, Grade> = { left: Rating.Again, right: Rating.Good, up: Rating.Easy }

/**
 * Speed review: tap (or Space) to flip, then swipe right = Good, left = Again, up = Easy.
 * Arrow keys do the same on desktop; Z / Backspace undoes the last swipe.
 */
export function SwipeDeck({
  card,
  nextCard,
  concept,
  onRate,
  onUndo,
  canUndo,
}: {
  card: StudyCard
  nextCard?: StudyCard
  concept?: Concept
  onRate: (g: Grade) => void
  onUndo: () => void
  canUndo: boolean
}) {
  return (
    <div className="select-none">
      {/* Card height follows the screen: ~320px on small phones, up to 520px on tall ones */}
      <div className="relative mx-auto h-[clamp(320px,calc(100dvh_-_300px),520px)] max-w-md">
        {nextCard && (
          <div className="card absolute inset-0 translate-y-3 scale-[0.95] p-6 opacity-70" aria-hidden>
            <FrontText card={nextCard} revealed={false} />
          </div>
        )}
        <SwipeCard key={card.id + ':' + card.fsrs.reps + ':' + String(card.fsrs.due)} card={card} concept={concept} onRate={onRate} onUndo={onUndo} canUndo={canUndo} />
      </div>
    </div>
  )
}

function SwipeCard({
  card,
  concept,
  onRate,
  onUndo,
  canUndo,
}: {
  card: StudyCard
  concept?: Concept
  onRate: (g: Grade) => void
  onUndo: () => void
  canUndo: boolean
}) {
  const reduce = useReducedMotion()
  const [flipped, setFlipped] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [leaving, setLeaving] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-16, 16])
  const againOpacity = useTransform(x, [-DIST, -20], [1, 0])
  const goodOpacity = useTransform(x, [20, DIST], [0, 1])
  const easyOpacity = useTransform(y, [-DIST, -20], [1, 0])
  const isMcq = card.type === 'mcq' && card.options && card.answer !== undefined
  const domain = concept ? DOMAIN_META[concept.domain] : null

  const commit = async (dir: Dir) => {
    if (leaving) return
    setLeaving(true)
    navigator.vibrate?.(12)
    if (!reduce) {
      const opts = { duration: 0.28, ease: 'easeIn' as const }
      if (dir === 'up') await animate(y, -700, opts)
      else await animate(x, dir === 'right' ? 600 : -600, opts)
    }
    onRate(GRADE_FOR[dir])
  }

  const flip = () => {
    if (flipped || isMcq) return
    play('flip')
    setFlipped(true)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if (offset.y < -DIST || velocity.y < -VELOCITY) return void commit('up')
    if (offset.x > DIST || velocity.x > VELOCITY) return void commit('right')
    if (offset.x < -DIST || velocity.x < -VELOCITY) return void commit('left')
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
    animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 })
  }

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    setFlipped(true)
    setTimeout(() => commit(i === card.answer ? 'right' : 'left'), 750)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        flip()
      } else if ((e.key === 'z' || e.key === 'Backspace') && canUndo) {
        e.preventDefault()
        onUndo()
      } else if (isMcq && !flipped && ['1', '2', '3', '4'].includes(e.key)) {
        const i = Number(e.key) - 1
        if (i < card.options!.length) pick(i)
      } else if (flipped && !isMcq) {
        if (e.key === 'ArrowRight') commit('right')
        else if (e.key === 'ArrowLeft') commit('left')
        else if (e.key === 'ArrowUp') {
          e.preventDefault()
          commit('up')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const canDrag = flipped && !isMcq && !leaving

  return (
    <>
      <motion.div
        className={clsx('card absolute inset-0 flex flex-col overflow-hidden p-6 shadow-lg', canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')}
        style={{ x, y, rotate, touchAction: 'none' }}
        drag={canDrag}
        dragElastic={0.9}
        onDragEnd={onDragEnd}
        onTap={flip}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        role="group"
        aria-label="Flashcard. Swipe right if you knew it, left to see it again, up if it was easy."
      >
        {/* Swipe labels */}
        <motion.span style={{ opacity: againOpacity }} className="pointer-events-none absolute top-20 right-6 z-10 rotate-12 rounded-xl bg-surface/80 border-4 border-danger px-3 py-1 font-display text-2xl font-bold text-danger-ink">
          AGAIN
        </motion.span>
        <motion.span style={{ opacity: goodOpacity }} className="pointer-events-none absolute top-20 left-6 z-10 -rotate-12 rounded-xl bg-surface/80 border-4 border-brand px-3 py-1 font-display text-2xl font-bold text-brand-ink">
          GOOD
        </motion.span>
        <motion.span style={{ opacity: easyOpacity }} className="pointer-events-none absolute bottom-12 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-surface/80 border-4 border-sky px-3 py-1 font-display text-2xl font-bold text-sky-ink">
          EASY
        </motion.span>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {domain && (
            <Pill color={domain.color}>
              {domain.icon} {domain.label}
            </Pill>
          )}
          {card.type === 'reverse' && <Pill>Name the term</Pill>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FrontText card={card} revealed={flipped} />
          {isMcq && (
            <div className="mt-4 grid gap-2">
              {card.options!.map((o, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation()
                    pick(i)
                  }}
                  disabled={picked !== null}
                  className={clsx(
                    'rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold transition',
                    picked === null && 'border-line hover:border-sky hover:bg-sky-soft',
                    picked !== null && i === card.answer && 'border-brand bg-brand-soft text-brand-ink',
                    picked === i && i !== card.answer && 'border-danger bg-danger-soft text-danger-ink',
                    picked !== null && i !== card.answer && picked !== i && 'border-line opacity-50',
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          {flipped && !isMcq && card.type !== 'cloze' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border-t-2 border-dashed border-line pt-4">
              {card.type === 'reverse' ? <p className="font-display text-2xl font-bold text-brand-ink">{card.back}</p> : <Md className="text-[15px]">{card.back}</Md>}
            </motion.div>
          )}
        </div>

        {!flipped && !isMcq && <p className="mt-3 text-center text-xs font-extrabold tracking-wider text-muted uppercase">Tap to reveal</p>}
      </motion.div>

      {/* Buttons for mouse / accessibility (below the card) */}
      <div className="absolute -bottom-20 left-0 flex w-full items-center justify-center gap-3">
        <button className="btn-ghost h-11 w-11 rounded-full p-0" onClick={onUndo} disabled={!canUndo} aria-label="Undo last swipe" title="Undo (Z)">
          <RotateCcw size={18} />
        </button>
        <button className="btn-danger h-14 w-14 rounded-full p-0" onClick={() => (flipped ? commit('left') : flip())} disabled={leaving || !!isMcq} aria-label="Again">
          <X size={26} strokeWidth={3} />
        </button>
        <button className="btn-sky h-12 w-12 rounded-full p-0" onClick={() => (flipped ? commit('up') : flip())} disabled={leaving || !!isMcq} aria-label="Easy">
          <ArrowUp size={22} strokeWidth={3} />
        </button>
        <button className="btn-primary h-14 w-14 rounded-full p-0" onClick={() => (flipped ? commit('right') : flip())} disabled={leaving || !!isMcq} aria-label="Good">
          <Check size={26} strokeWidth={3} />
        </button>
      </div>
    </>
  )
}

function FrontText({ card, revealed }: { card: StudyCard; revealed: boolean }) {
  const cls = clsx('font-display font-semibold leading-snug', card.front.length > 160 ? 'text-lg' : 'text-xl sm:text-2xl')
  if (card.type === 'cloze' && card.front.includes('____')) {
    const parts = card.front.split('____')
    return (
      <div className={cls}>
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < parts.length - 1 && (
              <span className={clsx('mx-1 rounded-md px-2 py-0.5', revealed ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-muted')}>{revealed ? card.back : '?'}</span>
            )}
          </span>
        ))}
      </div>
    )
  }
  if (card.type === 'reverse') return <Md className={cls}>{card.front}</Md>
  return <div className={cls}>{card.front}</div>
}
