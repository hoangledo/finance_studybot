import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Calculator, Flag, Layers, Network, Plus, Sparkles, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { DOMAIN_META } from '../../content/concepts'
import { LESSONS, UNITS } from '../../content/lessons'
import { setProfile } from '../../db/actions'
import { useCards, useConcepts, useDueCount, useLessonProgress, useProfile, useToday } from '../../db/hooks'
import { dayKey } from '../../lib/dates'
import { liveStreak } from '../../lib/gamify'
import { conceptMastery } from '../../lib/mastery'
import { Bar, Md } from '../../components/ui'
import { Cappy, type Mood } from '../../components/mascot/Cappy'
import { pick } from '../../components/mascot/lines'
import { SpeechBubble } from '../../components/mascot/SpeechBubble'
import { Avatar } from '../avatar/Avatar'
import { ANIMALS } from '../avatar/parts'
import { QuestsCard } from '../gamify/Quests'
import { useQuickAdd } from '../library/QuickAdd'
import { nextLesson } from '../path/PathPage'
import { useMoney } from '../money/useMoney'
import { money, periodRange, summarize } from '../../lib/budget'

export function HomePage() {
  const profile = useProfile()
  const today = useToday()
  const due = useDueCount()
  const progress = useLessonProgress()
  const concepts = useConcepts()
  const cards = useCards()
  const openAdd = useQuickAdd((s) => s.open)
  const navigate = useNavigate()

  const next = progress ? nextLesson(progress) : undefined
  const unit = next ? UNITS.find((u) => u.id === next.unit) : undefined
  const done = progress ? Object.keys(progress).length : 0

  const mastery = useMemo(() => {
    const grouped: Record<string, NonNullable<typeof cards>> = {}
    for (const c of cards ?? []) (grouped[c.conceptId] ??= []).push(c)
    const levels = (concepts ?? []).map((c) => conceptMastery(grouped[c.id] ?? []).level)
    return { total: levels.length, mastered: levels.filter((l) => l === 'mastered').length, started: levels.filter((l) => l !== 'locked').length }
  }, [cards, concepts])

  const cotd = useMemo(() => {
    if (!concepts?.length) return null
    const seed = [...dayKey()].reduce((s, ch) => s + ch.charCodeAt(0), 0)
    const seeds = concepts.filter((c) => c.isSeed)
    return seeds[seed % seeds.length] ?? concepts[0]
  }, [concepts])

  // Cappy's mood and line depend on how the day is going.
  const hour = new Date().getHours()
  const streak = liveStreak(profile, dayKey())
  const goalDone = today.xp >= profile.dailyGoal
  const atRisk = streak > 0 && today.xp === 0 && hour >= 18
  const daySeed = [...dayKey()].reduce((s, ch) => s + ch.charCodeAt(0), 0)
  const [mood, line]: [Mood, string] = goalDone
    ? ['cheer', pick('goalDone', daySeed)]
    : atRisk
      ? ['sleepy', pick('atRisk', daySeed)]
      : [hour < 12 ? 'wave' : 'happy', pick(hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening', daySeed)]

  if (!profile.onboarded) return <Onboarding />

  return (
    <div className="space-y-5">
      {/* Cappy hero */}
      <div className="flex items-end gap-3">
        <Cappy mood={mood} size={120} className="shrink-0" />
        <SpeechBubble className="mb-8">
          <div className="font-display text-xl leading-snug sm:text-2xl">{line}</div>
          <div className="mt-1 text-xs font-extrabold tracking-wide text-muted uppercase">
            {streak > 0 ? `🔥 ${streak}-day streak` : 'Start a streak today'} · {today.xp}/{profile.dailyGoal} XP today
          </div>
        </SpeechBubble>
      </div>

      {/* Jump back in */}
      {next ? (
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ y: 4 }}
          onClick={() => navigate(`/lesson/${next.id}`)}
          className="group relative w-full overflow-hidden rounded-3xl border-b-[6px] border-brand-edge bg-brand p-6 text-left text-on-color"
        >
          <div className="absolute -top-4 -right-2 rotate-12 text-[120px] opacity-20 select-none">{next.icon}</div>
          <div className="relative">
            <div className="text-xs font-extrabold tracking-[0.18em] uppercase opacity-75">
              Jump back in · {unit?.title}
            </div>
            <div className="mt-1 font-display text-3xl font-bold">{next.title}</div>
            <div className="mt-0.5 font-bold opacity-80">{next.blurb}</div>
            <div className="mt-5 flex items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold tracking-wide text-[#0b8a62] uppercase shadow-[0_4px_0_rgba(0,0,0,0.15)]">
                Start lesson <ArrowRight size={16} strokeWidth={3} className="transition group-hover:translate-x-1" />
              </span>
              <div className="flex-1">
                <div className="mb-1 text-xs font-extrabold opacity-75">
                  {done}/{LESSONS.length} lessons
                </div>
                <Bar value={done / LESSONS.length} color="#fff" className="h-3 bg-black/15" />
              </div>
            </div>
          </div>
        </motion.button>
      ) : (
        <div className="rounded-3xl border-b-[6px] border-gold-edge bg-gold p-6 text-on-color">
          <div className="text-4xl">🏆</div>
          <div className="mt-2 font-display text-3xl font-bold">Path complete!</div>
          <p className="mt-1 font-bold opacity-80">Keep reviewing to master everything, and add your own concepts.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/review" className="card group flex flex-col p-5 transition hover:-translate-y-0.5">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-white">
              <Layers size={20} strokeWidth={2.6} />
            </span>
            <span className="text-xs font-extrabold tracking-wide text-muted uppercase">Memory cards</span>
          </div>
          <div className="mt-3 font-display text-5xl font-bold text-sky-ink tabular-nums">{due}</div>
          <div className="text-sm font-bold text-muted">{due === 1 ? 'card is' : 'cards are'} ready for review</div>
          <span className={clsx('mt-4 self-start', due > 0 ? 'btn-sky' : 'btn-ghost')}>
            {due > 0 ? 'Review now' : 'All caught up'} <ArrowRight size={16} strokeWidth={3} />
          </span>
        </Link>

        <Link to="/map" className="card group flex flex-col p-5 transition hover:-translate-y-0.5">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-on-color">
              <Network size={20} strokeWidth={2.6} />
            </span>
            <span className="text-xs font-extrabold tracking-wide text-muted uppercase">Knowledge map</span>
          </div>
          <div className="mt-3 font-display text-5xl font-bold text-gold-ink tabular-nums">
            {mastery.mastered}
            <span className="text-2xl text-muted">/{mastery.total}</span>
          </div>
          <div className="text-sm font-bold text-muted">concepts mastered · {mastery.started} started</div>
          <Bar value={mastery.started / Math.max(1, mastery.total)} color="var(--gold)" className="mt-4" />
        </Link>
      </div>

      <div className="lg:hidden">
        <QuestsCard compact />
      </div>

      <MoneySnapshot />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/missions" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold text-on-color">
            <Flag size={24} strokeWidth={2.6} />
          </span>
          <div>
            <div className="font-extrabold">Missions</div>
            <div className="text-sm text-muted">Real-world steps: open a HYSA, grab the match…</div>
          </div>
        </Link>
        <Link to="/tools" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-grape text-white">
            <Calculator size={24} strokeWidth={2.6} />
          </span>
          <div>
            <div className="font-extrabold">Money Lab</div>
            <div className="text-sm text-muted">Compounding, fees, Roth vs Traditional, FIRE</div>
          </div>
        </Link>
        <button onClick={() => openAdd()} className="card flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coral text-white">
            <Plus size={26} strokeWidth={3} />
          </span>
          <div>
            <div className="font-extrabold">Add your own concept</div>
            <div className="flex items-center gap-1 text-sm text-muted">
              <Sparkles size={13} className="text-gold-ink" /> Optional AI drafting · press N
            </div>
          </div>
        </button>
        <Link to="/library" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 md:hidden">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky text-white">
            <BookOpen size={24} strokeWidth={2.6} />
          </span>
          <div>
            <div className="font-extrabold">Library</div>
            <div className="text-sm text-muted">Browse every concept and your own notes</div>
          </div>
        </Link>
      </div>

      {cotd && (
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <Cappy mood="think" size={64} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-extrabold tracking-wide text-muted uppercase">
                  {pick('funFact', daySeed)} {DOMAIN_META[cotd.domain].icon}
                </div>
                <Link to={`/concept/${cotd.id}`} className="-my-2 inline-flex min-h-10 items-center px-2 text-sm font-extrabold text-sky-ink">
                  Open →
                </Link>
              </div>
              <h3 className="font-display text-xl font-bold">{cotd.title}</h3>
              <Md className="mt-1 line-clamp-3 text-sm text-muted">{cotd.summary}</Md>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const GOALS = [
  { xp: 30, label: 'Casual', note: '~5 min/day', emoji: '🐢' },
  { xp: 50, label: 'Regular', note: '~10 min/day', emoji: '🚶' },
  { xp: 100, label: 'Serious', note: '~20 min/day', emoji: '🏃' },
  { xp: 150, label: 'Intense', note: '~30 min/day', emoji: '🚀' },
]

function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'hello' | 'avatar' | 'goal'>('hello')
  const [animal, setAnimal] = useState(ANIMALS[0].id)
  const start = async (goal: number) => {
    await setProfile({ onboarded: true, dailyGoal: goal, avatar: { animal, color: 'sky', accessory: 'none' } })
    navigate('/lesson/l-budget')
  }
  return (
    <div className="mx-auto max-w-xl pt-2 text-center">
      <div className="flex justify-center">
        <Cappy mood={step === 'goal' ? 'cheer' : 'wave'} size={150} />
      </div>
      {step === 'hello' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <SpeechBubble tail="bottom" className="mx-auto mt-2 max-w-md">
            <span className="font-display text-xl">{pick('welcome')}</span>
          </SpeechBubble>
          <h1 className="mt-6 font-display text-4xl font-bold">
            Welcome to <span className="text-brand-ink">finquest</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Bite-sized lessons, memory cards that stick, a map of how money ideas connect, and calculators that make it click — the Bogleheads way.
          </p>
          <button className="btn-primary mt-8 w-full max-w-xs py-4 text-base" onClick={() => setStep('avatar')}>
            Let's go!
          </button>
        </motion.div>
      )}
      {step === 'avatar' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mt-4 font-display text-3xl font-bold">Pick your buddy</h1>
          <p className="mt-1 text-muted">You can dress them up later as you level up.</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {ANIMALS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAnimal(a.id)}
                className={clsx('flex flex-col items-center gap-2 rounded-2xl border-2 border-b-4 p-3', animal === a.id ? 'border-sky bg-sky-soft' : 'border-line')}
              >
                <Avatar config={{ animal: a.id, color: 'sky', accessory: 'none' }} size={72} />
                <span className="text-sm font-extrabold">{a.label}</span>
              </button>
            ))}
          </div>
          <button className="btn-primary mt-6 w-full max-w-xs py-4 text-base" onClick={() => setStep('goal')}>
            Continue
          </button>
        </motion.div>
      )}
      {step === 'goal' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mt-4 font-display text-3xl font-bold">Pick a daily goal</h1>
          <p className="mt-1 text-muted">Small and steady beats big and rare. Just like investing.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {GOALS.map((g) => (
              <motion.button
                key={g.xp}
                whileHover={{ y: -3 }}
                whileTap={{ y: 3 }}
                onClick={() => start(g.xp)}
                className="rounded-2xl border-2 border-b-4 border-line bg-surface p-4 hover:border-brand hover:bg-brand-soft"
              >
                <div className="text-3xl">{g.emoji}</div>
                <div className="font-display text-lg font-bold">{g.label}</div>
                <div className="text-sm font-extrabold text-gold-ink">{g.xp} XP / day</div>
                <div className="text-xs text-muted">{g.note}</div>
              </motion.button>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">Everything is stored privately in this browser. Back it up anytime from Settings.</p>
        </motion.div>
      )}
    </div>
  )
}

/** This month's money at a glance, or a nudge to start tracking. */
function MoneySnapshot() {
  const m = useMoney()
  if (!m.ready) return null
  const range = periodRange('month', dayKey(), m.settings.weekStart)
  const s = summarize(m.transactions, range, m.categories)
  return (
    <Link to="/money" className="card flex flex-wrap items-center gap-4 p-5 transition hover:-translate-y-0.5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coral text-white">
        <Wallet size={24} strokeWidth={2.6} />
      </span>
      {s.count === 0 ? (
        <div className="min-w-0 flex-1">
          <div className="font-extrabold">Track your real money</div>
          <div className="text-sm text-muted">Log income and spending to see your own 50/30/20 split.</div>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-extrabold tracking-wide text-muted uppercase">{range.label}</div>
            <div className="font-display text-xl font-bold">
              {money(s.spentCents)} <span className="text-base text-muted">spent of {money(s.incomeCents)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-extrabold tracking-wide text-muted uppercase">Savings rate</div>
            <div className={clsx('font-display text-2xl font-bold', (s.savingsRate ?? 0) >= m.settings.targets.savings / 100 ? 'text-brand-ink' : 'text-gold-ink')}>
              {s.savingsRate === null ? '—' : `${Math.round(s.savingsRate * 100)}%`}
            </div>
          </div>
        </>
      )}
      <ArrowRight size={18} className="text-muted" />
    </Link>
  )
}
