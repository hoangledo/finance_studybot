import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { DOMAIN_META } from '../../content/concepts'
import { useCards, useConcepts } from '../../db/hooks'
import { conceptMastery, MASTERY_STYLE } from '../../lib/mastery'
import { Empty, PageHeader } from '../../components/ui'
import type { Domain } from '../../types'
import { useQuickAdd } from './QuickAdd'

export function LibraryPage() {
  const concepts = useConcepts()
  const cards = useCards()
  const openAdd = useQuickAdd((s) => s.open)
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState<Domain | 'all'>('all')
  const [scope, setScope] = useState<'all' | 'mine'>('all')

  const byConcept = useMemo(() => {
    const g: Record<string, NonNullable<typeof cards>> = {}
    for (const c of cards ?? []) (g[c.conceptId] ??= []).push(c)
    return g
  }, [cards])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (concepts ?? [])
      .filter((c) => domain === 'all' || c.domain === domain)
      .filter((c) => scope === 'all' || !c.isSeed)
      .filter((c) => !needle || c.title.toLowerCase().includes(needle) || c.summary.toLowerCase().includes(needle) || c.tags.some((t) => t.includes(needle)))
      .sort((a, b) => (a.isSeed === b.isSeed ? a.title.localeCompare(b.title) : a.isSeed ? 1 : -1))
  }, [concepts, q, domain, scope])

  if (!concepts) return null

  return (
    <>
      <PageHeader
        title="Library"
        subtitle={`${concepts.length} concepts · ${cards?.length ?? 0} cards`}
        right={
          <button className="btn-primary" onClick={() => openAdd()}>
            <Plus size={16} /> Add concept
          </button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search concepts…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={domain} onChange={(e) => setDomain(e.target.value as Domain | 'all')}>
          <option value="all">All domains</option>
          {Object.entries(DOMAIN_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.icon} {v.label}
            </option>
          ))}
        </select>
        <div className="inline-flex rounded-xl bg-surface-2 p-1">
          {(['all', 'mine'] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={clsx('min-h-10 rounded-lg px-3 py-1 text-sm font-semibold', scope === s ? 'bg-surface shadow-sm' : 'text-muted')}>
              {s === 'all' ? 'All' : 'Mine'}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty
          mood={scope === 'mine' ? 'wave' : 'think'}
          title={scope === 'mine' ? 'No concepts of your own yet' : 'Nothing matches'}
          body={scope === 'mine' ? 'Add a concept you ran into on Bogleheads or r/personalfinance. Writing it in your own words is the fastest way to learn it.' : 'Try a different search or domain.'}
          action={
            <button className="btn-primary" onClick={() => openAdd({ title: q })}>
              <Plus size={16} /> Add {q ? `"${q}"` : 'a concept'}
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const m = conceptMastery(byConcept[c.id] ?? [])
            const d = DOMAIN_META[c.domain]
            return (
              <Link key={c.id} to={`/concept/${c.id}`} className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-brand/50">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg" style={{ background: `${d.color}22` }}>
                    {d.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-tight group-hover:text-brand-ink">{c.title}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {d.label} · {(byConcept[c.id] ?? []).length} cards
                    </div>
                  </div>
                  {!c.isSeed && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold-ink">MINE</span>}
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted">{c.summary.replace(/[*_#>]/g, '')}</p>
                <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold" style={{ color: MASTERY_STYLE[m.level].color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: MASTERY_STYLE[m.level].color }} />
                  {MASTERY_STYLE[m.level].label}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
