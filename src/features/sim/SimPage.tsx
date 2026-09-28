import { AnimatePresence, motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../../db/db'
import { saveSimRun } from '../../db/simActions'
import { compactUsd, usd } from '../../lib/finance'
import {
  applyChoice,
  createGame,
  currentEvent,
  essentials,
  finalResult,
  flexible,
  liveYear,
  netWorth,
  takeHome,
  YEARS,
  type Allocation,
  type SimResult,
  type SimState,
} from '../../lib/sim'
import { LESSON_BY_ID } from '../../content/lessons'
import { Bar, PageHeader } from '../../components/ui'
import { Cappy } from '../../components/mascot/Cappy'
import { CappySays } from '../../components/mascot/SpeechBubble'
import { ChartTooltip, useViz } from '../widgets/common'
import { play } from '../gamify/sounds'

const KEY = 'finquest.simGame'
type Saved = { state: SimState; phase: 'event' | 'plan'; alloc: Allocation }

const PRESETS: { label: string; alloc: Allocation }[] = [
  { label: 'Balanced', alloc: { fun: 20, emergency: 20, debt: 30, invest: 30 } },
  { label: 'Debt first', alloc: { fun: 10, emergency: 15, debt: 60, invest: 15 } },
  { label: 'Investor', alloc: { fun: 15, emergency: 10, debt: 20, invest: 55 } },
  { label: 'Live it up', alloc: { fun: 70, emergency: 10, debt: 10, invest: 10 } },
]
const BUCKETS: { key: keyof Allocation; label: string; emoji: string; color: string; hint: string }[] = [
  { key: 'fun', label: 'Fun & lifestyle', emoji: '🎉', color: 'var(--grape)', hint: 'Keeps you happy' },
  { key: 'emergency', label: 'Emergency fund', emoji: '🛟', color: 'var(--sky)', hint: 'Earns 4%, absorbs surprises' },
  { key: 'debt', label: 'Extra debt payments', emoji: '💳', color: 'var(--danger)', hint: 'Beats 22% interest (extra → investing)' },
  { key: 'invest', label: 'Investing', emoji: '📈', color: 'var(--brand)', hint: 'Index funds; bumpy but grows' },
]

function load(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    return s?.state?.eventOrder ? s : null
  } catch {
    return null
  }
}
function persist(s: Saved | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode: the game just won't resume */
  }
}

export function SimPage() {
  const [game, setGame] = useState<Saved | null>(load)
  const [result, setResult] = useState<{ state: SimState; r: SimResult; xp: number } | null>(null)
  useEffect(() => persist(game), [game])

  const start = () => {
    play('tap')
    setResult(null)
    setGame({ state: createGame(Math.floor(Math.random() * 1e9)), phase: 'event', alloc: PRESETS[0].alloc })
    window.scrollTo({ top: 0 })
  }

  const finish = async (state: SimState) => {
    const r = finalResult(state)
    setGame(null)
    setResult({ state, r, xp: 0 })
    window.scrollTo({ top: 0 })
    const { xp } = await saveSimRun(state.seed, r)
    setResult({ state, r, xp })
  }

  return (
    <>
      <PageHeader title="Life Simulator" subtitle="Ten years of money choices in ten minutes. Mistakes here are free." />
      {result ? (
        <Results {...result} onAgain={start} />
      ) : game ? (
        <Game
          saved={game}
          onChange={setGame}
          onFinish={finish}
          onQuit={() => {
            setGame(null)
          }}
        />
      ) : (
        <Intro onStart={start} />
      )}
    </>
  )
}

/* ───────────── Intro ───────────── */

function Intro({ onStart }: { onStart: () => void }) {
  const runs = useLiveQuery(() => db.simRuns.orderBy('finishedAt').reverse().limit(5).toArray(), [])
  const best = useLiveQuery(async () => (await db.simRuns.toArray()).sort((a, b) => b.score - a.score)[0], [])
  return (
    <div className="space-y-5">
      <CappySays mood="wave" size={80}>
        <span className="text-sm">
          You’re <b>22</b>, earning <b>$50,000</b>, with <b>$8,000</b> of credit-card debt at 22%. Each year you’ll face one life event, then split your spare money.
          Can you reach age 32 rich <i>and</i> happy?
        </span>
      </CappySays>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['🎲', '10 years', 'One event and one budget choice per year'],
          ['📊', 'Real math', '22% card interest, 4% savings, real-ish market years'],
          ['🏅', 'Score & grade', `Net worth + happiness. XP once a day`],
        ].map(([e, t, b]) => (
          <div key={t} className="card p-4">
            <div className="text-2xl">{e}</div>
            <div className="mt-1 font-extrabold">{t}</div>
            <p className="text-sm text-muted">{b}</p>
          </div>
        ))}
      </div>
      <button className="btn-primary w-full py-4 text-lg sm:w-auto sm:px-10" onClick={onStart}>
        Start my life
      </button>
      {runs && runs.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg font-bold">Your runs</h2>
          {best && (
            <p className="mb-2 text-sm text-muted">
              Best: <b className="text-ink">{best.score} pts</b> · grade {best.grade} · {usd(best.netWorthCents / 100)}
            </p>
          )}
          <ul className="divide-y-2 divide-line">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted">{new Date(r.finishedAt).toLocaleDateString()}</span>
                <span className="font-bold tabular-nums">{usd(r.netWorthCents / 100)}</span>
                <GradeChip grade={r.grade} small />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ───────────── Game ───────────── */

function Game({ saved, onChange, onFinish, onQuit }: { saved: Saved; onChange: (s: Saved) => void; onFinish: (s: SimState) => void; onQuit: () => void }) {
  const { state: s, phase, alloc } = saved
  const ev = currentEvent(s)
  const last = s.log.at(-1)
  const prevNw = s.log.length > 1 ? s.log[s.log.length - 2].netWorth : netWorth(createGame(s.seed))

  const choose = (i: number) => {
    play('tap')
    onChange({ ...saved, state: applyChoice(s, i), phase: 'plan' })
  }
  const live = () => {
    const next = liveYear(s, alloc)
    play('correct')
    if (next.year >= YEARS) onFinish(next)
    else onChange({ ...saved, state: next, phase: 'event' })
    if (next.year < YEARS) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-extrabold">
          <span>
            Year {s.year + 1} of {YEARS} · age {s.age}
          </span>
          <button className="min-h-10 px-2 text-xs font-bold text-muted underline" onClick={onQuit}>
            Quit
          </button>
        </div>
        <Bar value={s.year / YEARS} className="h-2.5" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Net worth" value={usd(netWorth(s))} tone={netWorth(s) >= 0 ? 'good' : 'bad'} />
          <Mini label="Salary" value={compactUsd(s.salary)} />
          <Mini label="Card debt" value={usd(s.debt)} tone={s.debt > 0 ? 'bad' : 'good'} />
          <Mini label="Happiness" value={`${s.happiness} ${s.happiness >= 70 ? '😄' : s.happiness >= 40 ? '🙂' : '😣'}`} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
          <span>🛟 Cash {usd(s.cash)}</span>
          <span>📈 Invested {usd(s.invested)}</span>
        </div>
      </div>

      {phase === 'event' && last && s.year > 0 && (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          <b>Last year:</b> the market {last.marketReturn >= 0 ? 'rose' : 'fell'} {Math.abs(Math.round(last.marketReturn * 100))}% and your net worth went{' '}
          <b className={last.netWorth >= prevNw ? 'text-brand-ink' : 'text-danger-ink'}>
            {last.netWorth >= prevNw ? '+' : '−'}
            {usd(Math.abs(last.netWorth - prevNw))}
          </b>
          .
        </p>
      )}

      <AnimatePresence mode="wait">
        {phase === 'event' && ev ? (
          <motion.div key={`e${s.year}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card p-5">
            <div className="text-4xl">{ev.emoji}</div>
            <h2 className="mt-2 font-display text-xl font-bold">{ev.title}</h2>
            <p className="text-muted">{ev.body}</p>
            <div className="mt-4 grid gap-2">
              {ev.choices.map((c, i) => (
                <button key={c.label} className="flex min-h-14 flex-col items-start rounded-2xl border-2 border-line p-3 text-left transition hover:bg-surface-2 active:translate-y-0.5" onClick={() => choose(i)}>
                  <span className="font-extrabold">{c.label}</span>
                  <span className="text-xs text-muted">{c.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={`p${s.year}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-sky-soft p-4">
              <Cappy mood="think" size={48} className="shrink-0" />
              <p className="text-sm">
                <b>{s.pendingChoice}.</b> {s.pendingNote}
              </p>
            </div>
            <Planner state={s} alloc={alloc} onAlloc={(a) => onChange({ ...saved, alloc: a })} />
            <button className="btn-primary w-full py-4 text-lg" onClick={live}>
              {s.year + 1 === YEARS ? 'Live the final year →' : `Live year ${s.year + 1} →`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Planner({ state, alloc, onAlloc }: { state: SimState; alloc: Allocation; onAlloc: (a: Allocation) => void }) {
  const flex = flexible(state)
  const total = alloc.fun + alloc.emergency + alloc.debt + alloc.invest || 1
  return (
    <div className="card p-5">
      <h3 className="font-display text-lg font-bold">Split your spare money</h3>
      <p className="text-sm text-muted">
        Take-home {usd(takeHome(state))} − essentials {usd(essentials(state))}
        {state.matchJoined && ` − 401(k) ${usd(state.salary * 0.06)}`} = <b className="text-ink">{usd(flex)}</b> to decide on this year.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={clsx('min-h-10 rounded-full border-2 px-3 text-xs font-extrabold', JSON.stringify(p.alloc) === JSON.stringify(alloc) ? 'border-sky bg-sky-soft text-sky-ink' : 'border-line')}
            onClick={() => onAlloc(p.alloc)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-4">
        {BUCKETS.map((b) => {
          const share = alloc[b.key] / total
          return (
            <div key={b.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-extrabold">
                  {b.emoji} {b.label}
                </span>
                <span className="font-display font-bold tabular-nums">
                  {Math.round(share * 100)}% · {usd(flex * share)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={alloc[b.key]}
                onChange={(e) => onAlloc({ ...alloc, [b.key]: Number(e.target.value) })}
                className="h-8 w-full"
                style={{ accentColor: b.color }}
                aria-label={b.label}
              />
              <p className="text-xs text-muted">{b.hint}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-2xl border-2 border-line px-3 py-2">
      <div className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</div>
      <div className={clsx('font-display font-bold tabular-nums', tone === 'good' && 'text-brand-ink', tone === 'bad' && 'text-danger-ink')}>{value}</div>
    </div>
  )
}

/* ───────────── Results ───────────── */

const GRADE_TEXT: Record<SimResult['grade'], string> = {
  A: 'Money wizard! Debt gone, cushion built, investments compounding — and you enjoyed life.',
  B: 'Strong decade. A few tweaks and you’d be a wizard.',
  C: 'Solid start. The 22% debt or small investments held you back.',
  D: 'You stayed afloat, but money worked against you. Try a different split!',
  F: 'Debt snowballed. It happens to real people — the lessons below show the way out.',
}

function GradeChip({ grade, small }: { grade: string; small?: boolean }) {
  const tone = grade === 'A' || grade === 'B' ? 'bg-brand-soft text-brand-ink' : grade === 'C' ? 'bg-gold-soft text-gold-ink' : 'bg-danger-soft text-danger-ink'
  return <span className={clsx('grid place-items-center rounded-2xl font-display font-bold', tone, small ? 'h-8 w-8 text-sm' : 'h-20 w-20 text-5xl')}>{grade}</span>
}

function Results({ state, r, xp, onAgain }: { state: SimState; r: SimResult; xp: number; onAgain: () => void }) {
  const v = useViz()
  const data = [{ age: 22, netWorth: netWorth(createGame(state.seed)) }, ...state.log.map((l) => ({ age: l.age, netWorth: Math.round(l.netWorth) }))]
  return (
    <div className="space-y-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card flex items-center gap-4 p-5">
        <GradeChip grade={r.grade} />
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-muted">Age 32 · {r.score} points</div>
          <div className={clsx('font-display text-3xl font-bold tabular-nums', r.netWorth >= 0 ? 'text-brand-ink' : 'text-danger-ink')}>{usd(r.netWorth)}</div>
          <div className="text-sm text-muted">
            net worth · happiness {r.happiness}/100{xp > 0 && <b className="text-gold-ink"> · +{xp} XP</b>}
          </div>
        </div>
      </motion.div>
      <CappySays mood={r.grade === 'A' || r.grade === 'B' ? 'cheer' : r.grade === 'C' ? 'happy' : 'oops'} size={64}>
        <span className="text-sm">{GRADE_TEXT[r.grade]}</span>
      </CappySays>

      <div className="card p-5">
        <h2 className="font-display text-lg font-bold">Net worth by age</h2>
        <div className="mt-2 h-52">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={v.grid} vertical={false} />
              <XAxis dataKey="age" stroke={v.axis} tick={{ fill: v.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(x: number) => (x < 0 ? `−${compactUsd(-x)}` : compactUsd(x))} width={52} stroke={v.axis} tick={{ fill: v.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
              <ReferenceLine y={0} stroke={v.axis} strokeDasharray="3 3" />
              <Tooltip content={<ChartTooltip labelFormat={(l) => `Age ${l}`} valueFormat={(x) => usd(x)} />} cursor={{ stroke: v.axis, strokeDasharray: '3 3' }} />
              <Line name="Net worth" dataKey="netWorth" stroke={v.a} strokeWidth={2} dot={{ r: 3, fill: v.a, stroke: v.surface, strokeWidth: 2 }} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {r.lessons.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display text-lg font-bold">What to learn from this run</h2>
          <ul className="mt-2 space-y-2">
            {r.lessons.map((l) => (
              <li key={l.lessonId}>
                <Link to={`/lesson/${l.lessonId}`} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border-2 border-line p-3 hover:bg-surface-2">
                  <span>
                    <span className="block font-extrabold">{LESSON_BY_ID[l.lessonId]?.title ?? 'Lesson'}</span>
                    <span className="text-xs text-muted">{l.why}</span>
                  </span>
                  <span className="text-sky-ink">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-display text-lg font-bold">Your decade</h2>
        <ol className="mt-2 space-y-2">
          {state.log.map((l) => (
            <li key={l.year} className="flex gap-3 text-sm">
              <span className="w-14 shrink-0 font-extrabold text-muted">Age {l.age - 1}</span>
              <span>
                <b>{l.choice}.</b> <span className="text-muted">{l.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <button className="btn-primary w-full py-4 text-lg" onClick={onAgain}>
        Play again
      </button>
    </div>
  )
}
