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

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-extrabold text-muted">{label}</span>
        <span className="font-display text-sm font-bold tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand)]"
      />
    </label>
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
