import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { motion } from 'framer-motion'
import { Plus, RotateCcw, Trash2, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  budgetSplit,
  compactUsd,
  feeDrag,
  growthSeries,
  payoffPlan,
  rothVsTraditional,
  usd,
  yearsToFI,
  type Debt,
} from '../../lib/finance'
import type { WidgetId } from '../../types'
import { ChartTooltip, LegendDot, pct, Slider, Stat, useViz } from './common'
import { useMyNumbers } from './useMyNumbers'
import { useToolInputs } from './useToolInputs'

export const WIDGET_META: Record<WidgetId, { title: string; blurb: string; icon: string }> = {
  budget: { title: '50/30/20 Budget', blurb: 'Split a paycheck into needs, wants, and savings.', icon: '🧾' },
  compound: { title: 'Compound Growth', blurb: 'See why starting 10 years earlier matters.', icon: '🌱' },
  fees: { title: 'Fee Monster', blurb: 'How expense ratios eat your returns.', icon: '👹' },
  rothTrad: { title: 'Roth vs Traditional', blurb: 'Pay tax now or later?', icon: '⚖️' },
  debt: { title: 'Debt Payoff Race', blurb: 'Avalanche vs snowball, head to head.', icon: '❄️' },
  fire: { title: 'Years to FI', blurb: 'Savings rate → years until work is optional.', icon: '🔥' },
}

/**
 * `persist` (Money Lab) remembers the user's inputs and shows Reset / "Use my numbers".
 * Inside lessons it's off, so every learner sees the same teaching defaults.
 */
export function Widget({ id, persist = false }: { id: WidgetId; persist?: boolean }) {
  switch (id) {
    case 'budget':
      return <BudgetWidget persist={persist} />
    case 'compound':
      return <CompoundWidget persist={persist} />
    case 'fees':
      return <FeesWidget persist={persist} />
    case 'rothTrad':
      return <RothTradWidget persist={persist} />
    case 'debt':
      return <DebtWidget persist={persist} />
    case 'fire':
      return <FireWidget persist={persist} />
  }
}

const axisProps = (color: string) => ({
  stroke: color,
  tick: { fill: color, fontSize: 11 },
  tickLine: false,
  axisLine: false,
})

/** Reset + "Use my numbers" row shown in Money Lab. */
function ToolBar({
  persist,
  isDefault,
  onReset,
  onUseMine,
  mineHint,
}: {
  persist: boolean
  isDefault: boolean
  onReset: () => void
  onUseMine?: () => void
  mineHint?: string
}) {
  const mine = useMyNumbers()
  if (!persist) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2/70 p-2">
      {onUseMine &&
        (mine ? (
          <button className="btn-sky px-3 py-2 text-xs" onClick={onUseMine} title={mineHint}>
            <Wallet size={15} strokeWidth={2.8} /> Use my numbers
          </button>
        ) : (
          <span className="px-2 text-xs font-bold text-muted">
            <Link to="/money" className="text-sky-ink underline">
              Log income & spending
            </Link>{' '}
            to fill this with your real numbers.
          </span>
        ))}
      {onUseMine && mine && <span className="text-[11px] font-bold text-muted">based on {mine.basis}</span>}
      <button className="btn-ghost ml-auto px-3 py-2 text-xs" onClick={onReset} disabled={isDefault}>
        <RotateCcw size={14} strokeWidth={2.8} /> Reset
      </button>
    </div>
  )
}

/* ───────────── Budget ───────────── */

function BudgetWidget({ persist }: { persist: boolean }) {
  const { values, set, reset, isDefault } = useToolInputs('budget', { pay: 4000, needs: 0.5, wants: 0.3 }, persist)
  const mine = useMyNumbers()
  const v = useViz()
  const { pay } = values
  const needs = Math.min(values.needs, 1)
  const w = Math.min(values.wants, 1 - needs)
  const s = budgetSplit(pay, needs, w)
  const segs = [
    { k: 'Needs', v: s.needs, p: needs, c: v.b },
    { k: 'Wants', v: s.wants, p: w, c: v.c },
    { k: 'Savings & debt', v: s.savings, p: 1 - needs - w, c: v.a },
  ]
  const savingsRate = 1 - needs - w
  return (
    <div className="space-y-4">
      <ToolBar
        persist={persist}
        isDefault={isDefault}
        onReset={reset}
        onUseMine={
          mine
            ? () =>
                set({
                  pay: Math.round(mine.monthlyIncome),
                  needs: Math.round(Math.min(1, mine.needShare) * 100) / 100,
                  wants: Math.round(Math.min(1 - Math.min(1, mine.needShare), mine.wantShare) * 100) / 100,
                })
            : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Monthly take-home" unit="money" value={pay} onChange={(x) => set({ pay: x })} min={1000} max={15000} step={100} />
        <Slider label="Needs" unit="percent" value={needs} onChange={(x) => set({ needs: x })} min={0} max={1} step={0.01} />
        <Slider label="Wants" unit="percent" value={w} onChange={(x) => set({ wants: Math.min(x, 1 - needs) })} min={0} max={1 - needs} step={0.01} />
      </div>
      <div className="flex h-12 gap-0.5 overflow-hidden rounded-xl">
        {segs.map((g) => (
          <motion.div
            key={g.k}
            className="flex min-w-0 items-center justify-center overflow-hidden text-xs font-semibold text-white"
            style={{ background: g.c }}
            animate={{ flexGrow: Math.max(g.p, 0.0001) }}
            transition={{ type: 'spring', damping: 22 }}
            title={`${g.k}: ${usd(g.v)}`}
          >
            {g.p > 0.12 && pct(g.p)}
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {segs.map((g) => (
          <div key={g.k} className="rounded-2xl border-2 border-line px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-muted uppercase">
              <span className="h-2 w-2 rounded-full" style={{ background: g.c }} />
              {g.k}
            </div>
            <div className="font-display text-lg font-bold tabular-nums">{usd(g.v)}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        {savingsRate >= 0.2
          ? `🎉 A ${pct(savingsRate)} savings rate: saving ${usd(s.savings * 12)} a year.`
          : `Savings is ${pct(savingsRate)}. Try trimming wants to reach at least 20%.`}
      </p>
    </div>
  )
}

/* ───────────── Compound ───────────── */

function CompoundWidget({ persist }: { persist: boolean }) {
  const { values, set, reset, isDefault } = useToolInputs('compound', { monthly: 500, rate: 0.07, early: 25, gap: 10, retireAge: 65 }, persist)
  const mine = useMyNumbers()
  const { monthly, rate, early, gap, retireAge } = values
  const late = early + gap
  const v = useViz()
  const years = Math.max(1, retireAge - early)
  const data = useMemo(() => {
    const a = growthSeries(0, monthly, rate, years)
    const b = growthSeries(0, monthly, rate, Math.max(0, retireAge - late))
    return a.map((p) => ({
      age: early + p.year,
      early: p.balance,
      late: p.year >= gap ? (b[p.year - gap]?.balance ?? null) : null,
    }))
  }, [monthly, rate, early, late, gap, years, retireAge])
  const last = data[data.length - 1]
  const lateEnd = last.late ?? 0
  return (
    <div className="space-y-4">
      <ToolBar
        persist={persist}
        isDefault={isDefault}
        onReset={reset}
        onUseMine={mine ? () => set({ monthly: Math.round(mine.monthlySaved) }) : undefined}
        mineHint="Sets the monthly investment to what you have left over each month"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Monthly investment" unit="money" value={monthly} onChange={(x) => set({ monthly: x })} min={50} max={3000} step={50} />
        <Slider label="Annual return" unit="percent" value={rate} onChange={(x) => set({ rate: x })} min={0.02} max={0.1} step={0.005} hardMax={0.3} />
        <Slider label="Early starter's age" value={early} onChange={(x) => set({ early: Math.round(x) })} min={18} max={45} hardMin={10} hardMax={retireAge - 1} />
        {persist && (
          <>
            <Slider label="Late starter waits (years)" value={gap} onChange={(x) => set({ gap: Math.round(x) })} min={1} max={20} hardMin={1} hardMax={Math.max(1, retireAge - early - 1)} />
            <Slider label="Retirement age" value={retireAge} onChange={(x) => set({ retireAge: Math.round(x) })} min={50} max={75} hardMin={early + 1} hardMax={100} />
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={`Start at ${early}`} value={compactUsd(last.early)} tone="good" />
        <Stat label={`Start at ${late}`} value={compactUsd(lateEnd)} />
        <Stat label="Head start worth" value={compactUsd(last.early - lateEnd)} tone="gold" />
      </div>
      <div className="flex gap-4">
        <LegendDot color={v.a} label={`Starts at ${early}`} />
        <LegendDot color={v.b} label={`Starts at ${late}`} />
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={v.grid} vertical={false} />
            <XAxis dataKey="age" {...axisProps(v.axis)} />
            <YAxis tickFormatter={compactUsd} width={52} {...axisProps(v.axis)} />
            <Tooltip content={<ChartTooltip labelFormat={(l) => `Age ${l}`} valueFormat={(x) => usd(x)} />} cursor={{ stroke: v.axis, strokeDasharray: '3 3' }} />
            <Line name={`Start at ${early}`} dataKey="early" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            <Line name={`Start at ${late}`} dataKey="late" stroke={v.b} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted">
        The early starter invests only {usd(monthly * 12 * gap)} more, yet ends with {compactUsd(last.early - lateEnd)} more at {retireAge}.
      </p>
    </div>
  )
}

/* ───────────── Fees ───────────── */

function FeesWidget({ persist }: { persist: boolean }) {
  const { values, set, reset, isDefault } = useToolInputs('fees', { principal: 50_000, monthly: 500, fee: 0.01, years: 30, ret: 0.07 }, persist)
  const { principal, monthly, fee, years, ret } = values
  const low = 0.0004
  const v = useViz()
  const { data, lost } = useMemo(() => {
    const cheap = feeDrag(principal, monthly, ret - low, Math.max(0, fee - low), Math.max(1, Math.round(years)))
    return { data: cheap.series, lost: cheap.lost }
  }, [principal, monthly, fee, years, ret])
  const end = data[data.length - 1]
  return (
    <div className="space-y-4">
      <ToolBar persist={persist} isDefault={isDefault} onReset={reset} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Starting balance" unit="money" value={principal} onChange={(x) => set({ principal: x })} min={0} max={500_000} step={5000} />
        <Slider label="Monthly investment" unit="money" value={monthly} onChange={(x) => set({ monthly: x })} min={0} max={3000} step={50} />
        <Slider label="Your fund's expense ratio" unit="percent" value={fee} onChange={(x) => set({ fee: x })} min={0.0004} max={0.02} step={0.0001} hardMax={0.1} />
        {persist && (
          <>
            <Slider label="Years invested" value={years} onChange={(x) => set({ years: Math.round(x) })} min={5} max={50} hardMin={1} hardMax={80} />
            <Slider label="Market return (before fees)" unit="percent" value={ret} onChange={(x) => set({ ret: x })} min={0.02} max={0.12} step={0.005} hardMax={0.3} />
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Index fund (0.04%)" value={compactUsd(end.noFee)} tone="good" />
        <Stat label={`At ${pct(fee, 2)}`} value={compactUsd(end.withFee)} />
        <Stat label="Eaten by fees" value={compactUsd(lost)} tone="bad" />
      </div>
      <div className="flex gap-4">
        <LegendDot color={v.a} label="0.04% index fund" />
        <LegendDot color={v.c} label={`${pct(fee, 2)} fund`} />
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={v.grid} vertical={false} />
            <XAxis dataKey="year" {...axisProps(v.axis)} />
            <YAxis tickFormatter={compactUsd} width={52} {...axisProps(v.axis)} />
            <Tooltip content={<ChartTooltip labelFormat={(l) => `Year ${l}`} valueFormat={(x) => usd(x)} />} cursor={{ stroke: v.axis, strokeDasharray: '3 3' }} />
            <Line name="0.04% index fund" dataKey="noFee" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            <Line name={`${pct(fee, 2)} fund`} dataKey="withFee" stroke={v.c} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted">
        Over {Math.round(years)} years at {pct(ret, 1)} gross, a {pct(fee, 2)} fee costs you <strong className="text-danger-ink">{pct(lost / end.noFee)}</strong> of your
        ending wealth.
      </p>
    </div>
  )
}

/* ───────────── Roth vs Traditional ───────────── */

function RothTradWidget({ persist }: { persist: boolean }) {
  const { values, set, reset, isDefault } = useToolInputs('rothTrad', { amount: 7000, taxNow: 0.22, taxLater: 0.12, years: 30, ret: 0.07 }, persist)
  const { amount, taxNow, taxLater, years, ret } = values
  const v = useViz()
  const r = rothVsTraditional(amount, ret, years, taxNow, taxLater)
  const max = Math.max(r.roth, r.traditional, 1)
  const bars = [
    { k: 'Roth', val: r.roth, c: v.a, note: `pay ${pct(taxNow)} now` },
    { k: 'Traditional', val: r.traditional, c: v.b, note: `pay ${pct(taxLater)} later` },
  ]
  return (
    <div className="space-y-4">
      <ToolBar persist={persist} isDefault={isDefault} onReset={reset} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Pre-tax dollars" unit="money" value={amount} onChange={(x) => set({ amount: x })} min={1000} max={30000} step={500} />
        <Slider label="Years invested" value={years} onChange={(x) => set({ years: Math.round(x) })} min={5} max={45} hardMin={1} hardMax={80} />
        <Slider label="Marginal tax rate NOW" unit="percent" value={taxNow} onChange={(x) => set({ taxNow: x })} min={0} max={0.37} step={0.01} hardMax={0.6} />
        <Slider label="Tax rate in RETIREMENT" unit="percent" value={taxLater} onChange={(x) => set({ taxLater: x })} min={0} max={0.37} step={0.01} hardMax={0.6} />
        {persist && <Slider label="Annual return" unit="percent" value={ret} onChange={(x) => set({ ret: x })} min={0.02} max={0.12} step={0.005} hardMax={0.3} />}
      </div>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.k}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold">
                {b.k} <span className="font-normal text-muted">({b.note})</span>
              </span>
              <span className="font-bold tabular-nums">{usd(b.val)} after tax</span>
            </div>
            <div className="h-7 rounded-lg bg-surface-2">
              <motion.div className="h-full rounded-lg" style={{ background: b.c }} animate={{ width: `${(b.val / max) * 100}%` }} transition={{ type: 'spring', damping: 20 }} />
            </div>
          </div>
        ))}
      </div>
      <p className="rounded-xl bg-surface-2/70 px-4 py-3 text-sm font-semibold">
        {r.winner === 'tie' || Math.abs(r.roth - r.traditional) < 1
          ? "🤝 Same tax rate = identical result. The order you multiply in doesn't matter!"
          : r.winner === 'roth'
            ? `✅ Roth wins by ${usd(r.roth - r.traditional)} — your tax rate is lower now.`
            : `✅ Traditional wins by ${usd(r.traditional - r.roth)} — your tax rate is lower later.`}
      </p>
    </div>
  )
}

/* ───────────── Debt ───────────── */

const DEFAULT_DEBTS: Debt[] = [
  { name: 'Visa', balance: 6000, rate: 0.24, minPayment: 150 },
  { name: 'Store card', balance: 1200, rate: 0.18, minPayment: 40 },
  { name: 'Car loan', balance: 9000, rate: 0.065, minPayment: 220 },
]

function DebtWidget({ persist }: { persist: boolean }) {
  const { values, set, reset, isDefault } = useToolInputs('debt', { debts: DEFAULT_DEBTS, budget: 800 }, persist)
  const debts = values.debts
  const v = useViz()
  const valid = debts.filter((d) => d.balance > 0)
  const minTotal = valid.reduce((s, d) => s + d.minPayment, 0)
  const tooLow = values.budget < minTotal
  const b = Math.max(values.budget, minTotal)
  const av = useMemo(() => payoffPlan(valid, b, 'avalanche'), [valid, b])
  const sb = useMemo(() => payoffPlan(valid, b, 'snowball'), [valid, b])
  const data = useMemo(() => {
    const n = Math.max(av.series.length, sb.series.length)
    return Array.from({ length: n }, (_, i) => ({ month: i, avalanche: av.series[i]?.total ?? 0, snowball: sb.series[i]?.total ?? 0 }))
  }, [av, sb])
  const up = (i: number, patch: Partial<Debt>) => set({ debts: debts.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  const num = (s: string) => Math.max(0, Number(s) || 0)
  const neverEnds = !av.feasible || !sb.feasible

  return (
    <div className="space-y-4">
      <ToolBar persist={persist} isDefault={isDefault} onReset={reset} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="pb-1 font-semibold">Debt</th>
              <th className="pb-1 font-semibold">Balance $</th>
              <th className="pb-1 font-semibold">APR %</th>
              <th className="pb-1 font-semibold">Minimum $</th>
              {persist && <th />}
            </tr>
          </thead>
          <tbody>
            {debts.map((d, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <input className="input py-1.5" value={d.name} maxLength={24} onChange={(e) => up(i, { name: e.target.value })} aria-label={`Debt ${i + 1} name`} />
                </td>
                <td className="py-1 pr-2">
                  <input className="input py-1.5" type="number" min={0} value={d.balance} onChange={(e) => up(i, { balance: num(e.target.value) })} aria-label={`${d.name} balance`} />
                </td>
                <td className="py-1 pr-2">
                  <input className="input py-1.5" type="number" min={0} step="0.1" value={+(d.rate * 100).toFixed(2)} onChange={(e) => up(i, { rate: Math.min(1, num(e.target.value) / 100) })} aria-label={`${d.name} APR`} />
                </td>
                <td className="py-1 pr-2">
                  <input className="input py-1.5" type="number" min={0} value={d.minPayment} onChange={(e) => up(i, { minPayment: num(e.target.value) })} aria-label={`${d.name} minimum payment`} />
                </td>
                {persist && (
                  <td className="py-1">
                    <button className="rounded-lg p-2 text-muted hover:text-danger-ink disabled:opacity-30" disabled={debts.length <= 1} onClick={() => set({ debts: debts.filter((_, j) => j !== i) })} aria-label={`Remove ${d.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {persist && debts.length < 10 && (
        <button className="btn-ghost py-1.5 text-xs" onClick={() => set({ debts: [...debts, { name: `Debt ${debts.length + 1}`, balance: 1000, rate: 0.2, minPayment: 30 }] })}>
          <Plus size={14} /> Add a debt
        </button>
      )}
      <Slider label="Total monthly payment budget" unit="money" value={b} onChange={(x) => set({ budget: x })} min={minTotal} max={minTotal + 3000} step={25} hardMin={0} />
      {tooLow && (
        <p className="rounded-xl bg-gold-soft px-3 py-2 text-sm font-bold text-gold-ink">
          Your budget ({usd(values.budget)}) is below the minimum payments ({usd(minTotal)}), so the minimums are used instead.
        </p>
      )}
      {neverEnds ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">
          At this budget the interest outpaces your payments, so the debt would never be paid off. Raise the budget.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Avalanche interest" value={usd(av.totalInterest)} tone="good" />
            <Stat label="Snowball interest" value={usd(sb.totalInterest)} />
            <Stat label="Avalanche saves" value={usd(sb.totalInterest - av.totalInterest)} tone="gold" />
            <Stat label="Debt-free in" value={`${av.months} mo`} />
          </div>
          <div className="flex gap-4">
            <LegendDot color={v.a} label="Avalanche (highest APR first)" />
            <LegendDot color={v.b} label="Snowball (smallest balance first)" />
          </div>
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={v.grid} vertical={false} />
                <XAxis dataKey="month" {...axisProps(v.axis)} />
                <YAxis tickFormatter={compactUsd} width={52} {...axisProps(v.axis)} />
                <Tooltip content={<ChartTooltip labelFormat={(l) => `Month ${l}`} valueFormat={(x) => usd(x)} />} cursor={{ stroke: v.axis, strokeDasharray: '3 3' }} />
                <Line name="Avalanche" dataKey="avalanche" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
                <Line name="Snowball" dataKey="snowball" stroke={v.b} strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted">
            Payoff order — avalanche: <strong>{av.order.join(' → ')}</strong> · snowball: <strong>{sb.order.join(' → ')}</strong>
          </p>
        </>
      )}
    </div>
  )
}

/* ───────────── FIRE ───────────── */

function FireWidget({ persist }: { persist: boolean }) {
  const { values, set, reset, isDefault } = useToolInputs('fire', { income: 80_000, rate: 0.25, ret: 0.05, swr: 0.04, start: 0 }, persist)
  const mine = useMyNumbers()
  const { income, rate, ret, swr, start } = values
  const v = useViz()
  const years = yearsToFI(income, rate, ret, swr, start)
  const curve = useMemo(
    () =>
      Array.from({ length: 17 }, (_, i) => {
        const sr = 0.05 + i * 0.05
        return { sr: Math.round(sr * 100), years: +yearsToFI(income, sr, ret, swr, start).toFixed(1) }
      }),
    [income, ret, swr, start],
  )
  const expenses = income * (1 - rate)
  const dotRate = Math.min(0.85, Math.max(0.05, Math.round(rate * 20) / 20))
  return (
    <div className="space-y-4">
      <ToolBar
        persist={persist}
        isDefault={isDefault}
        onReset={reset}
        onUseMine={mine ? () => set({ income: Math.round(mine.monthlyIncome * 12), rate: Math.round(Math.min(0.95, mine.savingsRate) * 100) / 100 }) : undefined}
        mineHint="Uses your average take-home income and savings rate from My Money"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Take-home income (yearly)" unit="money" value={income} onChange={(x) => set({ income: x })} min={20_000} max={300_000} step={1000} hardMin={1000} />
        <Slider label="Savings rate" unit="percent" value={rate} onChange={(x) => set({ rate: x })} min={0.05} max={0.85} step={0.01} hardMax={0.95} />
        <Slider label="Real return (after inflation)" unit="percent" value={ret} onChange={(x) => set({ ret: x })} min={0.02} max={0.08} step={0.005} hardMax={0.2} />
        <Slider label="Withdrawal rate" unit="percent" value={swr} onChange={(x) => set({ swr: x })} min={0.03} max={0.05} step={0.0025} hardMin={0.01} hardMax={0.1} />
        {persist && <Slider label="Already invested" unit="money" value={start} onChange={(x) => set({ start: x })} min={0} max={1_000_000} step={5000} />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Years to FI" value={years.toFixed(1)} tone="good" />
        <Stat label="Annual spending" value={compactUsd(expenses)} />
        <Stat label="FI number" value={compactUsd(expenses / swr)} tone="gold" />
      </div>
      <div className="h-52">
        <ResponsiveContainer>
          <LineChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={v.grid} vertical={false} />
            <XAxis dataKey="sr" tickFormatter={(x) => `${x}%`} {...axisProps(v.axis)} />
            <YAxis width={36} {...axisProps(v.axis)} />
            <Tooltip content={<ChartTooltip labelFormat={(l) => `Savings rate ${l}%`} valueFormat={(x) => `${x} years`} />} cursor={{ stroke: v.axis, strokeDasharray: '3 3' }} />
            <Line name="Years to FI" dataKey="years" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            <ReferenceDot x={Math.round(dotRate * 100)} y={+yearsToFI(income, dotRate, ret, swr, start).toFixed(1)} r={6} fill={v.c} stroke={v.surface} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted">
        The curve shows years to financial independence at each savings rate{start > 0 ? `, starting from ${compactUsd(start)} invested` : ' (starting from $0)'}. The orange dot is
        you. Notice how steep the left side is: going from 10% to 20% cuts decades.
      </p>
    </div>
  )
}
