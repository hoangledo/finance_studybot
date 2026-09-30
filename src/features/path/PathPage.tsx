import { motion } from 'framer-motion'
import { Check, Lock, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { LESSONS, UNITS } from '../../content/lessons'
import { useLessonProgress } from '../../db/hooks'
import { Cappy } from '../../components/mascot/Cappy'
import type { Lesson, LessonProgress } from '../../types'
import { toast } from '../gamify/fx'
import { Chest } from '../gamify/Quests'

export function isUnlocked(l: Lesson, progress: Record<string, LessonProgress>) {
  return l.requires.every((r) => progress[r])
}

export function nextLesson(progress: Record<string, LessonProgress>) {
  return LESSONS.find((l) => !progress[l.id] && isUnlocked(l, progress))
}

export function starsFor(score: number) {
  return score >= 0.99 ? 3 : score >= 0.7 ? 2 : 1
}

const UNIT_TONES = [
  { bg: 'bg-brand', edge: 'border-brand-edge', text: 'text-on-color' },
  { bg: 'bg-sky', edge: 'border-sky-edge', text: 'text-white' },
  { bg: 'bg-coral', edge: 'border-coral-edge', text: 'text-white' },
  { bg: 'bg-grape', edge: 'border-grape-edge', text: 'text-white' },
  { bg: 'bg-gold', edge: 'border-gold-edge', text: 'text-on-color' },
  { bg: 'bg-sky', edge: 'border-sky-edge', text: 'text-white' },
  { bg: 'bg-brand', edge: 'border-brand-edge', text: 'text-on-color' },
  { bg: 'bg-grape', edge: 'border-grape-edge', text: 'text-white' },
]

// Trail geometry (px)
const W = 360
const STEP = 136
const NODE = 78
const AMP = 70
const WAVE = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7]
const px = (i: number) => W / 2 + WAVE[i % WAVE.length] * AMP
const py = (i: number) => 84 + i * STEP

/** Width of an element, kept up to date (used to scale the trail on narrow phones). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(W)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function PathPage() {
  const progress = useLessonProgress()
  const next = progress ? nextLesson(progress) : undefined
  const scrolled = useRef(false)

  // Bring the next lesson into view once, so you don't have to hunt for it.
  useEffect(() => {
    if (!next || scrolled.current) return
    scrolled.current = true
    requestAnimationFrame(() => document.querySelector('[data-next-lesson]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }, [next])

  if (!progress) return null
  const doneCount = LESSONS.filter((l) => progress[l.id]).length

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold max-md:sr-only sm:text-4xl">Your Path</h1>
        <p className="text-sm text-muted md:mt-1">
          {doneCount} of {LESSONS.length} lessons · follows the r/personalfinance “Prime Directive”, then the Bogleheads way.
        </p>
      </div>
      <div className="space-y-10">
        {UNITS.map((u, ui) => (
          <UnitSection key={u.id} unitIndex={ui} progress={progress} nextId={next?.id} />
        ))}
      </div>
    </>
  )
}

function UnitSection({ unitIndex, progress, nextId }: { unitIndex: number; progress: Record<string, LessonProgress>; nextId?: string }) {
  const navigate = useNavigate()
  const u = UNITS[unitIndex]
  const tone = UNIT_TONES[unitIndex % UNIT_TONES.length]
  const lessons = LESSONS.filter((l) => l.unit === u.id)
  const done = lessons.filter((l) => progress[l.id]).length
  const unitDone = done === lessons.length
  const n = lessons.length
  const height = py(n) + 40
  const [fitRef, available] = useWidth<HTMLDivElement>()
  const scale = Math.min(1, available / W)

  // Trail segments between consecutive stops (lessons, then the chest at index n)
  const segments = Array.from({ length: n }, (_, i) => {
    const [x1, y1, x2, y2] = [px(i), py(i), px(i + 1), py(i + 1)]
    return { d: `M${x1} ${y1} C${x1} ${y1 + STEP / 2} ${x2} ${y2 - STEP / 2} ${x2} ${y2}`, lit: !!progress[lessons[i].id] }
  })

  return (
    <section>
      <div className={clsx('relative mb-4 overflow-hidden rounded-3xl border-b-[6px] px-5 py-4', tone.bg, tone.edge, tone.text)}>
        <div className="absolute -top-3 -right-2 rotate-12 text-[88px] opacity-25 select-none">{lessons[0]?.icon}</div>
        <div className="relative">
          <div className="text-xs font-extrabold tracking-[0.18em] uppercase opacity-80">
            Unit {unitIndex + 1} · {done}/{n}
          </div>
          <div className="font-display text-2xl font-bold">{u.title}</div>
          <div className="text-sm font-bold opacity-85">{u.subtitle}</div>
        </div>
      </div>

      {/* The trail is laid out at 360px and scaled down to fit narrower screens. */}
      <div ref={fitRef} className={clsx('w-full', scale < 1 && 'overflow-hidden')} style={{ height: height * scale }}>
      <div
        className={clsx('relative', scale < 1 ? 'origin-top-left' : 'mx-auto')}
        style={{ width: W, height, transform: scale < 1 ? `scale(${scale})` : undefined }}
      >
        <svg className="absolute inset-0" width={W} height={height} aria-hidden style={{ overflow: 'visible' }}>
          {segments.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={s.lit ? 'var(--gold)' : 'var(--border)'} strokeWidth="9" strokeLinecap="round" strokeDasharray="1 18" />
          ))}
        </svg>

        {lessons.map((l, i) => {
          const x = px(i)
          const y = py(i)
          const prog = progress[l.id]
          const open = isUnlocked(l, progress)
          const isNext = nextId === l.id
          const mission = l.id.startsWith('m-')
          const labelRight = x <= W / 2
          return (
            <div key={l.id}>
              {isNext && (
                <>
                  <motion.div
                    className="absolute z-10 -translate-x-1/2 rounded-xl border-2 border-line bg-surface px-3 py-1 text-xs font-extrabold tracking-wider text-brand-ink uppercase shadow-sm"
                    style={{ left: x, top: y - NODE / 2 - 40 }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                  >
                    Start
                  </motion.div>
                  <div className="absolute" style={{ top: y - 44, left: labelRight ? x - NODE / 2 - 66 : x + NODE / 2 + 4 }}>
                    <Cappy mood="wave" size={62} />
                  </div>
                  <motion.span
                    className="absolute rounded-full border-[6px] border-brand/35"
                    style={{ left: x - NODE / 2 - 10, top: y - NODE / 2 - 10, width: NODE + 20, height: NODE + 20 }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.9, 0.4, 0.9] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                  />
                </>
              )}

              <button
                onClick={() => (open ? navigate(`/lesson/${l.id}`) : toast({ kind: 'info', title: '🔒 Locked', body: 'Finish the earlier lessons first.' }))}
                aria-label={`${l.title}${!open ? ' (locked)' : ''}`}
                data-next-lesson={isNext || undefined}
                className={clsx(
                  'absolute grid place-items-center text-3xl transition-transform active:translate-y-[6px]',
                  mission ? 'rotate-45 rounded-[26px]' : 'rounded-full',
                  prog && 'bg-gold shadow-[0_6px_0_var(--gold-edge)] active:shadow-none',
                  !prog && open && (mission ? 'bg-coral shadow-[0_6px_0_var(--coral-edge)]' : 'bg-brand shadow-[0_6px_0_var(--brand-edge)]'),
                  !prog && open && 'active:shadow-none',
                  !open && 'bg-surface-2 shadow-[0_6px_0_var(--border)]',
                )}
                style={{ left: x - NODE / 2, top: y - NODE / 2, width: NODE, height: NODE }}
              >
                <span className={clsx('grid place-items-center', mission && '-rotate-45')}>
                  {!open ? (
                    <Lock size={28} strokeWidth={3} className="text-muted" />
                  ) : prog ? (
                    <Check size={36} strokeWidth={4} className="text-on-color" />
                  ) : mission ? (
                    <Star size={34} strokeWidth={0} className="fill-white" />
                  ) : (
                    <span className="drop-shadow-sm">{l.icon}</span>
                  )}
                </span>
              </button>

              <div
                className={clsx('absolute w-[124px]', labelRight ? 'text-left' : 'text-right')}
                style={{ top: y - 20, left: labelRight ? x + NODE / 2 + 12 : x - NODE / 2 - 12 - 124 }}
              >
                <div className={clsx('text-sm leading-tight font-extrabold', !open && 'text-muted')}>{l.title}</div>
                {prog ? (
                  <div className={clsx('mt-0.5 flex gap-0.5', !labelRight && 'justify-end')}>
                    {[1, 2, 3].map((s) => (
                      <Star key={s} size={14} className={s <= starsFor(prog.bestScore) ? 'fill-gold text-gold' : 'text-line'} />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-muted">{mission ? 'Mission' : l.blurb}</div>
                )}
              </div>
            </div>
          )
        })}

        {/* Unit reward chest */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: px(n), top: py(n) }}>
          <Chest state={unitDone ? 'open' : 'locked'} size={64} />
        </div>
      </div>
      </div>
    </section>
  )
}
