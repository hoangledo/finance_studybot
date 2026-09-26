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
import { ExternalLink, Plus, Search, Trash2, Unlock, X } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { DOMAIN_META } from '../../content/concepts'
import { LESSONS } from '../../content/lessons'
import { addEdge, deleteEdge, unlockConcept } from '../../db/actions'
import { useCards, useConcepts, useEdges } from '../../db/hooks'
import { conceptMastery, MASTERY_STYLE, type MasteryLevel } from '../../lib/mastery'
import { Md, Pill } from '../../components/ui'
import type { Concept, Domain, EdgeType } from '../../types'
import { toast } from '../gamify/fx'
import { EDGE_LABEL, useQuickAdd } from '../library/QuickAdd'
import { useViz } from '../widgets/common'

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
          <div className="card flex flex-wrap items-center gap-3 px-3 py-2 text-xs shadow-sm">
            {(Object.keys(MASTERY_STYLE) as MasteryLevel[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: MASTERY_STYLE[k].color }} />
                {MASTERY_STYLE[k].label} <span className="text-muted">{counts[k]}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          {(Object.keys(DOMAIN_META) as Domain[]).map((d) => {
            const on = domains.has(d)
            return (
              <button
                key={d}
                onClick={() => {
                  const next = new Set(domains)
                  if (on) next.delete(d)
                  else next.add(d)
                  setDomains(next)
                }}
                className={clsx(
                  'rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur transition',
                  on ? 'border-transparent text-white' : 'border-line bg-surface/90 text-muted hover:text-ink',
                )}
                style={on ? { background: DOMAIN_META[d].color } : undefined}
              >
                {DOMAIN_META[d].icon} {DOMAIN_META[d].label}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-muted">Drag from a node's right dot to another node to link them. Click a node for details.</p>
      </div>

      {/* Side panel */}
      <AnimatePresence>
        {sel && (
          <ConceptPanel
            key={sel.id}
            concept={sel}
            level={mastery[sel.id]?.level ?? 'locked'}
            links={(edges ?? []).filter((e) => e.from === sel.id || e.to === sel.id)}
            conceptsById={Object.fromEntries((concepts ?? []).map((c) => [c.id, c]))}
            onClose={() => setSelected(null)}
            onSelect={setSelected}
            onAddLinked={() => openAdd({ linkTo: sel.id })}
          />
        )}
      </AnimatePresence>

      {pendingEdge && (
        <EdgeTypePicker
          from={concepts?.find((c) => c.id === pendingEdge.source)?.title ?? ''}
          to={concepts?.find((c) => c.id === pendingEdge.target)?.title ?? ''}
          onCancel={() => setPendingEdge(null)}
          onPick={async (t) => {
            await addEdge(pendingEdge.source!, pendingEdge.target!, t)
            setPendingEdge(null)
            toast({ kind: 'info', title: '🔗 Linked!' })
          }}
        />
      )}
    </div>
  )
}

function ConceptPanel({
  concept,
  level,
  links,
  conceptsById,
  onClose,
  onSelect,
  onAddLinked,
}: {
  concept: Concept
  level: MasteryLevel
  links: { id: string; from: string; to: string; type: EdgeType }[]
  conceptsById: Record<string, Concept>
  onClose: () => void
  onSelect: (id: string) => void
  onAddLinked: () => void
}) {
  const d = DOMAIN_META[concept.domain]
  const m = MASTERY_STYLE[level]
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
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight font-bold">{concept.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Pill color={d.color}>{d.label}</Pill>
            <Pill color={m.color}>{m.label}</Pill>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Close panel">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm">
        <Md>{concept.summary}</Md>
        <h4 className="label mt-4">Connections</h4>
        <ul className="space-y-1">
          {links.map((l) => {
            const outgoing = l.from === concept.id
            const other = conceptsById[outgoing ? l.to : l.from]
            if (!other) return null
            return (
              <li key={l.id} className="group flex items-center gap-2">
                <button className="min-w-0 flex-1 truncate text-left hover:text-brand-ink" onClick={() => onSelect(other.id)}>
                  <span className="text-muted">{outgoing ? EDGE_LABEL[l.type] : `← ${EDGE_LABEL[l.type]}`}</span> <strong>{other.title}</strong>
                </button>
                <button className="rounded p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-danger-ink" onClick={() => deleteEdge(l.id)} aria-label="Remove link">
                  <Trash2 size={13} />
                </button>
              </li>
            )
          })}
          {links.length === 0 && <li className="text-muted">No links yet.</li>}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line p-3">
        {level === 'locked' && (
          <button
            className="btn-ghost flex-1"
            onClick={async () => {
              const n = await unlockConcept(concept.id)
              toast({ kind: 'info', title: `🔓 ${n} cards added to reviews` })
            }}
          >
            <Unlock size={15} /> Start learning
          </button>
        )}
        <button className="btn-ghost flex-1" onClick={onAddLinked}>
          <Plus size={15} /> Linked concept
        </button>
        <Link to={`/concept/${concept.id}`} className="btn-primary flex-1">
          <ExternalLink size={15} /> Open
        </Link>
      </div>
    </motion.aside>
  )
}

function EdgeTypePicker({ from, to, onPick, onCancel }: { from: string; to: string; onPick: (t: EdgeType) => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/30 p-4" onClick={onCancel}>
      <div className="card w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-semibold">How are these related?</h3>
        <p className="mt-1 mb-4 text-sm text-muted">
          <strong className="text-ink">{from}</strong> … <strong className="text-ink">{to}</strong>
        </p>
        <div className="grid gap-2">
          {(Object.keys(EDGE_LABEL) as EdgeType[]).map((t) => (
            <button key={t} className="btn-ghost justify-start" onClick={() => onPick(t)}>
              {from} <em className="text-muted not-italic">{EDGE_LABEL[t]}</em> {to}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
