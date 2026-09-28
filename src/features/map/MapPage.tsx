import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Link2, List, Network, Plus, Search, SlidersHorizontal, Trash2, Unlock, X } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { DOMAIN_META } from '../../content/concepts'
import { LESSONS } from '../../content/lessons'
import { addEdge, deleteEdge, unlockConcept } from '../../db/actions'
import { useCards, useConcepts, useEdges } from '../../db/hooks'
import { conceptMastery, MASTERY_STYLE, type MasteryLevel } from '../../lib/mastery'
import { Modal, Pill } from '../../components/ui'
import { usePhone } from '../../lib/device'
import type { Concept, Domain, EdgeType } from '../../types'
import { toast } from '../gamify/fx'
import { EDGE_LABEL, useQuickAdd } from '../library/QuickAdd'
import { useViz } from '../widgets/common'
import { GlossaryMd } from '../glossary/Glossary'

const NODE_W = 180
const NODE_H = 54

type ConceptNodeData = { concept: Concept; mastery: MasteryLevel; score: number; dim: boolean }
type ConceptNode = RFNode<ConceptNodeData, 'concept'>

const ConceptNodeView = memo(({ data, selected }: NodeProps<ConceptNode>) => {
  const m = MASTERY_STYLE[data.mastery]
  const d = DOMAIN_META[data.concept.domain]
  return (
    <div
      className={clsx(
        'relative flex h-[54px] w-[180px] items-center gap-2 rounded-2xl border-2 border-b-4 bg-surface px-2.5 transition',
        selected ? 'border-brand shadow-lg' : 'border-line',
        data.dim && 'opacity-20',
      )}
      style={{ boxShadow: data.mastery === 'mastered' ? `0 0 0 4px ${m.ring}` : undefined }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-muted" />
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base" style={{ background: `${d.color}22` }}>
        {d.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] leading-tight font-semibold">{data.concept.title}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(data.score, data.mastery === 'locked' ? 0 : 0.06) * 100}%`, background: m.color }} />
          </span>
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} title={m.label} />
        </div>
      </div>
      {!data.concept.isSeed && <span className="absolute -top-2 -right-2 rounded-full bg-gold px-1.5 text-[9px] font-extrabold text-on-color">MINE</span>}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-muted" />
    </div>
  )
})


const COLS = 2
const GAP_X = 18
const GAP_Y = 14
const PAD = 16
const HEADER = 44
const CLUSTER_W = COLS * NODE_W + (COLS - 1) * GAP_X + PAD * 2
const CLUSTERS_PER_ROW = 4
const CLUSTER_GAP = 60

// Order concepts inside a domain by where they appear in the curriculum; your own concepts go last.
const LESSON_ORDER: Record<string, number> = {}
LESSONS.forEach((l, i) => l.conceptIds.forEach((c, j) => (LESSON_ORDER[c] ??= i * 100 + j)))

type DomainNodeData = { domain: Domain; count: number }

/** Lay the map out as one cluster per knowledge domain, packed into rows. */
function layout(concepts: Concept[]) {
  const pos: Record<string, { x: number; y: number }> = {}
  const clusters: { id: string; position: { x: number; y: number }; width: number; height: number; data: DomainNodeData }[] = []
  let x = 0
  let y = 0
  let rowH = 0
  let inRow = 0
  for (const domain of Object.keys(DOMAIN_META) as Domain[]) {
    const members = concepts
      .filter((c) => c.domain === domain)
      .sort((a, b) => (LESSON_ORDER[a.id] ?? 1e9) - (LESSON_ORDER[b.id] ?? 1e9) || a.createdAt - b.createdAt)
    if (members.length === 0) continue
    const rows = Math.ceil(members.length / COLS)
    const h = HEADER + rows * NODE_H + (rows - 1) * GAP_Y + PAD
    if (inRow === CLUSTERS_PER_ROW) {
      x = 0
      y += rowH + CLUSTER_GAP
      rowH = 0
      inRow = 0
    }
    clusters.push({ id: `domain:${domain}`, position: { x, y }, width: CLUSTER_W, height: h, data: { domain, count: members.length } })
    members.forEach((c, i) => {
      pos[c.id] = {
        x: x + PAD + (i % COLS) * (NODE_W + GAP_X),
        y: y + HEADER + Math.floor(i / COLS) * (NODE_H + GAP_Y),
      }
    })
    x += CLUSTER_W + CLUSTER_GAP
    rowH = Math.max(rowH, h)
    inRow++
  }
  return { pos, clusters }
}

const DomainNodeView = memo(({ data }: NodeProps<RFNode<DomainNodeData, 'domain'>>) => {
  const d = DOMAIN_META[data.domain]
  return (
    <div className="h-full w-full rounded-3xl border-2 border-dashed" style={{ borderColor: `${d.color}55`, background: `${d.color}0d` }}>
      <div className="flex items-center gap-2 px-4 pt-3 text-sm font-bold" style={{ color: d.color }}>
        <span className="text-lg">{d.icon}</span>
        {d.label}
        <span className="ml-auto text-xs font-semibold opacity-70">{data.count}</span>
      </div>
    </div>
  )
})

export function MapPage() {
  return (
    <ReactFlowProvider>
      <MapInner />
    </ReactFlowProvider>
  )
}

const nodeTypes = { concept: ConceptNodeView, domain: DomainNodeView }

function MapInner() {
  const concepts = useConcepts()
  const edges = useEdges()
  const cards = useCards()
  const viz = useViz()
  const openAdd = useQuickAdd((s) => s.open)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [domains, setDomains] = useState<Set<Domain>>(new Set())
  const [pendingEdge, setPendingEdge] = useState<Connection | null>(null)
  const [linkFrom, setLinkFrom] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const phone = usePhone()
  const [view, setViewState] = useState<'list' | 'graph'>(() => {
    try {
      return localStorage.getItem('finquest.mapView') === 'graph' ? 'graph' : 'list'
    } catch {
      return 'list'
    }
  })
  const setView = (v: 'list' | 'graph') => {
    setViewState(v)
    try {
      localStorage.setItem('finquest.mapView', v)
    } catch {
      /* ignore */
    }
  }
  const { fitView, setCenter } = useReactFlow()

  const mastery = useMemo(() => {
    const byConcept: Record<string, ReturnType<typeof conceptMastery>> = {}
    const grouped: Record<string, NonNullable<typeof cards>> = {}
    for (const c of cards ?? []) (grouped[c.conceptId] ??= []).push(c)
    for (const c of concepts ?? []) byConcept[c.id] = conceptMastery(grouped[c.id] ?? [])
    return byConcept
  }, [cards, concepts])

  // Layout only depends on which concepts exist and their domains.
  const shapeKey = concepts?.map((c) => `${c.id}:${c.domain}`).join() ?? ''
  const { pos: positions, clusters } = useMemo(
    () => layout(concepts ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shapeKey],
  )

  const q = query.trim().toLowerCase()
  const matches = useCallback(
    (c: Concept) => (!q || c.title.toLowerCase().includes(q) || c.tags.some((t) => t.includes(q))) && (domains.size === 0 || domains.has(c.domain)),
    [q, domains],
  )

  const nodes: RFNode[] = useMemo(
    () => [
      ...clusters
        .filter((g) => domains.size === 0 || domains.has(g.data.domain))
        .map((g) => ({
          id: g.id,
          type: 'domain',
          position: g.position,
          style: { width: g.width, height: g.height },
          data: g.data,
          selectable: false,
          draggable: false,
          zIndex: -1,
        })),
      ...(concepts ?? []).map((c) => ({
        id: c.id,
        type: 'concept',
        position: positions[c.id] ?? { x: 0, y: 0 },
        selected: c.id === selected,
        data: { concept: c, mastery: mastery[c.id]?.level ?? 'locked', score: mastery[c.id]?.score ?? 0, dim: !matches(c) },
      })),
    ],
    [concepts, positions, clusters, mastery, selected, matches, domains],
  )

  const rfEdges: RFEdge[] = useMemo(
    () =>
      (edges ?? []).map((e) => {
        const active = selected && (e.from === selected || e.to === selected)
        const color = e.type === 'contrasts' ? viz.c : e.type === 'prereq' ? viz.a : e.type === 'partOf' ? viz.b : viz.axis
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          label: active ? EDGE_LABEL[e.type] : undefined,
          labelStyle: { fontSize: 10, fill: viz.axis },
          labelBgStyle: { fill: viz.surface },
          animated: !!active && e.type === 'prereq',
          style: {
            stroke: color,
            strokeWidth: active ? 2.5 : 1.25,
            strokeDasharray: e.type === 'contrasts' ? '5 4' : e.type === 'related' ? '2 3' : undefined,
            opacity: selected ? (active ? 0.95 : 0.06) : 0.35,
          },
          markerEnd: e.type === 'related' || e.type === 'contrasts' ? undefined : { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
        }
      }),
    [edges, selected, viz],
  )

  // Fit once when data first arrives.
  const ready = !!concepts && !!edges
  useEffect(() => {
    if (ready) setTimeout(() => fitView({ padding: { top: '150px', left: '20px', right: '20px', bottom: '20px' }, duration: 400 }), 50)
  }, [ready, fitView])

  // Jump to first search match.
  useEffect(() => {
    if (!q || !concepts) return
    const hit = concepts.find((c) => c.title.toLowerCase().includes(q))
    if (hit && positions[hit.id]) setCenter(positions[hit.id].x + NODE_W / 2, positions[hit.id].y + NODE_H / 2, { zoom: 1.2, duration: 500 })
  }, [q, concepts, positions, setCenter])

  const counts = useMemo(() => {
    const out: Record<MasteryLevel, number> = { locked: 0, new: 0, learning: 0, familiar: 0, mastered: 0 }
    for (const m of Object.values(mastery)) out[m.level]++
    return out
  }, [mastery])

  const sel = concepts?.find((c) => c.id === selected)
  const linkSource = concepts?.find((c) => c.id === linkFrom)
  const filterCount = domains.size
  const conceptsById = Object.fromEntries((concepts ?? []).map((c) => [c.id, c]))

  // Overlays shared by the phone and desktop layouts.
  const sheets = (
    <>
      <AnimatePresence>
        {sel && !linkFrom && !pendingEdge && (
          <ConceptPanel
            key={sel.id}
            concept={sel}
            level={mastery[sel.id]?.level ?? 'locked'}
            links={(edges ?? []).filter((e) => e.from === sel.id || e.to === sel.id)}
            conceptsById={conceptsById}
            onClose={() => setSelected(null)}
            onSelect={setSelected}
            onAddLinked={() => openAdd({ linkTo: sel.id })}
            onLinkTo={() => setLinkFrom(sel.id)}
          />
        )}
      </AnimatePresence>
      {linkSource && (
        <LinkPicker
          from={linkSource}
          concepts={concepts ?? []}
          onClose={() => setLinkFrom(null)}
          onPick={(to) => {
            setPendingEdge({ source: linkSource.id, target: to, sourceHandle: null, targetHandle: null })
            setLinkFrom(null)
          }}
        />
      )}
      {pendingEdge && (
        <EdgeTypePicker
          from={conceptsById[pendingEdge.source!]?.title ?? ''}
          to={conceptsById[pendingEdge.target!]?.title ?? ''}
          onCancel={() => setPendingEdge(null)}
          onPick={async (t) => {
            await addEdge(pendingEdge.source!, pendingEdge.target!, t)
            setPendingEdge(null)
            toast({ kind: 'info', title: '🔗 Linked!' })
          }}
        />
      )}
    </>
  )

  const toggleDomain = (d: Domain) => {
    const next = new Set(domains)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    setDomains(next)
  }

  const domainChips = (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(DOMAIN_META) as Domain[]).map((d) => {
        const on = domains.has(d)
        return (
          <button
            key={d}
            onClick={() => toggleDomain(d)}
            aria-pressed={on}
            className={clsx(
              'min-h-10 rounded-full border px-3 py-1 text-xs font-bold shadow-sm backdrop-blur transition',
              on ? 'border-transparent text-white' : 'border-line bg-surface/90 text-muted hover:text-ink',
            )}
            style={on ? { background: DOMAIN_META[d].color } : undefined}
          >
            {DOMAIN_META[d].icon} {DOMAIN_META[d].label}
          </button>
        )
      })}
    </div>
  )

  const legend = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold">
      {(Object.keys(MASTERY_STYLE) as MasteryLevel[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: MASTERY_STYLE[k].color }} />
          {MASTERY_STYLE[k].label} <span className="text-muted">{counts[k]}</span>
        </span>
      ))}
    </div>
  )

  if (phone)
    return (
      <div className="flex h-full w-full flex-col">
        {/* Phone toolbar: search, filters, graph/list */}
        <div className="flex shrink-0 items-center gap-2 border-b-2 border-line bg-bg px-3 py-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className="input py-2 pl-9" placeholder="Find a concept…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find a concept" />
          </div>
          <button className="btn-ghost relative h-11 w-11 p-0" onClick={() => setFiltersOpen(true)} aria-label="Filters and legend">
            <SlidersHorizontal size={18} />
            {filterCount > 0 && <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-sky text-[10px] font-extrabold text-white">{filterCount}</span>}
          </button>
          <div className="inline-flex shrink-0 rounded-xl bg-surface-2 p-1" role="group" aria-label="View">
            {(['list', 'graph'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={clsx('grid h-10 w-11 place-items-center rounded-lg', view === v ? 'bg-surface shadow-sm' : 'text-muted')} aria-label={v === 'list' ? 'List view' : 'Graph view'}>
                {v === 'list' ? <List size={18} /> : <Network size={18} />}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          {view === 'list' ? (
            <ConceptList concepts={concepts ?? []} mastery={mastery} matches={matches} onOpen={setSelected} />
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) => n.type === 'concept' && setSelected(n.id)}
              onPaneClick={() => setSelected(null)}
              nodesDraggable={false}
              nodesConnectable={false}
              fitView
              fitViewOptions={{ padding: 0.04 }}
              minZoom={0.15}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              colorMode={viz.surface === '#ffffff' ? 'light' : 'dark'}
            >
              <Background gap={24} size={1} color={viz.grid} />
            </ReactFlow>
          )}
        </div>

        <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters & legend">
          <div className="label">Domains</div>
          {domainChips}
          {filterCount > 0 && (
            <button className="mt-3 text-sm font-extrabold text-sky-ink" onClick={() => setDomains(new Set())}>
              Clear filters
            </button>
          )}
          <div className="label mt-5">Mastery</div>
          {legend}
          <p className="mt-5 text-xs text-muted">Tap a concept for details. Use “Link to…” in the details to connect two concepts.</p>
        </Modal>
        {sheets}
      </div>
    )

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => n.type === 'concept' && setSelected(n.id)}
        onPaneClick={() => setSelected(null)}
        onConnect={(c) => setPendingEdge(c)}
        onEdgeClick={(_, e) => setSelected(e.source)}
        nodesDraggable
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        colorMode={viz.surface === '#ffffff' ? 'light' : 'dark'}
      >
        <Background gap={24} size={1} color={viz.grid} />
        <Controls showInteractive={false} position="bottom-right" />

      </ReactFlow>

      {/* Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className="input bg-surface/95 pl-9 shadow-sm backdrop-blur" placeholder="Find a concept…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn-primary shadow-sm" onClick={() => openAdd()}>
            <Plus size={16} /> Concept
          </button>
          <div className="card px-3 py-2 shadow-sm">{legend}</div>
        </div>
        <div className="pointer-events-auto">{domainChips}</div>
        <p className="text-[11px] text-muted">Drag from a node's right dot to another node to link them, or use “Link to…” in the details. Click a node for details.</p>
      </div>
      {sheets}
    </div>
  )
}

interface PanelProps {
  concept: Concept
  level: MasteryLevel
  links: { id: string; from: string; to: string; type: EdgeType }[]
  conceptsById: Record<string, Concept>
  onClose: () => void
  onSelect: (id: string) => void
  onAddLinked: () => void
  onLinkTo: () => void
}

/** Concept details: a side panel on larger screens, a bottom sheet on phones. */
function ConceptPanel(props: PanelProps) {
  const phone = usePhone()
  if (phone)
    return (
      <Modal open onClose={props.onClose} title={props.concept.title}>
        <PanelBody {...props} />
      </Modal>
    )
  const d = DOMAIN_META[props.concept.domain]
  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="card absolute top-3 right-3 bottom-3 z-10 flex w-[min(360px,calc(100%-24px))] flex-col overflow-hidden shadow-2xl"
    >
      <div className="flex items-start gap-3 border-b border-line p-4">
        <div className="text-2xl">{d.icon}</div>
        <h3 className="min-w-0 flex-1 font-display text-lg leading-tight font-bold">{props.concept.title}</h3>
        <button onClick={props.onClose} className="-m-1 grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label="Close panel">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <PanelBody {...props} />
      </div>
    </motion.aside>
  )
}

function PanelBody({ concept, level, links, conceptsById, onSelect, onAddLinked, onLinkTo }: PanelProps) {
  const d = DOMAIN_META[concept.domain]
  const m = MASTERY_STYLE[level]
  return (
    <div className="text-sm">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Pill color={d.color}>
          {d.icon} {d.label}
        </Pill>
        <Pill color={m.color}>{m.label}</Pill>
      </div>
      <GlossaryMd exclude={concept.id}>{concept.summary}</GlossaryMd>
      <h4 className="label mt-4">Connections</h4>
      <ul className="divide-y divide-line">
        {links.map((l) => {
          const outgoing = l.from === concept.id
          const other = conceptsById[outgoing ? l.to : l.from]
          if (!other) return null
          return (
            <li key={l.id} className="group flex items-center gap-1">
              <button className="min-h-11 min-w-0 flex-1 py-1.5 text-left hover:text-brand-ink" onClick={() => onSelect(other.id)}>
                <span className="text-muted">{outgoing ? EDGE_LABEL[l.type] : `← ${EDGE_LABEL[l.type]}`}</span> <strong>{other.title}</strong>
              </button>
              <button className="reveal-on-hover grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:text-danger-ink" onClick={() => deleteEdge(l.id)} aria-label={`Remove link to ${other.title}`}>
                <Trash2 size={15} />
              </button>
            </li>
          )
        })}
        {links.length === 0 && <li className="py-2 text-muted">No links yet.</li>}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {level === 'locked' && (
          <button
            className="btn-ghost col-span-2"
            onClick={async () => {
              const n = await unlockConcept(concept.id)
              toast({ kind: 'info', title: `🔓 ${n} cards added to reviews` })
            }}
          >
            <Unlock size={15} /> Start learning
          </button>
        )}
        <button className="btn-ghost" onClick={onLinkTo}>
          <Link2 size={15} /> Link to…
        </button>
        <button className="btn-ghost" onClick={onAddLinked}>
          <Plus size={15} /> New linked
        </button>
        <Link to={`/concept/${concept.id}`} className="btn-primary col-span-2">
          <ExternalLink size={15} /> Open concept
        </Link>
      </div>
    </div>
  )
}

/** Choose the concept to link to by tapping (instead of dragging between node handles). */
function LinkPicker({ from, concepts, onPick, onClose }: { from: Concept; concepts: Concept[]; onPick: (toId: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const list = concepts
    .filter((c) => c.id !== from.id && (!needle || c.title.toLowerCase().includes(needle)))
    .sort((a, b) => a.title.localeCompare(b.title))
  return (
    <Modal open onClose={onClose} title={`Link “${from.title}” to…`}>
      <div className="relative mb-3">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input className="input pl-9" placeholder="Search concepts" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <ul className="divide-y divide-line">
        {list.map((c) => (
          <li key={c.id}>
            <button className="flex min-h-12 w-full items-center gap-3 py-2 text-left font-bold hover:text-brand-ink" onClick={() => onPick(c.id)}>
              <span className="text-lg">{DOMAIN_META[c.domain].icon}</span>
              {c.title}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-3 text-sm text-muted">No matching concepts.</li>}
      </ul>
    </Modal>
  )
}

function EdgeTypePicker({ from, to, onPick, onCancel }: { from: string; to: string; onPick: (t: EdgeType) => void; onCancel: () => void }) {
  return (
    <Modal open onClose={onCancel} title="How are these related?">
      <p className="mb-4 text-sm text-muted">
        <strong className="text-ink">{from}</strong> … <strong className="text-ink">{to}</strong>
      </p>
      <div className="grid gap-2">
        {(Object.keys(EDGE_LABEL) as EdgeType[]).map((t) => (
          <button key={t} className="min-h-12 rounded-2xl border-2 border-b-4 border-line px-3 py-2 text-left text-sm font-bold hover:bg-surface-2" onClick={() => onPick(t)}>
            {from} <span className="text-sky-ink">{EDGE_LABEL[t]}</span> {to}
          </button>
        ))}
      </div>
    </Modal>
  )
}

/** Phone-friendly alternative to the graph: concepts grouped by domain, colored by mastery. */
function ConceptList({
  concepts,
  mastery,
  matches,
  onOpen,
}: {
  concepts: Concept[]
  mastery: Record<string, { level: MasteryLevel; score: number }>
  matches: (c: Concept) => boolean
  onOpen: (id: string) => void
}) {
  const groups = (Object.keys(DOMAIN_META) as Domain[])
    .map((d) => ({ d, items: concepts.filter((c) => c.domain === d && matches(c)).sort((a, b) => a.title.localeCompare(b.title)) }))
    .filter((g) => g.items.length > 0)
  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 pt-3 pb-6">
      {groups.length === 0 && <p className="py-10 text-center text-sm text-muted">No concepts match your search or filters.</p>}
      {groups.map(({ d, items }) => (
        <section key={d} className="mb-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold" style={{ color: DOMAIN_META[d].color }}>
            <span className="text-lg">{DOMAIN_META[d].icon}</span>
            {DOMAIN_META[d].label}
            <span className="ml-auto text-xs text-muted">{items.length}</span>
          </h3>
          <ul className="card divide-y-2 divide-line overflow-hidden">
            {items.map((c) => {
              const m = MASTERY_STYLE[mastery[c.id]?.level ?? 'locked']
              return (
                <li key={c.id}>
                  <button className="flex min-h-13 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2" onClick={() => onOpen(c.id)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{c.title}</span>
                      <span className="text-xs font-bold" style={{ color: m.color }}>
                        {m.label}
                      </span>
                    </span>
                    {!c.isSeed && <span className="rounded-full bg-gold px-1.5 text-[10px] font-extrabold text-on-color">MINE</span>}
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: m.color }} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
