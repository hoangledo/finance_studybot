import { useEffect, useState, type ReactNode } from 'react'

/**
 * Chart series colors, validated (CVD + contrast) against each theme's surface.
 * Light: on #ffffff. Dark: on #16252f.
 */
const VIZ = {
  light: { a: '#0f9f73', b: '#2b86d9', c: '#e0662f', grid: '#efebe0', axis: '#7b8189', surface: '#ffffff' },
  dark: { a: '#1aa679', b: '#5b8def', c: '#d0673a', grid: '#24394a', axis: '#8ea3af', surface: '#16252f' },
}

export function useViz() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark ? VIZ.dark : VIZ.light
}

export type Unit = 'money' | 'percent' | 'plain'

const HARD_MAX: Record<Unit, number> = { money: 1e9, percent: 1, plain: 1e6 }

/** Stored value → text shown in the box (percents are stored as fractions: 0.07 → "7"). */
function toText(v: number, unit: Unit, step: number) {
  if (unit === 'percent') {
    const decimals = Math.max(0, Math.ceil(-Math.log10(step * 100) - 1e-9))
    return String(Number((v * 100).toFixed(Math.min(decimals, 2))))
  }
  return String(Number(v.toFixed(2)))
}

/**
 * A slider paired with a number box you can type into. Typed values may go beyond the
 * slider's range (the slider pins to its end); only hard limits apply: no negatives,
 * percents ≤ 100, and the optional `hardMin`/`hardMax`.
 */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = 'plain',
  hardMin,
  hardMax,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: Unit
  hardMin?: number
  hardMax?: number
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const lo = hardMin ?? Math.min(0, min)
  const hi = hardMax ?? HARD_MAX[unit]
  const commit = () => {
    if (draft === null) return
    const n = Number(draft.replace(/[$,%\s]/g, ''))
    if (draft.trim() !== '' && Number.isFinite(n)) {
      const v = unit === 'percent' ? n / 100 : n
      onChange(Math.min(hi, Math.max(lo, v)))
    }
    setDraft(null)
  }
  const outOfRange = value > max || value < min
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-extrabold text-muted">{label}</span>
        <span className="relative">
          {unit === 'money' && <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs font-bold text-muted">$</span>}
          <input
            className={`w-24 rounded-lg border-2 bg-surface py-0.5 text-right font-display text-sm font-bold tabular-nums outline-none focus:border-sky ${
              unit === 'money' ? 'pl-5' : 'pl-2'
            } ${unit === 'percent' ? 'pr-6' : 'pr-2'} ${outOfRange ? 'border-gold' : 'border-line'}`}
            inputMode="decimal"
            value={draft ?? toText(value, unit, step)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label={`${label} value`}
            title={outOfRange ? 'Custom value outside the slider range' : undefined}
          />
          {unit === 'percent' && <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs font-bold text-muted">%</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand)]"
        aria-label={label}
      />
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'bad' | 'gold' }) {
  const color = tone === 'good' ? 'text-brand-ink' : tone === 'bad' ? 'text-danger-ink' : tone === 'gold' ? 'text-gold-ink' : 'text-ink'
  return (
    <div className="rounded-2xl border-2 border-line px-3 py-2.5">
      <div className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</div>
      <div className={`font-display text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-0.5 w-4 rounded-full" style={{ background: color, height: 3 }} />
      {label}
    </span>
  )
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormat,
  valueFormat,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string | number
  labelFormat: (l: string | number) => string
  valueFormat: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border-2 border-line bg-surface px-3 py-2 text-xs font-bold shadow-lg">
      <div className="mb-1 font-semibold">{labelFormat(label ?? '')}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums">{valueFormat(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`
