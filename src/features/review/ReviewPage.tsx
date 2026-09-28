import { AnimatePresence, motion } from 'framer-motion'
import { Check, RotateCcw, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { DOMAIN_META } from '../../content/concepts'
import { db } from '../../db/db'
import { useConcepts, useNow } from '../../db/hooks'
import { previewIntervals, Rating, type Grade } from '../../lib/srs'
import { Bar, Empty, Md, PageHeader, Pill } from '../../components/ui'
import type { Concept, StudyCard } from '../../types'
import { burst } from '../gamify/fx'
import { SwipeDeck } from './SwipeDeck'
import { useReviewSession } from './useReviewSession'
import { play } from '../gamify/sounds'
import { Cappy } from '../../components/mascot/Cappy'
import { pick } from '../../components/mascot/lines'
import { SpeechBubble } from '../../components/mascot/SpeechBubble'

const GRADES: { g: Grade; label: string; key: string; cls: string }[] = [
  { g: Rating.Again, label: 'Again', key: '1', cls: 'btn-danger' },
  { g: Rating.Hard, label: 'Hard', key: '2', cls: 'btn-sun' },
  { g: Rating.Good, label: 'Good', key: '3', cls: 'btn-primary' },
  { g: Rating.Easy, label: 'Easy', key: '4', cls: 'btn-sky' },
]

type ReviewStyle = 'classic' | 'swipe'
const STYLE_KEY = 'finquest.reviewStyle'

function readStyle(): ReviewStyle {
  try {
    return localStorage.getItem(STYLE_KEY) === 'swipe' ? 'swipe' : 'classic'
  } catch {
    return 'classic'
  }
}

export function ReviewPage() {
  const now = useNow()
  const concepts = useConcepts()
  const { queue, stats, mode, mood, loadQueue, rate, undo, canUndo } = useReviewSession()
  const [style, setStyleState] = useState<ReviewStyle>(readStyle)
  const setStyle = (s: ReviewStyle) => {
    setStyleState(s)
    try {
      localStorage.setItem(STYLE_KEY, s)
    } catch {
      /* ignore */
    }
  }

  const conceptById = useMemo(() => Object.fromEntries((concepts ?? []).map((c) => [c.id, c])), [concepts])
  const total = queue ? queue.length + stats.done : 0

  if (!queue || !concepts) return null

  if (queue.length === 0 && stats.done > 0) return <SessionDone stats={stats} onMore={() => loadQueue('ahead')} />

  if (queue.length === 0)
    return (
      <>
        <PageHeader title="Review" subtitle="Spaced repetition keeps what you learn." />
        <NothingDue now={now} onAhead={() => loadQueue('ahead')} />
      </>
    )

  const card = queue[0]
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="rounded-xl p-1.5 text-muted hover:bg-surface-2" aria-label="Exit review">
          <X size={24} strokeWidth={3} />
        </Link>
        <Bar value={stats.done / Math.max(1, total)} className="h-4 flex-1" />
        <ComboBadge combo={stats.combo} />
      </div>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div className="inline-flex self-center rounded-2xl bg-surface-2 p-1">
          {(['classic', 'swipe'] as ReviewStyle[]).map((st) => (
            <button
              key={st}
              onClick={() => setStyle(st)}
              className={clsx('rounded-xl px-3.5 py-1.5 text-xs font-extrabold capitalize', style === st ? 'bg-surface shadow-sm' : 'text-muted')}
              aria-pressed={style === st}
            >
              {st === 'swipe' ? '👆 Swipe' : 'Classic'}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <AnimatePresence mode="wait">
            {stats.done > 0 && (
              <motion.div key={stats.done} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="hidden sm:block">
                <SpeechBubble className="mb-4 py-2 text-sm">
                  {mood === 'oops' ? 'We will see it again soon!' : mood === 'think' ? 'Tricky one. Noted!' : mood === 'cheer' ? 'Too easy for you!' : 'Nice recall!'}
                </SpeechBubble>
              </motion.div>
            )}
          </AnimatePresence>
          <Cappy mood={mood} size={64} />
        </div>
      </div>
      {mode === 'ahead' && <p className="mb-3 text-center text-xs text-muted">Studying ahead (cards due in the next 3 days)</p>}

      {style === 'swipe' ? (
        <>
          <SwipeDeck
            card={card}
            nextCard={queue[1]}
            concept={conceptById[card.conceptId]}
            onRate={(g) => rate(card, g)}
            onUndo={undo}
            canUndo={canUndo}
          />
          <p className="mt-24 text-center text-xs text-muted">
            {queue.length} left · tap to flip · <kbd>←</kbd> again · <kbd>↑</kbd> easy · <kbd>→</kbd> good · <kbd>Z</kbd> undo
          </p>
        </>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={card.id + stats.done}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.2 }}
            >
              <ReviewCard card={card} concept={conceptById[card.conceptId]} onRate={(g) => rate(card, g)} />
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted">
            <span>
              {queue.length} left · <kbd>Space</kbd> flip · <kbd>1–4</kbd> rate
            </span>
            {canUndo && (
              <button className="font-extrabold text-sky-ink hover:underline" onClick={undo}>
                Undo last
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ComboBadge({ combo }: { combo: number }) {
  return (
    <AnimatePresence>
      {combo >= 2 && (
        <motion.div
          key={combo}
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="flex items-center gap-1 rounded-full bg-coral px-3 py-1 font-display text-base font-bold text-white shadow-[0_3px_0_var(--coral-edge)]"
        >
          <Zap size={15} className="fill-current" /> {combo}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function renderCloze(front: string, back: string, revealed: boolean) {
  if (!front.includes('____')) return front
  const parts = front.split('____')
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className={clsx('mx-1 rounded-md px-2 py-0.5', revealed ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-muted')}>
              {revealed ? back : '?'}
            </span>
          )}
        </span>
      ))}
    </>
  )
}

export function ReviewCard({ card, concept, onRate }: { card: StudyCard; concept?: Concept; onRate: (g: Grade) => void }) {
  const [flipped, setFlipped] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const intervals = useMemo(() => previewIntervals(card.fsrs), [card.fsrs])
  const isMcq = card.type === 'mcq' && card.options && card.answer !== undefined
  const domain = concept ? DOMAIN_META[concept.domain] : null

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    setFlipped(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!isMcq) setFlipped(true)
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        onRate(Number(e.key) as Grade)
      } else if (isMcq && !flipped && ['1', '2', '3', '4'].includes(e.key)) {
        const i = Number(e.key) - 1
        if (i < card.options!.length) pick(i)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const mcqCorrect = isMcq && picked === card.answer

  return (
    <div>
      <motion.div
        className="card min-h-72 p-6 sm:p-8"
        animate={flipped ? { rotateX: [0, 8, 0] } : {}}
        transition={{ duration: 0.3 }}
        style={{ transformPerspective: 900 }}
      >
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {domain && <Pill color={domain.color}>{domain.icon} {domain.label}</Pill>}
          {concept && (
            <Link to={`/concept/${concept.id}`} className="text-xs text-muted hover:text-brand-ink">
              {concept.title}
            </Link>
          )}
          {card.type === 'reverse' && <Pill>Name the term</Pill>}
        </div>

        <div className={clsx('font-display font-semibold leading-snug', card.front.length > 160 ? 'text-lg' : 'text-xl sm:text-2xl')}>
          {card.type === 'cloze' ? renderCloze(card.front, card.back, flipped) : card.type === 'reverse' ? <Md>{card.front}</Md> : card.front}
        </div>

        {isMcq && (
          <div className="mt-6 grid gap-2">
            {card.options!.map((o, i) => (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition',
                  picked === null && 'border-line hover:border-brand hover:bg-brand-soft/40',
                  picked !== null && i === card.answer && 'border-brand bg-brand-soft text-brand-ink',
                  picked === i && i !== card.answer && 'border-danger bg-danger-soft text-danger-ink',
                  picked !== null && i !== card.answer && picked !== i && 'border-line opacity-50',
                )}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold text-muted">{i + 1}</span>
                {o}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {flipped && card.type !== 'cloze' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 border-t border-dashed border-line pt-5">
              {isMcq && (
                <p className={clsx('mb-2 flex items-center gap-1.5 text-sm font-bold', mcqCorrect ? 'text-brand-ink' : 'text-danger-ink')}>
                  {mcqCorrect ? <Check size={16} /> : <X size={16} />} {mcqCorrect ? 'Correct!' : 'Not quite'}
                </p>
              )}
              {card.type === 'reverse' ? (
                <p className="font-display text-2xl font-bold text-brand-ink">{card.back}</p>
              ) : (
                <Md className="text-[15px]">{card.back}</Md>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-5">
        {!flipped ? (
          !isMcq && (
            <button className="btn-sky w-full py-4 text-base" onClick={() => { play('flip'); setFlipped(true) }}>
              Show answer
            </button>
          )
        ) : isMcq ? (
          <button className="btn-primary w-full py-4 text-base" onClick={() => onRate(mcqCorrect ? Rating.Good : Rating.Again)}>
            Continue
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(({ g, label, key, cls }) => (
              <button key={g} onClick={() => onRate(g)} className={clsx('flex-col gap-0 px-2 py-2.5', cls)}>
                <span>{label}</span>
                <span className="text-[11px] font-bold normal-case opacity-80">
                  {intervals[g]} · {key}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionDone({ stats, onMore }: { stats: { done: number; correct: number; best: number; xp: number }; onMore: () => void }) {
  useEffect(() => {
    burst(0.8)
    play('levelup')
  }, [])
  const [line] = useState(() => pick('reviewDone'))
  const acc = stats.done ? Math.round((stats.correct / stats.done) * 100) : 0
  return (
    <div className="mx-auto max-w-md pt-6 text-center">
      <div className="flex justify-center">
        <Cappy mood="cheer" size={150} />
      </div>
      <h1 className="mt-4 font-display text-4xl font-bold text-sky-ink">Session complete!</h1>
      <p className="mt-1 font-bold text-muted">{line}</p>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Reviewed', stats.done],
          ['Accuracy', `${acc}%`],
          ['Best combo', stats.best],
        ].map(([k, v]) => (
          <div key={k} className="card p-3">
            <div className="font-display text-2xl font-bold">{v}</div>
            <div className="text-xs text-muted">{k}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-gold-ink">+{stats.xp} XP</p>
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn-ghost" onClick={onMore}>
          <RotateCcw size={16} /> Study ahead
        </button>
        <Link to="/path" className="btn-primary">
          Continue the path
        </Link>
      </div>
    </div>
  )
}

function NothingDue({ now, onAhead }: { now: Date; onAhead: () => void }) {
  const [nextDue, setNextDue] = useState<Date | null>(null)
  const [unlocked, setUnlocked] = useState(0)
  useEffect(() => {
    db.cards
      .filter((c) => !c.locked)
      .toArray()
      .then((cs) => {
        setUnlocked(cs.length)
        const n = cs.map((c) => new Date(c.fsrs.due)).sort((a, b) => a.getTime() - b.getTime())[0]
        setNextDue(n ?? null)
      })
  }, [now])

  if (unlocked === 0)
    return (
      <Empty
        mood="wave"
        title="No cards yet"
        body="Finish your first lesson on the Path to unlock its flashcards, or add your own concept."
        action={
          <Link to="/path" className="btn-primary">
            Start the path
          </Link>
        }
      />
    )
  return (
    <Empty
      mood="sleepy"
      title="All caught up!"
      body={nextDue ? `Next card is due ${nextDue.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}.` : 'Nothing scheduled.'}
      action={
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onAhead}>
            Study ahead
          </button>
          <Link to="/path" className="btn-primary">
            Learn something new
          </Link>
        </div>
      }
    />
  )
}
