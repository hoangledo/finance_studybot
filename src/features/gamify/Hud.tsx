import { useLiveQuery } from 'dexie-react-hooks'
import { Snowflake } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { useProfile, useToday } from '../../db/hooks'
import { addDays, dayKey, weekKey } from '../../lib/dates'
import { levelFromXp, liveStreak, titleForLevel } from '../../lib/gamify'
import { Bar, Ring } from '../../components/ui'
import { Avatar } from '../avatar/Avatar'

function Flame({ lit, size = 22 }: { lit: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 28" width={size} height={(size * 28) / 24} aria-hidden>
      <path
        d="M12 1 C14 7 21 10 21 18 A9 9 0 0 1 3 18 C3 13 6 11 7 7 C9 10 10 11 11 11 C11 7 11 4 12 1 Z"
        fill={lit ? '#ff7a45' : 'var(--border)'}
      />
      <path d="M12 12 C13 15 17 17 17 20.5 A5 5 0 0 1 7 20.5 C7 18 9 16.5 10 15 C11 16.5 12 15 12 12 Z" fill={lit ? '#ffc93c' : 'var(--surface-2)'} />
    </svg>
  )
}

export function StreakBadge({ big }: { big?: boolean }) {
  const p = useProfile()
  const today = useToday()
  const streak = liveStreak(p, dayKey())
  const lit = today.xp > 0
  return (
    <div className="flex items-center gap-1.5" title={`${streak}-day streak · ${p.freezes} streak freeze${p.freezes === 1 ? '' : 's'}`}>
      <Flame lit={lit} size={big ? 32 : 22} />
      <span className={`font-display font-bold ${big ? 'text-3xl' : 'text-lg'} ${lit ? 'text-coral-ink' : 'text-muted'}`}>{streak}</span>
      {p.freezes > 0 && (
        <span className="ml-0.5 flex items-center text-xs font-extrabold text-sky-ink" title="Streak freezes">
          <Snowflake size={13} strokeWidth={3} />
          {p.freezes}
        </span>
      )}
    </div>
  )
}

export function LevelMeter({ compact, bare }: { compact?: boolean; bare?: boolean }) {
  const p = useProfile()
  const { level, into, needed } = levelFromXp(p.xp)
  return (
    <div className={compact ? 'w-40' : 'w-full'}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-extrabold">
          Lv {level}
          {!bare && <span className="text-muted"> · {titleForLevel(level)}</span>}
        </span>
        <span className="font-bold text-muted tabular-nums">
          {into}/{needed}
        </span>
      </div>
      <Bar value={into / needed} color="var(--grape)" className="h-3" />
    </div>
  )
}

export function GoalRing({ size = 40 }: { size?: number }) {
  const p = useProfile()
  const today = useToday()
  const v = today.xp / p.dailyGoal
  return (
    <div title={`Daily goal: ${today.xp}/${p.dailyGoal} XP`}>
      <Ring value={v} size={size} stroke={size > 60 ? 9 : 5} color={v >= 1 ? 'var(--brand)' : 'var(--gold)'}>
        <span className={size > 60 ? 'font-display text-lg font-bold' : 'text-[10px] font-extrabold'}>{v >= 1 ? '✓' : `${Math.round(v * 100)}%`}</span>
      </Ring>
    </div>
  )
}

export function MiniAvatar({ size = 36 }: { size?: number }) {
  const p = useProfile()
  return (
    <Link to="/profile" aria-label="Your profile" className="rounded-full transition hover:scale-105">
      <Avatar config={p.avatar} size={size} />
    </Link>
  )
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function StreakCard() {
  const p = useProfile()
  const today = dayKey()
  const monday = weekKey(today)
  const active =
    useLiveQuery(async () => {
      const rows = await db.activity.bulkGet(Array.from({ length: 7 }, (_, i) => addDays(monday, i)))
      return rows.map((r) => (r?.xp ?? 0) > 0)
    }, [monday]) ?? []
  const streak = liveStreak(p, today)
  const todayIdx = (new Date().getDay() + 6) % 7
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <Flame lit={!!active[todayIdx]} size={40} />
        <div>
          <div className="font-display text-2xl leading-none font-bold">{streak} day streak</div>
          <div className="mt-1 text-xs font-bold text-muted">
            {active[todayIdx] ? 'Done for today! 🎉' : 'Earn XP today to keep it going'}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-between">
        {DOW.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`text-[11px] font-extrabold ${i === todayIdx ? 'text-coral-ink' : 'text-muted'}`}>{d}</span>
            <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${active[i] ? 'bg-coral text-white' : i === todayIdx ? 'border-2 border-dashed border-coral' : 'bg-surface-2'}`}>
              {active[i] ? '✓' : ''}
            </span>
          </div>
        ))}
      </div>
      {p.freezes > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-sky-soft px-3 py-2 text-xs font-extrabold text-sky-ink">
          <Snowflake size={14} strokeWidth={3} /> {p.freezes} streak freeze{p.freezes === 1 ? '' : 's'} ready
        </div>
      )}
    </div>
  )
}

export function GoalCard() {
  const p = useProfile()
  const today = useToday()
  return (
    <div className="card flex items-center gap-4 p-5">
      <GoalRing size={68} />
      <div>
        <div className="text-xs font-extrabold tracking-wide text-muted uppercase">Daily goal</div>
        <div className="font-display text-2xl font-bold tabular-nums">
          {today.xp}
          <span className="text-base text-muted">/{p.dailyGoal} XP</span>
        </div>
      </div>
    </div>
  )
}

export function ProfileCard() {
  const p = useProfile()
  const { level } = levelFromXp(p.xp)
  return (
    <Link to="/profile" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
      <Avatar config={p.avatar} size={52} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-lg leading-tight font-bold">{titleForLevel(level)}</div>
        <LevelMeter bare />
      </div>
    </Link>
  )
}
