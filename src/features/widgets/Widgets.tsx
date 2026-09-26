import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { motion } from 'framer-motion'
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

export const WIDGET_META: Record<WidgetId, { title: string; blurb: string; icon: string }> = {
  budget: { title: '50/30/20 Budget', blurb: 'Split a paycheck into needs, wants, and savings.', icon: '🧾' },
  compound: { title: 'Compound Growth', blurb: 'See why starting 10 years earlier matters.', icon: '🌱' },
  fees: { title: 'Fee Monster', blurb: 'How expense ratios eat your returns.', icon: '👹' },
  rothTrad: { title: 'Roth vs Traditional', blurb: 'Pay tax now or later?', icon: '⚖️' },
  debt: { title: 'Debt Payoff Race', blurb: 'Avalanche vs snowball, head to head.', icon: '❄️' },
  fire: { title: 'Years to FI', blurb: 'Savings rate → years until work is optional.', icon: '🔥' },
}

export function Widget({ id }: { id: WidgetId }) {
  switch (id) {
    case 'budget':
      return <BudgetWidget />
    case 'compound':
      return <CompoundWidget />
    case 'fees':
      return <FeesWidget />
    case 'rothTrad':
      return <RothTradWidget />
    case 'debt':
      return <DebtWidget />
    case 'fire':
      return <FireWidget />
  }
}

const axisProps = (color: string) => ({
  stroke: color,
  tick: { fill: color, fontSize: 11 },
  tickLine: false,
  axisLine: false,
})

/* ───────────── Budget ───────────── */

function BudgetWidget() {
  const [pay, setPay] = useState(4000)
  const [needs, setNeeds] = useState(0.5)
  const [wants, setWants] = useState(0.3)
  const v = useViz()
  const w = Math.min(wants, 1 - needs)
  const s = budgetSplit(pay, needs, w)
  const segs = [
    { k: 'Needs', v: s.needs, p: needs, c: v.b },
    { k: 'Wants', v: s.wants, p: w, c: v.c },
    { k: 'Savings & debt', v: s.savings, p: 1 - needs - w, c: v.a },
  ]
  const savingsRate = 1 - needs - w
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Monthly take-home" value={pay} onChange={setPay} min={1000} max={15000} step={100} format={(x) => usd(x)} />
        <Slider label="Needs" value={needs} onChange={setNeeds} min={0.2} max={0.8} step={0.01} format={pct} />
        <Slider label="Wants" value={w} onChange={setWants} min={0} max={1 - needs} step={0.01} format={pct} />
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
          <div key={g.k} className="rounded-xl bg-surface-2/70 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
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

function CompoundWidget() {
  const [monthly, setMonthly] = useState(500)
  const [rate, setRate] = useState(0.07)
  const [early, setEarly] = useState(25)
  const late = early + 10
  const v = useViz()
  const data = useMemo(() => {
    const a = growthSeries(0, monthly, rate, 65 - early)
    const b = growthSeries(0, monthly, rate, 65 - late)
    return a.map((p) => ({
      age: early + p.year,
      early: p.balance,
      late: p.year >= 10 ? b[p.year - 10]?.balance ?? null : null,
    }))
  }, [monthly, rate, early, late])
  const last = data[data.length - 1]
  const earlyExtra = monthly * 12 * 10
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Monthly investment" value={monthly} onChange={setMonthly} min={50} max={3000} step={50} format={(x) => usd(x)} />
        <Slider label="Annual return" value={rate} onChange={setRate} min={0.02} max={0.1} step={0.005} format={(x) => pct(x, 1)} />
        <Slider label="Early starter's age" value={early} onChange={setEarly} min={18} max={45} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={`Start at ${early}`} value={compactUsd(last.early)} tone="good" />
        <Stat label={`Start at ${late}`} value={compactUsd(last.late ?? 0)} />
        <Stat label="Head start worth" value={compactUsd(last.early - (last.late ?? 0))} tone="gold" />
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
            <Tooltip
              content={<ChartTooltip labelFormat={(l) => `Age ${l}`} valueFormat={(x) => usd(x)} />}
              cursor={{ stroke: v.axis, strokeDasharray: '3 3' }}
            />
            <Line name={`Start at ${early}`} dataKey="early" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            <Line name={`Start at ${late}`} dataKey="late" stroke={v.b} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted">
        The early starter invests only {usd(earlyExtra)} more, yet ends with {compactUsd(last.early - (last.late ?? 0))} more at 65.
      </p>
    </div>
  )
}

/* ───────────── Fees ───────────── */

function FeesWidget() {
  const [principal, setPrincipal] = useState(50_000)
  const [monthly, setMonthly] = useState(500)
  const [fee, setFee] = useState(0.01)
  const years = 30
  const ret = 0.07
  const low = 0.0004
  const v = useViz()
  const { data, lost } = useMemo(() => {
    const cheap = feeDrag(principal, monthly, ret - low, fee - low, years)
    return { data: cheap.series, lost: cheap.lost }
  }, [principal, monthly, fee])
  const end = data[data.length - 1]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Starting balance" value={principal} onChange={setPrincipal} min={0} max={500_000} step={5000} format={compactUsd} />
        <Slider label="Monthly investment" value={monthly} onChange={setMonthly} min={0} max={3000} step={50} format={(x) => usd(x)} />
        <Slider label="Your fund's expense ratio" value={fee} onChange={setFee} min={0.0004} max={0.02} step={0.0001} format={(x) => pct(x, 2)} />
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
            <Tooltip
              content={<ChartTooltip labelFormat={(l) => `Year ${l}`} valueFormat={(x) => usd(x)} />}
              cursor={{ stroke: v.axis, strokeDasharray: '3 3' }}
            />
            <Line name="0.04% index fund" dataKey="noFee" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            <Line name={`${pct(fee, 2)} fund`} dataKey="withFee" stroke={v.c} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted">
        Over {years} years at {pct(ret)} gross, a {pct(fee, 2)} fee costs you <strong className="text-danger-ink">{pct(lost / end.noFee)}</strong> of your
        ending wealth.
      </p>
    </div>
  )
}

/* ───────────── Roth vs Traditional ───────────── */

function RothTradWidget() {
  const [amount, setAmount] = useState(7000)
  const [taxNow, setTaxNow] = useState(0.22)
  const [taxLater, setTaxLater] = useState(0.12)
  const [years, setYears] = useState(30)
  const v = useViz()
  const r = rothVsTraditional(amount, 0.07, years, taxNow, taxLater)
  const max = Math.max(r.roth, r.traditional)
  const bars = [
    { k: 'Roth', val: r.roth, c: v.a, note: `pay ${pct(taxNow)} now` },
    { k: 'Traditional', val: r.traditional, c: v.b, note: `pay ${pct(taxLater)} later` },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Pre-tax dollars" value={amount} onChange={setAmount} min={1000} max={30000} step={500} format={(x) => usd(x)} />
        <Slider label="Years invested" value={years} onChange={setYears} min={5} max={45} />
        <Slider label="Marginal tax rate NOW" value={taxNow} onChange={setTaxNow} min={0} max={0.37} step={0.01} format={pct} />
        <Slider label="Tax rate in RETIREMENT" value={taxLater} onChange={setTaxLater} min={0} max={0.37} step={0.01} format={pct} />
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
              <motion.div
                className="h-full rounded-lg"
                style={{ background: b.c }}
                animate={{ width: `${(b.val / max) * 100}%` }}
                transition={{ type: 'spring', damping: 20 }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="rounded-xl bg-surface-2/70 px-4 py-3 text-sm font-semibold">
        {r.winner === 'tie' || Math.abs(r.roth - r.traditional) < 1
          ? '🤝 Same tax rate = identical result. The order you multiply in doesn\'t matter!'
          : r.winner === 'roth'
            ? `✅ Roth wins by ${usd(r.roth - r.traditional)} — your tax rate is lower now.`
            : `✅ Traditional wins by ${usd(r.traditional - r.roth)} — your tax rate is lower later.`}
      </p>
    </div>
  )
}

/* ───────────── Debt ───────────── */

function DebtWidget() {
  const [debts, setDebts] = useState<Debt[]>([
    { name: 'Visa', balance: 6000, rate: 0.24, minPayment: 150 },
    { name: 'Store card', balance: 1200, rate: 0.18, minPayment: 40 },
    { name: 'Car loan', balance: 9000, rate: 0.065, minPayment: 220 },
  ])
  const [budget, setBudget] = useState(800)
  const v = useViz()
  const minTotal = debts.reduce((s, d) => s + d.minPayment, 0)
  const b = Math.max(budget, minTotal)
  const av = useMemo(() => payoffPlan(debts, b, 'avalanche'), [debts, b])
  const sb = useMemo(() => payoffPlan(debts, b, 'snowball'), [debts, b])
  const data = useMemo(() => {
    const n = Math.max(av.series.length, sb.series.length)
    return Array.from({ length: n }, (_, i) => ({
      month: i,
      avalanche: av.series[i]?.total ?? 0,
      snowball: sb.series[i]?.total ?? 0,
    }))
  }, [av, sb])
  const up = (i: number, patch: Partial<Debt>) => setDebts(debts.map((d, j) => (j === i ? { ...d, ...patch } : d)))

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="pb-1 font-semibold">Debt</th>
              <th className="pb-1 font-semibold">Balance</th>
              <th className="pb-1 font-semibold">APR %</th>
              <th className="pb-1 font-semibold">Minimum</th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <input className="input py-1.5" value={d.name} onChange={(e) => up(i, { name: e.target.value })} />
                </td>
                <td className="py-1 pr-2">
                  <input className="input py-1.5" type="number" value={d.balance} onChange={(e) => up(i, { balance: Number(e.target.value) })} />
                </td>
                <td className="py-1 pr-2">
                  <input className="input py-1.5" type="number" step="0.1" value={+(d.rate * 100).toFixed(2)} onChange={(e) => up(i, { rate: Number(e.target.value) / 100 })} />
                </td>
                <td className="py-1">
                  <input className="input py-1.5" type="number" value={d.minPayment} onChange={(e) => up(i, { minPayment: Number(e.target.value) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Slider label="Total monthly payment budget" value={b} onChange={setBudget} min={minTotal} max={minTotal + 3000} step={25} format={(x) => usd(x)} />
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
            <Tooltip
              content={<ChartTooltip labelFormat={(l) => `Month ${l}`} valueFormat={(x) => usd(x)} />}
              cursor={{ stroke: v.axis, strokeDasharray: '3 3' }}
            />
            <Line name="Avalanche" dataKey="avalanche" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            <Line name="Snowball" dataKey="snowball" stroke={v.b} strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted">
        Payoff order — avalanche: <strong>{av.order.join(' → ')}</strong> · snowball: <strong>{sb.order.join(' → ')}</strong>
      </p>
    </div>
  )
}

/* ───────────── FIRE ───────────── */

function FireWidget() {
  const [income, setIncome] = useState(80_000)
  const [rate, setRate] = useState(0.25)
  const [ret, setRet] = useState(0.05)
  const [swr, setSwr] = useState(0.04)
  const v = useViz()
  const years = yearsToFI(income, rate, ret, swr)
  const curve = useMemo(
    () =>
      Array.from({ length: 17 }, (_, i) => {
        const sr = 0.05 + i * 0.05
        return { sr: Math.round(sr * 100), years: +yearsToFI(income, sr, ret, swr).toFixed(1) }
      }),
    [income, ret, swr],
  )
  const expenses = income * (1 - rate)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Take-home income" value={income} onChange={setIncome} min={20_000} max={300_000} step={1000} format={compactUsd} />
        <Slider label="Savings rate" value={rate} onChange={setRate} min={0.05} max={0.85} step={0.01} format={pct} />
        <Slider label="Real return (after inflation)" value={ret} onChange={setRet} min={0.02} max={0.08} step={0.005} format={(x) => pct(x, 1)} />
        <Slider label="Withdrawal rate" value={swr} onChange={setSwr} min={0.03} max={0.05} step={0.0025} format={(x) => pct(x, 2)} />
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
            <Tooltip
              content={<ChartTooltip labelFormat={(l) => `Savings rate ${l}%`} valueFormat={(x) => `${x} years`} />}
              cursor={{ stroke: v.axis, strokeDasharray: '3 3' }}
            />
            <Line name="Years to FI" dataKey="years" stroke={v.a} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: v.surface, strokeWidth: 2 }} />
            <ReferenceDot x={Math.round(rate * 20) * 5} y={+yearsToFI(income, Math.round(rate * 20) / 20, ret, swr).toFixed(1)} r={6} fill={v.c} stroke={v.surface} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted">
        The curve shows years to financial independence at each savings rate (starting from $0). The orange dot is you. Notice how
        steep the left side is: going from 10% to 20% cuts decades.
      </p>
    </div>
  )
}
