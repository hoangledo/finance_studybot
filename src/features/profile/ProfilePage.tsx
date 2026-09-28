import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { BarChart3, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { LESSONS } from '../../content/lessons'
import { setProfile } from '../../db/actions'
import { db } from '../../db/db'
import { useLessonProgress, useProfile } from '../../db/hooks'
import { levelFromXp, titleForLevel } from '../../lib/gamify'
import { Ring } from '../../components/ui'
import { Avatar } from '../avatar/Avatar'
import { ACCESSORIES, ANIMALS, COLORS, isUnlocked, unlockLabel, type AvatarConfig } from '../avatar/parts'
import { play } from '../gamify/sounds'
import { ACHIEVEMENTS } from '../../content/achievements'
import { AccountCard } from '../../auth/AccountCard'

type Tab = 'animal' | 'color' | 'accessory'

export function ProfilePage() {
  const profile = useProfile()
  const progress = useLessonProgress()
  const reviews = useLiveQuery(() => db.reviewLogs.count(), []) ?? 0
  const lv = levelFromXp(profile.xp)
  const [tab, setTab] = useState<Tab>('animal')
  const cfg = profile.avatar

  const update = (patch: Partial<AvatarConfig>) => {
    play('tap')
    setProfile({ avatar: { ...cfg, ...patch } })
  }

  return (
    <div className="space-y-5">
      <AccountCard />
      <div className="card overflow-hidden">
        <div className="h-24 bg-[linear-gradient(135deg,var(--sky),var(--grape))]" />
        <div className="-mt-14 flex flex-col items-center px-5 pb-6 text-center">
          <motion.div key={JSON.stringify(cfg)} initial={{ scale: 0.85, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }}>
            <div className="rounded-full border-4 border-surface bg-surface">
              <Avatar config={cfg} size={112} ring={false} />
            </div>
          </motion.div>
          <h1 className="mt-3 font-display text-3xl font-bold">{titleForLevel(lv.level)}</h1>
          <p className="text-sm text-muted">
            Level {lv.level} · {profile.xp.toLocaleString()} XP total
          </p>
          <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-3">
            <Stat label="Best streak" value={`${profile.bestStreak}🔥`} tone="text-coral-ink" />
            <Stat label="Lessons" value={`${Object.keys(progress ?? {}).length}/${LESSONS.length}`} tone="text-brand-ink" />
            <Stat label="Reviews" value={reviews.toLocaleString()} tone="text-sky-ink" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Ring value={lv.into / lv.needed} size={52} stroke={6} color="var(--grape)">
              <span className="text-xs font-extrabold">{lv.level}</span>
            </Ring>
            <span className="text-sm font-bold text-muted">
              {lv.needed - lv.into} XP to level {lv.level + 1}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-xl font-bold">Customize your avatar</h2>
        <p className="text-sm text-muted">Level up and keep your streak alive to unlock more gear.</p>
        <div className="mt-4 inline-flex rounded-2xl bg-surface-2 p-1">
          {(['animal', 'color', 'accessory'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx('min-h-10 rounded-xl px-4 py-1.5 text-sm font-extrabold capitalize transition', tab === t ? 'bg-surface shadow-sm' : 'text-muted')}
            >
              {t === 'accessory' ? 'Gear' : t}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {tab === 'animal' &&
            ANIMALS.map((a) => (
              <Choice key={a.id} selected={cfg.animal === a.id} onClick={() => update({ animal: a.id })} label={a.label}>
                <Avatar config={{ ...cfg, animal: a.id, accessory: 'none' }} size={64} />
              </Choice>
            ))}
          {tab === 'color' &&
            COLORS.map((c) => (
              <Choice key={c.id} selected={cfg.color === c.id} onClick={() => update({ color: c.id })} label={c.id}>
                <Avatar config={{ ...cfg, color: c.id }} size={64} />
              </Choice>
            ))}
          {tab === 'accessory' &&
            ACCESSORIES.map((a) => {
              const open = isUnlocked(a, lv.level, profile.bestStreak)
              return (
                <Choice
                  key={a.id}
                  selected={cfg.accessory === a.id}
                  onClick={() => open && update({ accessory: a.id })}
                  label={open ? a.label : unlockLabel(a)}
                  locked={!open}
                >
                  <div className="relative">
                    <Avatar config={{ ...cfg, accessory: a.id }} size={64} />
                    {!open && (
                      <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white">
                        <Lock size={20} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </Choice>
              )
            })}
        </div>
      </div>

      <Badges />

      <Link to="/stats" className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-soft text-gold-ink">
          <BarChart3 size={22} strokeWidth={2.6} />
        </span>
        <div className="flex-1">
          <div className="font-extrabold">Detailed stats</div>
          <div className="text-sm text-muted">Activity heatmap, review forecast, mastery by domain</div>
        </div>
        <span className="text-muted">→</span>
      </Link>
    </div>
  )
}

/** Badge collection: earned ones in color with the date, locked ones gray with how to earn them. */
function Badges() {
  const unlocked = useLiveQuery(async () => Object.fromEntries((await db.achievements.toArray()).map((a) => [a.id, a.unlockedAt])), []) ?? {}
  const count = Object.keys(unlocked).length
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(!unlocked[a.id]) - Number(!unlocked[b.id]))
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold">Badges</h2>
        <span className="text-sm font-extrabold text-muted">
          {count}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((a) => {
          const at = unlocked[a.id]
          return (
            <li key={a.id} className={clsx('rounded-2xl border-2 border-b-4 p-3 text-center', at ? 'border-gold bg-gold-soft' : 'border-line')}>
              <div className={clsx('text-3xl', !at && 'opacity-40 grayscale')}>{a.emoji}</div>
              <div className={clsx('mt-1 text-sm font-extrabold leading-tight', !at && 'text-muted')}>{a.title}</div>
              <div className="mt-0.5 text-[11px] font-bold text-muted">
                {at ? `Earned ${new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : a.hint}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border-2 border-line p-3">
      <div className={`font-display text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs font-bold text-muted">{label}</div>
    </div>
  )
}

function Choice({
  selected,
  onClick,
  label,
  locked,
  children,
}: {
  selected: boolean
  onClick: () => void
  label: string
  locked?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.button
      whileTap={locked ? { x: [0, -4, 4, 0] } : { scale: 0.93 }}
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-1.5 rounded-2xl border-2 border-b-4 p-3 transition',
        selected ? 'border-sky bg-sky-soft' : 'border-line hover:bg-surface-2',
        locked && 'cursor-not-allowed',
      )}
    >
      {children}
      <span className={clsx('text-xs font-extrabold capitalize', locked && 'text-muted')}>{label}</span>
    </motion.button>
  )
}
