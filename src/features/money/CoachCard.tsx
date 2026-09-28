import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLessonProgress, useMissionProgress } from '../../db/hooks'
import { dayKey } from '../../lib/dates'
import { coachInsights } from '../../lib/coach'
import { Cappy } from '../../components/mascot/Cappy'
import { useMoney } from './useMoney'

const KEY = 'finquest.coachDismissed'
const WEEK = 7 * 86_400_000

function readDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** Cappy's money coach: the next best lesson, mission or tool based on your real numbers. */
export function CoachCard({ limit = 3, compact }: { limit?: number; compact?: boolean }) {
  const m = useMoney()
  const lessons = useLessonProgress()
  const missions = useMissionProgress()
  const [dismissed, setDismissed] = useState(readDismissed)

  const tips = useMemo(() => {
    if (!m.ready || !lessons || !missions) return []
    const now = Date.now()
    return coachInsights({
      transactions: m.transactions,
      settings: m.settings,
      today: dayKey(),
      lessonsDone: new Set(Object.keys(lessons)),
      missionsDone: new Set(Object.values(missions).filter((p) => p.completedAt).map((p) => p.missionId)),
    }).filter((t) => !(dismissed[t.id] > now))
  }, [m.ready, m.transactions, m.settings, lessons, missions, dismissed])

  if (tips.length === 0) return null
  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: Date.now() + WEEK }
    setDismissed(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-3">
        <Cappy mood="think" size={compact ? 48 : 56} className="shrink-0" />
        <div>
          <h2 className="font-display text-lg leading-tight font-bold">Cappy’s money coach</h2>
          <p className="text-xs font-bold text-muted">Based on your own numbers</p>
        </div>
      </div>
      <ul className="space-y-2.5">
        {tips.slice(0, limit).map((t) => (
          <li key={t.id} className="relative rounded-2xl border-2 border-line p-3 pr-11">
            <div className="font-extrabold">
              {t.emoji} {t.title}
            </div>
            <p className="mt-0.5 text-sm text-muted">{t.body}</p>
            <Link to={t.to} className="btn-sky mt-2.5 min-h-10 px-4 py-2 text-xs">
              {t.cta} →
            </Link>
            <button
              className="absolute top-1 right-1 grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-2"
              onClick={() => dismiss(t.id)}
              aria-label={`Hide “${t.title}” for a week`}
              title="Hide for a week"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
