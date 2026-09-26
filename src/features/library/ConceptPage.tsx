import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ExternalLink, Loader2, Pencil, Plus, Sparkles, Trash2, Unlock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { State } from 'ts-fsrs'
import { DOMAIN_META } from '../../content/concepts'
import { addCard, deleteCard, deleteConcept, deleteEdge, unlockConcept, updateCard, updateConcept } from '../../db/actions'
import { db } from '../../db/db'
import { conceptMastery, MASTERY_STYLE } from '../../lib/mastery'
import { formatInterval } from '../../lib/srs'
import { Empty, Md, Pill } from '../../components/ui'
import type { CardType, Domain, StudyCard } from '../../types'
import { describeAiError, explainSimply } from '../ai/lazy'
import { hasApiKey } from '../ai/settings'
import { toast } from '../gamify/fx'
import { EDGE_LABEL, useQuickAdd } from './QuickAdd'

export function ConceptPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const concept = useLiveQuery(() => db.concepts.get(id), [id])
  const cards = useLiveQuery(() => db.cards.where('conceptId').equals(id).toArray(), [id])
  const links = useLiveQuery(async () => {
    const out = await db.edges.where('from').equals(id).toArray()
    const inc = await db.edges.where('to').equals(id).toArray()
    const all = [...out, ...inc]
    const others = await db.concepts.bulkGet(all.map((e) => (e.from === id ? e.to : e.from)))
    return all.map((e, i) => ({ edge: e, other: others[i] }))
  }, [id])
  const openAdd = useQuickAdd((s) => s.open)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [eli5, setEli5] = useState<string | null>(null)
  const [eli5Loading, setEli5Loading] = useState(false)

  if (concept === undefined || cards === undefined) return null
  if (concept === null || !concept)
    return <Empty mood="oops" title="Concept not found" body="It may have been deleted." action={<Link to="/library" className="btn-primary">Back to library</Link>} />

  const d = DOMAIN_META[concept.domain]
  const m = conceptMastery(cards)
  const locked = cards.some((c) => c.locked)

  const explain = async () => {
    setEli5Loading(true)
    try {
      setEli5(await explainSimply(concept))
    } catch (e) {
      toast({ kind: 'error', title: 'AI error', body: await describeAiError(e) })
    } finally {
      setEli5Loading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card overflow-hidden">
        <div className="h-2" style={{ background: d.color }} />
        <div className="p-5 sm:p-6">
          {editing ? (
            <EditConcept concept={concept} onDone={() => setEditing(false)} />
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-3">
                <div className="text-4xl">{d.icon}</div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-bold sm:text-3xl">{concept.title}</h1>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Pill color={d.color}>{d.label}</Pill>
                    <Pill color={MASTERY_STYLE[m.level].color}>
                      {MASTERY_STYLE[m.level].label}
                      {m.level !== 'locked' && m.level !== 'new' ? ` · ${Math.round(m.score * 100)}%` : ''}
                    </Pill>
                    {!concept.isSeed && <Pill color="#d99a06">Mine</Pill>}
                    {concept.tags.map((t) => (
                      <Pill key={t}>#{t}</Pill>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost px-3 py-2" onClick={() => setEditing(true)} aria-label="Edit concept">
                    <Pencil size={15} />
                  </button>
                </div>
              </div>
              <Md className="mt-5 text-[15px]">{concept.summary}</Md>
              {concept.sourceUrls.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {concept.sourceUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted hover:text-brand-ink">
                      <ExternalLink size={12} /> {sourceLabel(u)}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI explain */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display font-semibold">
            <Sparkles size={17} className="text-gold-ink" /> Explain like I'm new
          </h2>
          {hasApiKey() ? (
            <button className="btn-ghost py-1.5" onClick={explain} disabled={eli5Loading}>
              {eli5Loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {eli5 ? 'Try again' : 'Explain it'}
            </button>
          ) : (
            <Link to="/settings" className="text-sm text-muted underline">
              Add an API key to enable
            </Link>
          )}
        </div>
        {eli5 && <Md className="mt-3 rounded-xl bg-gold-soft/60 p-4 text-sm">{eli5}</Md>}
      </div>

      {/* Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Flashcards ({cards.length})</h2>
          {locked && (
            <button
              className="btn-primary py-2"
              onClick={async () => {
                const n = await unlockConcept(concept.id)
                toast({ kind: 'info', title: `🔓 ${n} cards added to your reviews` })
              }}
            >
              <Unlock size={15} /> Start learning
            </button>
          )}
        </div>
        <div className="space-y-2">
          {cards.map((c) => (
            <CardRow key={c.id} card={c} />
          ))}
          <NewCardRow conceptId={concept.id} />
        </div>
      </div>

      {/* Links */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Connections</h2>
          <div className="flex gap-2">
            <Link to="/map" className="btn-ghost py-1.5 text-xs">
              Open map
            </Link>
            <button className="btn-ghost py-1.5 text-xs" onClick={() => openAdd({ linkTo: concept.id })}>
              <Plus size={14} /> Linked concept
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(links ?? []).map(({ edge, other }) =>
            other ? (
              <div key={edge.id} className="card group flex items-center gap-2 px-3 py-2.5 text-sm">
                <span className="text-muted">{edge.from === concept.id ? EDGE_LABEL[edge.type] : `← ${EDGE_LABEL[edge.type]}`}</span>
                <Link to={`/concept/${other.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-brand-ink">
                  {other.title}
                </Link>
                <button className="rounded p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-danger-ink" onClick={() => deleteEdge(edge.id)} aria-label="Remove link">
                  <Trash2 size={14} />
                </button>
              </div>
            ) : null,
          )}
          {links?.length === 0 && <p className="text-sm text-muted">No connections yet — link it on the map.</p>}
        </div>
      </div>

      {!concept.isSeed && (
        <div className="border-t border-line pt-5">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Delete this concept, its {cards.length} cards and links?</span>
              <button
                className="btn-danger"
                onClick={async () => {
                  await deleteConcept(concept.id)
                  navigate('/library')
                }}
              >
                Yes, delete
              </button>
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="text-sm text-muted hover:text-danger-ink" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} className="mr-1 inline" /> Delete concept
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function sourceLabel(u: string) {
  try {
    const url = new URL(u)
    if (url.hostname.includes('bogleheads')) return `Bogleheads: ${url.searchParams.get('search') ?? url.pathname.split('/').pop()?.replace(/_/g, ' ')}`
    if (url.hostname.includes('reddit')) return 'r/personalfinance wiki'
    return url.hostname
  } catch {
    return u
  }
}

function CardRow({ card }: { card: StudyCard }) {
  const [edit, setEdit] = useState(false)
  const [front, setFront] = useState(card.front)
  const [back, setBack] = useState(card.back)
  const due = new Date(card.fsrs.due)
  const status = card.locked
    ? 'Locked'
    : card.fsrs.state === State.New
      ? 'New'
      : due <= new Date()
        ? 'Due now'
        : `Due in ${formatInterval(due.getTime() - Date.now())}`

  if (edit)
    return (
      <div className="card space-y-2 p-3">
        <textarea className="input min-h-16" value={front} onChange={(e) => setFront(e.target.value)} />
        <textarea className="input min-h-16" value={back} onChange={(e) => setBack(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost py-1.5" onClick={() => setEdit(false)}>
            Cancel
          </button>
          <button
            className="btn-primary py-1.5"
            onClick={async () => {
              await updateCard(card.id, { front, back })
              setEdit(false)
            }}
          >
            Save
          </button>
        </div>
      </div>
    )

  return (
    <div className="card group flex items-start gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="line-clamp-3 text-sm font-semibold">{card.front}</div>
        {card.type === 'mcq' && card.options && (
          <div className="mt-1 text-xs text-muted">{card.options.map((o, i) => (i === card.answer ? `✓ ${o}` : o)).join(' · ')}</div>
        )}
        <div className="mt-1 line-clamp-2 text-sm text-muted">{card.back}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{status}</span>
        <div className="flex opacity-0 transition group-hover:opacity-100">
          <button className="rounded p-1 text-muted hover:text-ink" onClick={() => setEdit(true)} aria-label="Edit card">
            <Pencil size={14} />
          </button>
          <button className="rounded p-1 text-muted hover:text-danger-ink" onClick={() => deleteCard(card.id)} aria-label="Delete card">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function NewCardRow({ conceptId }: { conceptId: string }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<CardType>('basic')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  if (!open)
    return (
      <button className="btn-ghost w-full border-dashed" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add a card
      </button>
    )
  return (
    <div className="card space-y-2 p-3">
      <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as CardType)}>
        <option value="basic">Q&A</option>
        <option value="cloze">Cloze (use ____ for the blank)</option>
      </select>
      <input className="input" autoFocus placeholder={type === 'cloze' ? 'The 4% rule means you need ____ times expenses' : 'Question'} value={front} onChange={(e) => setFront(e.target.value)} />
      <input className="input" placeholder="Answer" value={back} onChange={(e) => setBack(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button className="btn-ghost py-1.5" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          className="btn-primary py-1.5"
          disabled={!front.trim() || !back.trim()}
          onClick={async () => {
            await addCard(conceptId, { type, front, back })
            setFront('')
            setBack('')
            toast({ kind: 'info', title: 'Card added to reviews' })
          }}
        >
          Add card
        </button>
      </div>
    </div>
  )
}

function EditConcept({ concept, onDone }: { concept: { id: string; title: string; summary: string; domain: Domain; tags: string[] }; onDone: () => void }) {
  const [title, setTitle] = useState(concept.title)
  const [summary, setSummary] = useState(concept.summary)
  const [domain, setDomain] = useState(concept.domain)
  const [tags, setTags] = useState(concept.tags.join(', '))
  return (
    <div className="space-y-3">
      <input className="input font-display text-lg font-bold" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="input w-auto" value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
        {Object.entries(DOMAIN_META).map(([k, v]) => (
          <option key={k} value={k}>
            {v.icon} {v.label}
          </option>
        ))}
      </select>
      <textarea className="input min-h-48" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <input className="input" placeholder="tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            await updateConcept(concept.id, { title, summary, domain, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
            onDone()
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}
