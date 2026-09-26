import { motion } from 'framer-motion'
import clsx from 'clsx'
import { claimQuestChest } from '../../db/actions'
import { useQuests } from '../../db/hooks'
import { canClaimChest, questProgress, questsDone, QUEST_BONUS_XP } from '../../lib/quests'
import { Bar } from '../../components/ui'

export function Chest({ state, size = 56 }: { state: 'locked' | 'ready' | 'open'; size?: number }) {
  const open = state === 'open'
  return (
    <motion.svg
      viewBox="0 0 64 56"
      width={size}
      height={(size * 56) / 64}
      animate={state === 'ready' ? { rotate: [0, -8, 8, -6, 6, 0], y: [0, -3, 0] } : {}}
      transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.2 }}
      style={{ overflow: 'visible', filter: state === 'locked' ? 'grayscale(0.6) opacity(0.7)' : undefined }}
    >
      {state === 'ready' && <circle cx="32" cy="30" r="30" fill="#ffc93c" opacity="0.25" />}
      {/* base */}
      <rect x="6" y="26" width="52" height="26" rx="5" fill="#c97b3a" />
      <rect x="6" y="26" width="52" height="6" fill="#a8622b" />
      <rect x="28" y="26" width="8" height="26" fill="#ffc93c" />
      {open && (
        <>
          <ellipse cx="32" cy="27" rx="22" ry="4" fill="#3a2615" />
          <circle cx="24" cy="24" r="4" fill="#ffc93c" stroke="#e3a514" strokeWidth="1.5" />
          <circle cx="34" cy="21" r="4.5" fill="#ffc93c" stroke="#e3a514" strokeWidth="1.5" />
          <circle cx="42" cy="25" r="3.5" fill="#ffc93c" stroke="#e3a514" strokeWidth="1.5" />
        </>
      )}
      {/* lid */}
      <g transform={open ? 'rotate(-28 8 26) translate(0 -6)' : undefined}>
        <path d="M6 26 L6 16 Q6 6 18 6 L46 6 Q58 6 58 16 L58 26 Z" fill="#dd8a45" />
        <rect x="28" y="6" width="8" height="20" fill="#ffd466" />
        <rect x="27" y="20" width="10" height="10" rx="2" fill="#e3a514" />
      </g>
    </motion.svg>
  )
}

export function QuestsCard({ compact }: { compact?: boolean }) {
  const { quests, inputs, claimed } = useQuests()
  const done = questsDone(quests, inputs)
  const ready = canClaimChest(quests, inputs, claimed)
  const state = claimed ? 'open' : ready ? 'ready' : 'locked'

  return (
    <div className={clsx('card', compact ? 'p-4' : 'p-5')}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Daily Quests</h3>
        <span className="text-xs font-extrabold text-muted">
          {done}/{quests.length}
        </span>
      </div>
      <ul className="space-y-3">
        {quests.map((q) => {
          const p = questProgress(q, inputs)
          const complete = p >= q.target
          return (
            <li key={q.kind} className="flex items-center gap-3">
              <span className={clsx('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl', complete ? 'bg-gold-soft' : 'bg-surface-2')}>{q.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={clsx('truncate text-sm font-extrabold', complete && 'text-gold-ink')}>{q.title}</span>
                  <span className="shrink-0 text-xs font-bold text-muted tabular-nums">
                    {p}/{q.target}
                  </span>
                </div>
                <Bar value={p / q.target} color="var(--gold)" className="mt-1.5 h-3" />
              </div>
            </li>
          )
        })}
      </ul>
      <button
        disabled={!ready}
        onClick={() => claimQuestChest()}
        className={clsx(
          'mt-4 flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition',
          ready ? 'cursor-pointer border-gold bg-gold-soft hover:brightness-105' : 'cursor-default border-dashed border-line',
        )}
      >
        <Chest state={state} size={48} />
        <div className="text-sm">
          <div className="font-extrabold">{claimed ? 'Chest opened!' : ready ? 'Tap to open your chest!' : 'Quest chest'}</div>
          <div className="text-xs font-bold text-muted">{claimed ? `+${QUEST_BONUS_XP} XP earned. See you tomorrow!` : `Finish all quests for +${QUEST_BONUS_XP} XP`}</div>
        </div>
      </button>
    </div>
  )
}
