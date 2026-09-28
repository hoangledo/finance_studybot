import { motion } from 'framer-motion'
import { Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { MISSION_BY_ID, MISSION_GROUPS, MISSIONS, type MissionGroup } from '../../content/missions'
import { useMissionProgress } from '../../db/hooks'
import { completeMission, toggleMissionStep } from '../../db/missionActions'
import { Bar, Modal, PageHeader } from '../../components/ui'
import { CappySays } from '../../components/mascot/SpeechBubble'
import type { MissionProgress } from '../../types'
import { play } from '../gamify/sounds'

export function MissionsPage() {
  const progress = useMissionProgress()
  const { hash } = useLocation()
  // Links like /missions#open-hysa (from the coach) open that mission directly.
  const [openId, setOpenId] = useState<string | null>(() => (hash && MISSION_BY_ID[hash.slice(1)] ? hash.slice(1) : null))
  if (!progress) return null
  const completed = MISSIONS.filter((m) => progress[m.id]?.completedAt).length

  return (
    <>
      <PageHeader title="Missions" subtitle="Small real-world actions that turn what you learn into money habits." />
      <CappySays mood={completed ? 'cheer' : 'wave'} size={72} className="mb-5">
        <span className="text-sm">
          {completed === 0
            ? 'Knowing is half of it — doing is the other half. Pick one mission to start this week!'
            : `${completed} of ${MISSIONS.length} missions done. Your future self is cheering!`}
        </span>
      </CappySays>

      <div className="space-y-6">
        {(Object.keys(MISSION_GROUPS) as MissionGroup[]).map((g) => (
          <section key={g}>
            <h2 className="font-display text-lg font-bold">{MISSION_GROUPS[g].title}</h2>
            <p className="mb-2 text-sm text-muted">{MISSION_GROUPS[g].subtitle}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {MISSIONS.filter((m) => m.group === g).map((m) => {
                const p = progress[m.id]
                const n = p?.stepsDone.length ?? 0
                const done = !!p?.completedAt
                return (
                  <button
                    key={m.id}
                    onClick={() => setOpenId(m.id)}
                    className={clsx('card flex items-center gap-3 p-4 text-left transition active:translate-y-0.5', done && 'border-gold bg-gold-soft')}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl">{m.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold leading-snug">{m.title}</span>
                      {done ? (
                        <span className="mt-1 flex items-center gap-1 text-xs font-extrabold text-gold-ink">
                          <Check size={14} strokeWidth={3} /> Complete · +{m.xp} XP earned
                        </span>
                      ) : (
                        <>
                          <Bar value={n / m.steps.length} color="var(--gold)" className="mt-2 h-2.5" />
                          <span className="mt-1 block text-xs font-bold text-muted">
                            {n}/{m.steps.length} steps · +{m.xp} XP
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <MissionSheet missionId={openId} progress={openId ? progress[openId] : undefined} onClose={() => setOpenId(null)} />
    </>
  )
}

export function MissionSheet({ missionId, progress, onClose }: { missionId: string | null; progress?: MissionProgress; onClose: () => void }) {
  const m = missionId ? MISSION_BY_ID[missionId] : null
  const done = new Set(progress?.stepsDone ?? [])
  const complete = !!progress?.completedAt
  const allTicked = m ? done.size === m.steps.length : false
  return (
    <Modal open={!!m} onClose={onClose} title={m ? `${m.emoji} ${m.title}` : ''}>
      {m && (
        <div>
          <p className="text-[15px]">{m.why}</p>
          <Link to={m.lessonId ? `/lesson/${m.lessonId}` : `/concept/${m.conceptId}`} onClick={onClose} className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-extrabold text-sky-ink">
            <ExternalLink size={14} /> {m.lessonId ? 'Review the lesson' : 'Read about it'}
          </Link>
          <ul className="mt-3 space-y-2">
            {m.steps.map((s, i) => {
              const on = done.has(i)
              return (
                <li key={i}>
                  <button
                    disabled={complete}
                    onClick={() => {
                      play(on ? 'tap' : 'correct')
                      toggleMissionStep(m.id, i)
                    }}
                    className={clsx(
                      'flex min-h-12 w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition',
                      on ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-2',
                    )}
                    aria-pressed={on}
                  >
                    <motion.span
                      animate={on ? { scale: [1, 1.25, 1] } : {}}
                      className={clsx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2', on ? 'border-brand bg-brand text-on-color' : 'border-line')}
                    >
                      {on && <Check size={16} strokeWidth={3.5} />}
                    </motion.span>
                    <span>
                      <span className={clsx('block font-bold', on && 'text-brand-ink')}>{s.text}</span>
                      {s.tip && <span className="mt-0.5 block text-xs text-muted">{s.tip}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {complete ? (
            <p className="mt-4 rounded-2xl bg-gold-soft p-3 text-center font-extrabold text-gold-ink">🏅 Mission complete — nice work!</p>
          ) : (
            <button className="btn-sun mt-4 w-full py-3.5" disabled={!allTicked} onClick={() => completeMission(m.id)}>
              {allTicked ? `Complete mission · +${m.xp} XP` : `Tick all ${m.steps.length} steps to finish`}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted">FinQuest never asks for account numbers or passwords — do these in your bank’s own app.</p>
        </div>
      )}
    </Modal>
  )
}
