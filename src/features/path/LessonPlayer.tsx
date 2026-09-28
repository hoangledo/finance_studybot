import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, GripVertical, Layers, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { LESSON_BY_ID } from '../../content/lessons'
import { completeLesson, recordCombo } from '../../db/actions'
import { XP } from '../../lib/gamify'
import { Bar } from '../../components/ui'
import { Cappy } from '../../components/mascot/Cappy'
import { pick } from '../../components/mascot/lines'
import { SpeechBubble } from '../../components/mascot/SpeechBubble'
import type { LessonStep } from '../../types'
import { burst, toast } from '../gamify/fx'
import { Celebrations } from '../gamify/Celebrations'
import { play } from '../gamify/sounds'
import { Widget } from '../widgets/Widgets'
import { starsFor } from './PathPage'
import { GlossaryMd, GlossarySheet } from '../glossary/Glossary'

type Verdict = { correct: boolean; explain: string; line: string } | null

export function LessonPlayer() {
  const { id = '' } = useParams()
  const lesson = LESSON_BY_ID[id]
  const navigate = useNavigate()
  const [i, setI] = useState(0)
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [correct, setCorrect] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [result, setResult] = useState<{ xp: number; unlocked: number; score: number } | null>(null)

  const gradable = useMemo(() => lesson?.steps.filter((s) => s.kind !== 'read' && s.kind !== 'widget').length ?? 0, [lesson])

  if (!lesson)
    return (
      <div className="grid h-full place-items-center">
        <Link to="/path" className="btn-primary">
          Lesson not found. Back to path
        </Link>
      </div>
    )

  const step = lesson.steps[i]
  const isLast = i === lesson.steps.length - 1

  const advance = async () => {
    setVerdict(null)
    if (!isLast) return setI(i + 1)
    const r = await completeLesson(lesson.id, correct, gradable, bonus)
    setResult({ xp: r.xp, unlocked: r.unlocked, score: gradable ? correct / gradable : 1 })
    play('levelup')
    burst(1)
  }

  const onAnswer = (ok: boolean, explain: string) => {
    setVerdict({ correct: ok, explain, line: pick(ok ? 'correct' : 'wrong') })
    play(ok ? 'correct' : 'wrong')
    if (ok) {
      setCorrect((c) => c + 1)
      const nextCombo = combo + 1
      setCombo(nextCombo)
      recordCombo(nextCombo)
      const extra = Math.min(nextCombo - 1, XP.comboCap) * XP.comboBonus
      setBonus((b) => b + extra)
      if (nextCombo >= 3) toast({ kind: 'xp', title: `⚡ ${nextCombo}× combo!`, body: `+${extra} bonus XP` })
    } else setCombo(0)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain bg-bg">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)_+_12px)] sm:pt-5">
        <button onClick={() => navigate('/path')} className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label="Quit lesson">
          <X size={26} strokeWidth={3} />
        </button>
        <Bar value={(i + (verdict || result ? 1 : 0)) / lesson.steps.length} className="h-4 flex-1" />
        <AnimatePresence>
          {combo >= 2 && (
            <motion.span
              key={combo}
              initial={{ scale: 1.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-0.5 font-display text-lg font-bold text-coral-ink"
            >
              🔥{combo}
            </motion.span>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-[calc(12rem_+_env(safe-area-inset-bottom,0px))] sm:pt-8">
        {result ? (
          <LessonDone lessonTitle={lesson.title} result={result} correct={correct} total={gradable} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }}>
              <StepView step={step} locked={!!verdict} onAnswer={onAnswer} />
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {!result && <Footer step={step} verdict={verdict} onContinue={advance} />}
      <Celebrations />
      <GlossarySheet />
    </div>
  )
}

function Footer({ step, verdict, onContinue }: { step: LessonStep; verdict: Verdict; onContinue: () => void }) {
  const passive = step.kind === 'read' || step.kind === 'widget'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (passive || verdict)) onContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  if (!passive && !verdict) return null
  return (
    <motion.footer
      initial={{ y: 120 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className={clsx(
        'fixed inset-x-0 bottom-0 z-30 border-t-2 px-4 pt-4 pb-[max(env(safe-area-inset-bottom,0px),16px)]',
        !verdict && 'border-line bg-surface',
        verdict?.correct && 'border-brand bg-brand-soft',
        verdict && !verdict.correct && 'border-danger bg-danger-soft',
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
        {verdict && (
          <div className="flex flex-1 items-center gap-3">
            <Cappy mood={verdict.correct ? 'cheer' : 'oops'} size={64} className="-my-2 shrink-0" />
            <div className="min-w-0">
              <div className={clsx('font-display text-xl font-bold', verdict.correct ? 'text-brand-ink' : 'text-danger-ink')}>{verdict.line}</div>
              <p className="mt-0.5 text-sm font-semibold">{verdict.explain}</p>
            </div>
          </div>
        )}
        <button className={clsx('min-w-44 py-3.5 text-base sm:ml-auto', verdict && !verdict.correct ? 'btn-danger' : 'btn-primary')} onClick={onContinue}>
          Continue
        </button>
      </div>
    </motion.footer>
  )
}

function StepView({ step, locked, onAnswer }: { step: LessonStep; locked: boolean; onAnswer: (ok: boolean, explain: string) => void }) {
  switch (step.kind) {
    case 'read':
      return (
        <div>
          <div className="mb-5 flex items-end gap-3">
            <Cappy mood="happy" size={100} className="shrink-0" />
            <SpeechBubble className="mb-6">
              <span className="font-display text-xl sm:text-2xl">{step.title}</span>
            </SpeechBubble>
          </div>
          <div className="card p-5 sm:p-6">
            <GlossaryMd className="text-[16px]" inLesson>{step.body}</GlossaryMd>
          </div>
        </div>
      )
    case 'widget':
      return (
        <div>
          <div className="mb-5 flex items-end gap-3">
            <Cappy mood="think" size={90} className="shrink-0" />
            <SpeechBubble className="mb-5">
              <div className="font-display text-xl">{step.title}</div>
              <div className="text-sm font-semibold text-muted">{step.caption}</div>
            </SpeechBubble>
          </div>
          <div className="card p-4 sm:p-5">
            <Widget id={step.widget} />
          </div>
        </div>
      )
    case 'mcq':
      return <Mcq key={step.q} q={step.q} options={step.options} answer={step.answer} locked={locked} onDone={(ok) => onAnswer(ok, step.explain)} />
    case 'tf':
      return (
        <Mcq
          key={step.q}
          q={step.q}
          options={['True', 'False']}
          answer={step.answer ? 0 : 1}
          locked={locked}
          onDone={(ok) => onAnswer(ok, step.explain)}
          label="True or false?"
          big
        />
      )
    case 'rank':
      return <Rank key={step.prompt} prompt={step.prompt} items={step.items} locked={locked} onDone={(ok) => onAnswer(ok, step.explain)} />
  }
}

function Mcq({
  q,
  options,
  answer,
  locked,
  onDone,
  label = 'Choose the best answer',
  big,
}: {
  q: string
  options: string[]
  answer: number
  locked: boolean
  onDone: (ok: boolean) => void
  label?: string
  big?: boolean
}) {
  const [sel, setSel] = useState<number | null>(null)
  const choose = (i: number) => {
    if (locked) return
    play('tap')
    setSel(i)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (!locked && n >= 1 && n <= options.length) choose(n - 1)
      if (e.key === 'Enter' && sel !== null && !locked) onDone(sel === answer)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.16em] text-sky-ink uppercase">{label}</p>
      <h2 className="mt-2 mb-6 font-display text-2xl font-bold sm:text-[28px] sm:leading-tight">{q}</h2>
      <div className={clsx('grid gap-3', big && 'grid-cols-2')}>
        {options.map((o, i) => (
          <motion.button
            key={i}
            disabled={locked}
            onClick={() => choose(i)}
            animate={locked && sel === i && i !== answer ? { x: [0, -8, 8, -5, 5, 0] } : locked && i === answer ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.4 }}
            className={clsx(
              'flex items-center gap-3 rounded-2xl border-2 border-b-4 bg-surface px-4 text-left font-bold transition-colors',
              big ? 'justify-center py-8 font-display text-2xl' : 'py-3.5 text-[15px]',
              !locked && sel === i && 'border-sky bg-sky-soft text-sky-ink',
              !locked && sel !== i && 'border-line hover:bg-surface-2',
              locked && i === answer && 'border-brand bg-brand-soft text-brand-ink',
              locked && sel === i && i !== answer && 'border-danger bg-danger-soft text-danger-ink',
              locked && i !== answer && sel !== i && 'border-line opacity-50',
            )}
          >
            {!big && (
              <span
                className={clsx(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-xs font-extrabold',
                  sel === i && !locked ? 'border-sky text-sky-ink' : 'border-line text-muted',
                )}
              >
                {i + 1}
              </span>
            )}
            {o}
          </motion.button>
        ))}
      </div>
      {!locked && (
        <button className="btn-primary mt-6 w-full py-4 text-base" disabled={sel === null} onClick={() => sel !== null && onDone(sel === answer)}>
          Check
        </button>
      )}
    </div>
  )
}

/** One rank row: drag only from the grip (so the page still scrolls on touch), or tap ↑ / ↓. */
function RankRow({
  item,
  index,
  total,
  locked,
  correctIndex,
  onMove,
}: {
  item: string
  index: number
  total: number
  locked: boolean
  correctIndex: number
  onMove: (d: -1 | 1) => void
}) {
  const controls = useDragControls()
  const right = correctIndex === index
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, rotate: -1, boxShadow: '0 12px 24px rgba(0,0,0,0.15)' }}
      className={clsx(
        'flex items-center gap-2 rounded-2xl border-2 border-b-4 bg-surface py-2 pr-2 pl-3 font-bold select-none',
        !locked && 'border-line',
        locked && right && 'border-brand bg-brand-soft',
        locked && !right && 'border-danger bg-danger-soft',
      )}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sky-soft text-xs font-extrabold text-sky-ink">{index + 1}</span>
      <span className="min-w-0 flex-1 py-1 leading-snug">{item}</span>
      {locked ? (
        right ? (
          <Check size={20} strokeWidth={3} className="mr-2 text-brand-ink" />
        ) : (
          <span className="mr-2 text-xs font-extrabold text-danger-ink">#{correctIndex + 1}</span>
        )
      ) : (
        <>
          <span className="flex flex-col">
            <button className="grid h-8 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 disabled:opacity-25" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move "${item}" up`}>
              <ChevronUp size={20} strokeWidth={3} />
            </button>
            <button className="grid h-8 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 disabled:opacity-25" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Move "${item}" down`}>
              <ChevronDown size={20} strokeWidth={3} />
            </button>
          </span>
          <span
            className="grid h-12 w-8 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
            onPointerDown={(e) => controls.start(e)}
            aria-hidden
          >
            <GripVertical size={20} />
          </span>
        </>
      )}
    </Reorder.Item>
  )
}

function shuffled<T>(xs: T[]): T[] {
  if (xs.length < 2) return xs
  let out = xs
  do {
    out = [...xs].sort(() => Math.random() - 0.5)
  } while (out.every((x, i) => x === xs[i]))
  return out
}

function Rank({ prompt, items, locked, onDone }: { prompt: string; items: string[]; locked: boolean; onDone: (ok: boolean) => void }) {
  const [order, setOrder] = useState(() => shuffled(items))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    play('tap')
    setOrder(next)
  }
  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.16em] text-sky-ink uppercase">Put in order · drag the handle or use the arrows</p>
      <h2 className="mt-2 mb-6 font-display text-2xl font-bold sm:text-[28px] sm:leading-tight">{prompt}</h2>
      <Reorder.Group axis="y" values={order} onReorder={locked ? () => {} : setOrder} className="space-y-2.5">
        {order.map((item, i) => (
          <RankRow key={item} item={item} index={i} total={order.length} locked={locked} correctIndex={items.indexOf(item)} onMove={(d) => move(i, d)} />
        ))}
      </Reorder.Group>
      {!locked && (
        <button className="btn-primary mt-6 w-full py-4 text-base" onClick={() => onDone(order.every((x, i) => x === items[i]))}>
          Check order
        </button>
      )}
    </div>
  )
}

function LessonDone({
  lessonTitle,
  result,
  correct,
  total,
}: {
  lessonTitle: string
  result: { xp: number; unlocked: number; score: number }
  correct: number
  total: number
}) {
  const stars = starsFor(result.score)
  const [line] = useState(() => pick('lessonDone'))
  return (
    <div className="pt-2 text-center">
      <div className="flex justify-center">
        <Cappy mood="cheer" size={150} />
      </div>
      <div className="-mt-1 flex justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <motion.span
            key={s}
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2 + 0.15 * s, type: 'spring', damping: 9 }}
            className={clsx('text-5xl', s > stars && 'opacity-20 grayscale')}
          >
            ⭐
          </motion.span>
        ))}
      </div>
      <h1 className="mt-4 font-display text-4xl font-bold text-gold-ink">Lesson complete!</h1>
      <p className="mt-1 font-bold text-muted">
        {lessonTitle} · {line}
      </p>
      <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
        <DoneTile label="Total XP" value={`+${result.xp}`} tone="gold" />
        <DoneTile label="Accuracy" value={`${total ? Math.round((correct / total) * 100) : 100}%`} tone="brand" />
        <DoneTile label="New cards" value={String(result.unlocked)} tone="sky" />
      </div>
      {result.unlocked > 0 && (
        <p className="mx-auto mt-5 max-w-sm text-sm font-semibold text-muted">
          {result.unlocked} flashcards joined your review queue. Cappy will bring them back right before you'd forget.
        </p>
      )}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {result.unlocked > 0 && (
          <Link to="/review" className="btn-ghost py-3.5">
            <Layers size={18} /> Review new cards
          </Link>
        )}
        <Link to="/path" className="btn-primary py-3.5">
          Continue
        </Link>
      </div>
    </div>
  )
}

const DONE_TONE = {
  gold: 'border-gold bg-gold text-on-color',
  brand: 'border-brand bg-brand text-on-color',
  sky: 'border-sky bg-sky text-white',
}

function DoneTile({ label, value, tone }: { label: string; value: string; tone: keyof typeof DONE_TONE }) {
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className={clsx('overflow-hidden rounded-2xl border-2', DONE_TONE[tone])}>
      <div className="py-1 text-[11px] font-extrabold tracking-wider uppercase">{label}</div>
      <div className="bg-surface py-3 font-display text-2xl font-bold text-ink">{value}</div>
    </motion.div>
  )
}
