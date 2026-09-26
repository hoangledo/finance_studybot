import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DOMAIN_META } from '../../content/concepts'
import { LESSONS } from '../../content/lessons'
import { db } from '../../db/db'
import { useCards, useConcepts, useLessonProgress, useProfile } from '../../db/hooks'
import { addDays, dayKey, parseDay } from '../../lib/dates'
import { levelFromXp, titleForLevel } from '../../lib/gamify'
import { conceptMastery } from '../../lib/mastery'
import { Bar, PageHeader } from '../../components/ui'
import type { Domain } from '../../types'
import { ChartTooltip, useViz } from '../widgets/common'

const WEEKS = 20
// Sequential single-hue ramp (brand green), light → dark, per theme.
const HEAT_LIGHT = ['#f4f1e8', '#c4f1df', '#7fe0bb', '#1ed39a', '#0f9f73']
const HEAT_DARK = ['#1e313e', '#15493a', '#1a7355', '#27a077', '#4fd6a4']

export function StatsPage() {
  const profile = useProfile()
  const activity = useLiveQuery(() => db.activity.toArray(), [])
  const totalReviews = useLiveQuery(() => db.reviewLogs.count(), [])
  const cards = useCards()
  const concepts = useConcepts()
  const progress = useLessonProgress()
  const viz = useViz()
  const dark = viz.surface !== '#ffffff'
  const heat = dark ? HEAT_DARK : HEAT_LIGHT

  const byDay = useMemo(() => Object.fromEntries((activity ?? []).map((a) => [a.day, a])), [activity])

  const grid = useMemo(() => {
    const today = dayKey()
    const dow = (parseDay(today).getDay() + 6) % 7
    const start = addDays(today, -(WEEKS - 1) * 7 - dow)
    return Array.from({ length: WEEKS }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const key = addDays(start, w * 7 + d)
        return { key, xp: byDay[key]?.xp ?? 0, reviews: byDay[key]?.reviews ?? 0, future: key > today }
      }),
    )
  }, [byDay])

  const level = (xp: number) => (xp === 0 ? 0 : xp < 20 ? 1 : xp < profile.dailyGoal ? 2 : xp < profile.dailyGoal * 2 ? 3 : 4)

  const forecast = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => ({ day: addDays(dayKey(), i), count: 0 }))
    const end = parseDay(days[6].day).getTime() + 86_400_000
    for (const c of cards ?? []) {
      if (c.locked) continue
      const t = new Date(c.fsrs.due).getTime()
      if (t >= end) continue
      const k = t < Date.now() ? days[0].day : dayKey(new Date(t))
      const slot = days.find((d) => d.day === k)
      if (slot) slot.count++
    }
    return days.map((d, i) => ({ label: i === 0 ? 'Today' : parseDay(d.day).toLocaleDateString(undefined, { weekday: 'short' }), count: d.count }))
  }, [cards])

  const domainRows = useMemo(() => {
    const grouped: Record<string, NonNullable<typeof cards>> = {}
    for (const c of cards ?? []) (grouped[c.conceptId] ??= []).push(c)
    const rows: Record<string, { total: number; score: number }> = {}
    for (const c of concepts ?? []) {
      const r = (rows[c.domain] ??= { total: 0, score: 0 })
      r.total++
      r.score += conceptMastery(grouped[c.id] ?? []).score
    }
    return (Object.keys(DOMAIN_META) as Domain[]).filter((d) => rows[d]).map((d) => ({ d, pct: rows[d].score / rows[d].total, n: rows[d].total }))
  }, [cards, concepts])

  const lv = levelFromXp(profile.xp)
  const activeDays = (activity ?? []).filter((a) => a.xp > 0).length
  const learned = (cards ?? []).filter((c) => !c.locked && c.fsrs.reps > 0).length

  return (
    <>
      <PageHeader title="Stats" subtitle={`Level ${lv.level} · ${titleForLevel(lv.level)}`} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total XP', profile.xp.toLocaleString()],
          ['Best streak', `${profile.bestStreak} ${profile.bestStreak === 1 ? 'day' : 'days'}`],
          ['Reviews', (totalReviews ?? 0).toLocaleString()],
          ['Cards learned', learned],
          ['Lessons', `${Object.keys(progress ?? {}).length}/${LESSONS.length}`],
          ['Active days', activeDays],
          ['Concepts', concepts?.length ?? 0],
          ['Your concepts', (concepts ?? []).filter((c) => !c.isSeed).length],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-4 font-display font-semibold">Activity</h2>
        <div className="overflow-x-auto">
          <div className="flex gap-[3px]">
            <div className="mr-1 flex flex-col gap-[3px] text-[10px] text-muted">
              {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => (
                <div key={i} className="h-3.5 leading-[14px]">
                  {d}
                </div>
              ))}
            </div>
            {grid.map((week, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {week.map((cell) => (
                  <div
                    key={cell.key}
                    title={cell.future ? '' : `${parseDay(cell.key).toLocaleDateString()}: ${cell.xp} XP, ${cell.reviews} reviews`}
                    className="h-3.5 w-3.5 rounded-[3px]"
                    style={{ background: cell.future ? 'transparent' : heat[level(cell.xp)] }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          Less
          {heat.map((c) => (
            <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
          ))}
          More
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display font-semibold">Reviews due · next 7 days</h2>
          <p className="mb-3 text-xs text-muted">Overdue cards count toward today.</p>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={forecast} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={viz.grid} vertical={false} />
                <XAxis dataKey="label" stroke={viz.axis} tick={{ fill: viz.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke={viz.axis} tick={{ fill: viz.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip labelFormat={(l) => String(l)} valueFormat={(v) => `${v} cards`} />} cursor={{ fill: viz.grid, opacity: 0.5 }} />
                <RBar name="Due" dataKey="count" fill={viz.a} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-display font-semibold">Mastery by domain</h2>
          <div className="space-y-3">
            {domainRows.map((r) => (
              <div key={r.d}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold">
                    {DOMAIN_META[r.d].icon} {DOMAIN_META[r.d].label}
                  </span>
                  <span className="tabular-nums text-muted">{Math.round(r.pct * 100)}%</span>
                </div>
                <Bar value={r.pct} color={viz.a} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
