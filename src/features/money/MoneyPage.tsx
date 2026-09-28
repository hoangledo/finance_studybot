import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Repeat, Settings2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import clsx from 'clsx'
import { materializeRecurring } from '../../db/moneyActions'
import { dayKey, parseDay } from '../../lib/dates'
import { BUCKET_LABEL, BUCKETS, money, periodRange, shiftPeriod, splitAdvice, summarize, type PeriodKind } from '../../lib/budget'
import { Empty, PageHeader } from '../../components/ui'
import { Cappy } from '../../components/mascot/Cappy'
import { SpeechBubble } from '../../components/mascot/SpeechBubble'
import type { Bucket, Transaction } from '../../types'
import { ChartTooltip, LegendDot, useViz } from '../widgets/common'
import { MoneySettingsSheet } from './MoneySettingsSheet'
import { TransactionSheet } from './TransactionSheet'
import { useMoney } from './useMoney'
import { useUi } from '../../app/uiStore'

export function MoneyPage() {
  const m = useMoney()
  const viz = useViz()
  const [kind, setKind] = useState<PeriodKind>('month')
  const [anchor, setAnchor] = useState(dayKey())
  const adding = useUi((s) => s.addMoneyOpen)
  const setAdding = useUi((s) => s.setAddMoneyOpen)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    materializeRecurring()
  }, [])

  // "T" opens the add sheet (like "N" for concepts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setAdding(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setAdding])

  const range = periodRange(kind, anchor, m.settings.weekStart)
  const isCurrent = range.start <= dayKey() && dayKey() <= range.end
  const summary = useMemo(() => summarize(m.transactions, range, m.categories), [m.transactions, m.categories, range])
  const advice = splitAdvice(summary, m.settings.targets)
  const colors: Record<Bucket, string> = { need: viz.b, want: viz.c, savings: viz.a }

  const trend = useMemo(() => {
    const out = []
    for (let i = 5; i >= 0; i--) {
      const r = periodRange(kind, shiftPeriod(kind, anchor, -i), m.settings.weekStart)
      const s = summarize(m.transactions, r)
      out.push({ label: kind === 'year' ? r.label : kind === 'month' ? r.label.slice(0, 3) : r.start.slice(5).replace('-', '/'), income: s.incomeCents / 100, spent: s.spentCents / 100 })
    }
    return out
  }, [m.transactions, kind, anchor, m.settings.weekStart])

  const inPeriod = m.transactions.filter((t) => t.date >= range.start && t.date <= range.end)
  const byDay = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    for (const t of inPeriod) groups.set(t.date, [...(groups.get(t.date) ?? []), t])
    return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [inPeriod])

  if (!m.ready) return null

  return (
    <>
      <PageHeader
        title="My Money"
        subtitle="Track real income and spending as needs, wants and savings."
        right={
          <div className="flex gap-2">
            <button className="btn-ghost px-3" onClick={() => setSettingsOpen(true)} aria-label="Money settings">
              <Settings2 size={18} />
            </button>
            <button className="btn-coral max-md:hidden" onClick={() => setAdding(true)}>
              <Plus size={18} strokeWidth={3} /> Add
              <kbd className="ml-1 rounded-md bg-black/15 px-1.5 text-[10px]">T</kbd>
            </button>
          </div>
        }
      />

      {/* Period switcher */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-2 bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:justify-start md:gap-3 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="inline-flex rounded-2xl bg-surface-2 p-1">
          {(['week', 'month', 'year'] as PeriodKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={clsx('min-h-10 rounded-xl px-4 py-1.5 text-sm font-extrabold capitalize', kind === k ? 'bg-surface shadow-sm' : 'text-muted')}>
              {k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button className="grid h-11 w-11 place-items-center rounded-xl hover:bg-surface-2" onClick={() => setAnchor(shiftPeriod(kind, anchor, -1))} aria-label="Previous period">
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          <span className="min-w-36 text-center font-display text-lg font-bold">{range.label}</span>
          <button className="grid h-11 w-11 place-items-center rounded-xl hover:bg-surface-2" onClick={() => setAnchor(shiftPeriod(kind, anchor, 1))} aria-label="Next period">
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        </div>
        {!isCurrent && (
          <button className="text-sm font-extrabold text-sky-ink hover:underline" onClick={() => setAnchor(dayKey())}>
            Back to today
          </button>
        )}
      </div>

      {m.transactions.length === 0 ? (
        <Empty
          mood="wave"
          title="Let's see where your money goes"
          body="Log your paycheck and a few expenses. Cappy will sort them into needs, wants and savings and compare you to your 50/30/20 targets."
          action={
            <button className="btn-coral" onClick={() => setAdding(true)}>
              <Plus size={18} strokeWidth={3} /> Add your first entry
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Income" value={money(summary.incomeCents)} tone="text-brand-ink" />
            <Tile label="Spent" value={money(summary.spentCents)} tone="text-coral-ink" hint="needs + wants" />
            <Tile label="Left over" value={money(summary.savedCents)} tone={summary.savedCents < 0 ? 'text-danger-ink' : 'text-sky-ink'} hint="income − spent" />
            <Tile
              label="Savings rate"
              value={summary.savingsRate === null ? '—' : `${Math.round(summary.savingsRate * 100)}%`}
              tone={summary.savingsRate !== null && summary.savingsRate >= m.settings.targets.savings / 100 ? 'text-brand-ink' : 'text-gold-ink'}
              hint={`target ${m.settings.targets.savings}%`}
            />
          </div>

          {/* Split vs targets */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Your split vs. targets</h2>
              <button className="-my-2 -mr-2 min-h-10 px-2 text-xs font-extrabold text-sky-ink hover:underline" onClick={() => setSettingsOpen(true)}>
                {m.settings.targets.need}/{m.settings.targets.want}/{m.settings.targets.savings} · edit
              </button>
            </div>
            <div className="relative">
              <div className="flex h-9 gap-0.5 overflow-hidden rounded-xl bg-surface-2">
                {BUCKETS.map((b) =>
                  summary.split[b] > 0 ? (
                    <motion.div
                      key={b}
                      className="flex min-w-0 items-center justify-center text-xs font-extrabold text-white"
                      style={{ background: colors[b] }}
                      initial={false}
                      animate={{ width: `${Math.min(100, summary.split[b] * 100)}%` }}
                      title={`${BUCKET_LABEL[b]}: ${Math.round(summary.split[b] * 100)}%`}
                    >
                      {summary.split[b] > 0.09 && `${Math.round(summary.split[b] * 100)}%`}
                    </motion.div>
                  ) : null,
                )}
              </div>
              {/* target markers */}
              {[m.settings.targets.need, m.settings.targets.need + m.settings.targets.want].map((p, i) => (
                <div key={i} className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-ink" style={{ left: `${p}%` }} title="Target" />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              {BUCKETS.map((b) => (
                <span key={b} className="text-xs font-bold text-muted">
                  <LegendDot color={colors[b]} label={BUCKET_LABEL[b]} />{' '}
                  <span className="text-ink tabular-nums">{Math.round(summary.split[b] * 100)}%</span> / {m.settings.targets[b]}%
                </span>
              ))}
              <span className="text-xs font-bold text-muted">▮ = target</span>
            </div>
            {summary.incomeCents > 0 && summary.spentCents > summary.incomeCents && (
              <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">
                Spending is {money(summary.spentCents - summary.incomeCents)} over income this {kind}.
              </p>
            )}
            <div className="mt-4 flex items-end gap-2">
              <Cappy mood={advice ? 'think' : summary.incomeCents ? 'happy' : 'idle'} size={60} className="shrink-0" />
              <SpeechBubble className="mb-3 text-sm">
                {summary.incomeCents === 0 ? (
                  <>Add your income for this {kind} so I can compare your split to your targets.</>
                ) : advice ? (
                  <>
                    {BUCKET_LABEL[advice.bucket]} are <strong>{Math.round(summary.split[advice.bucket] * 100)}%</strong> of income,{' '}
                    {Math.abs(advice.diffPts)} points {advice.diffPts > 0 ? 'over' : 'under'} your target.{' '}
                    <Link to="/lesson/l-budget" className="text-sky-ink underline">
                      Review Budget Basics
                    </Link>
                  </>
                ) : (
                  <>Right on target this {kind}. Budgeting like a Boglehead! 🎉</>
                )}
              </SpeechBubble>
            </div>
          </div>

          {/* Categories */}
          {summary.byCategory.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-display text-lg font-bold">Where it went</h2>
              <ul className="space-y-3">
                {summary.byCategory.map((row) => {
                  const c = m.catById.get(row.categoryId)
                  const ratio = row.ratio ?? row.cents / Math.max(1, summary.spentCents + summary.bucketCents.savings)
                  const barColor = row.ratio === undefined ? 'var(--sky)' : row.ratio > 1 ? 'var(--danger)' : row.ratio > 0.85 ? 'var(--coral)' : 'var(--brand)'
                  return (
                    <li key={row.categoryId}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-bold">
                          {c?.emoji} {c?.name ?? 'Unknown'}
                        </span>
                        <span className="shrink-0 font-bold tabular-nums">
                          {money(row.cents)}
                          {row.limitCents !== undefined && <span className="text-muted"> / {money(row.limitCents)}</span>}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                        <motion.div className="h-full rounded-full" style={{ background: barColor }} initial={false} animate={{ width: `${Math.min(1, ratio) * 100}%` }} />
                      </div>
                      {row.ratio !== undefined && row.ratio > 0.85 && (
                        <p className={clsx('mt-1 text-xs font-extrabold', row.ratio > 1 ? 'text-danger-ink' : 'text-coral-ink')}>
                          {row.ratio > 1 ? `Over limit by ${money(row.cents - row.limitCents!)}` : `${Math.round(row.ratio * 100)}% of limit used`}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Trend */}
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold">Last 6 {kind}s</h2>
            <div className="mt-1 mb-2 flex gap-4">
              <LegendDot color={viz.a} label="Income" />
              <LegendDot color={viz.c} label="Spent (needs + wants)" />
            </div>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={trend} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid stroke={viz.grid} vertical={false} />
                  <XAxis dataKey="label" stroke={viz.axis} tick={{ fill: viz.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis width={48} stroke={viz.axis} tick={{ fill: viz.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => money(v * 100, { compact: true })} />
                  <Tooltip content={<ChartTooltip labelFormat={(l) => String(l)} valueFormat={(v) => money(v * 100)} />} cursor={{ fill: viz.grid, opacity: 0.5 }} />
                  <RBar name="Income" dataKey="income" fill={viz.a} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <RBar name="Spent" dataKey="spent" fill={viz.c} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transactions */}
          <div className="card p-5">
            <h2 className="mb-2 font-display text-lg font-bold">
              Entries <span className="text-sm text-muted">({inPeriod.length})</span>
            </h2>
            {byDay.length === 0 && <p className="py-4 text-sm text-muted">Nothing logged in this {kind} yet.</p>}
            {byDay.map(([date, txns]) => (
              <div key={date} className="mt-3">
                <div className="mb-1 text-xs font-extrabold tracking-wide text-muted uppercase">{dayLabel(date)}</div>
                <ul className="divide-y-2 divide-line">
                  {txns.map((t) => {
                    const c = m.catById.get(t.categoryId)
                    return (
                      <li key={t.id}>
                        <button onClick={() => setEditing(t)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-surface-2/60">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg">{c?.emoji ?? '📦'}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold">{t.note || c?.name}</span>
                            <span className="flex items-center gap-1 text-xs font-bold text-muted">
                              {t.note ? c?.name : null}
                              {t.kind === 'expense' && t.bucket && (
                                <span className="rounded-full px-1.5" style={{ background: `color-mix(in srgb, ${colors[t.bucket]} 18%, transparent)`, color: colors[t.bucket] }}>
                                  {BUCKET_LABEL[t.bucket]}
                                </span>
                              )}
                              {t.recurringId && <Repeat size={12} aria-label="Recurring" />}
                            </span>
                          </span>
                          <span className={clsx('shrink-0 font-display text-lg font-bold tabular-nums', t.kind === 'income' ? 'text-brand-ink' : 'text-ink')}>
                            {t.kind === 'income' ? '+' : '−'}
                            {money(t.amountCents)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <TransactionSheet open={adding || !!editing} onClose={() => (setAdding(false), setEditing(null))} categories={m.categories} editing={editing} />
      <MoneySettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={m.settings} categories={m.categories} recurring={m.recurring} catById={m.catById} />
    </>
  )
}

function Tile({ label, value, tone, hint }: { label: string; value: string; tone: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-extrabold tracking-wide text-muted uppercase">{label}</div>
      <div className={clsx('mt-1 font-display text-2xl font-bold tabular-nums', tone)}>{value}</div>
      {hint && <div className="text-[11px] font-bold text-muted">{hint}</div>}
    </div>
  )
}

function dayLabel(date: string) {
  const today = dayKey()
  if (date === today) return 'Today'
  const y = parseDay(today)
  y.setDate(y.getDate() - 1)
  if (date === dayKey(y)) return 'Yesterday'
  return parseDay(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
