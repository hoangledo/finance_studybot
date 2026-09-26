import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import clsx from 'clsx'
import { DOMAIN_META } from '../../content/concepts'
import { addConcept, type NewCardInput } from '../../db/actions'
import { useConcepts } from '../../db/hooks'
import { Md, Modal } from '../../components/ui'
import type { Domain, EdgeType } from '../../types'
import { describeAiError, draftConcept } from '../ai/lazy'
import { hasApiKey } from '../ai/settings'
import { toast } from '../gamify/fx'

interface QuickAddState {
  isOpen: boolean
  prefill: { title?: string; linkTo?: string }
  open: (prefill?: { title?: string; linkTo?: string }) => void
  close: () => void
}

export const useQuickAdd = create<QuickAddState>((set) => ({
  isOpen: false,
  prefill: {},
  open: (prefill = {}) => set({ isOpen: true, prefill }),
  close: () => set({ isOpen: false, prefill: {} }),
}))

export const EDGE_LABEL: Record<EdgeType, string> = {
  prereq: 'is a prerequisite for',
  partOf: 'is part of',
  related: 'is related to',
  contrasts: 'contrasts with',
  example: 'has example',
}

interface Link {
  to: string
  type: EdgeType
}

interface FormState {
  title: string
  summary: string
  domain: Domain
  tags: string
  source: string
  forward: boolean
  reverse: boolean
  cards: NewCardInput[]
  links: Link[]
}

const emptyForm = (title = '', linkTo?: string): FormState => ({
  title,
  summary: '',
  domain: 'investing',
  tags: '',
  source: '',
  forward: true,
  reverse: true,
  cards: [],
  links: linkTo ? [{ to: linkTo, type: 'related' }] : [],
})

export function QuickAddModal() {
  const { isOpen, close, prefill } = useQuickAdd()
  return (
    <Modal open={isOpen} onClose={close} title="Add a concept" wide>
      {/* Remount on each open so state resets */}
      {isOpen && <QuickAddBody key={JSON.stringify(prefill)} prefill={prefill} onDone={close} />}
    </Modal>
  )
}

function QuickAddBody({ prefill, onDone }: { prefill: QuickAddState['prefill']; onDone: () => void }) {
  const [tab, setTab] = useState<'manual' | 'ai'>('manual')
  const [form, setForm] = useState<FormState>(() => emptyForm(prefill.title, prefill.linkTo))
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const save = async () => {
    if (!form.title.trim() || !form.summary.trim()) return
    setSaving(true)
    try {
      const cards: NewCardInput[] = []
      if (form.forward) cards.push({ type: 'basic', front: `What is ${form.title.trim()}?`, back: form.summary.trim() })
      if (form.reverse) cards.push({ type: 'reverse', front: form.summary.trim(), back: form.title.trim() })
      cards.push(...form.cards)
      const id = await addConcept({
        title: form.title,
        summary: form.summary,
        domain: form.domain,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        sourceUrls: [form.source.trim()],
        links: form.links.filter((l) => l.to),
        cards,
      })
      onDone()
      navigate(`/concept/${id}`)
    } catch (e) {
      toast({ kind: 'error', title: 'Could not save', body: String(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-5 inline-flex rounded-xl bg-surface-2 p-1">
        {(['manual', 'ai'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition',
              tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted',
            )}
          >
            {t === 'ai' && <Sparkles size={15} />}
            {t === 'manual' ? 'Write it' : 'Draft with AI'}
          </button>
        ))}
      </div>

      {tab === 'ai' && <AiDraft onDraft={(f) => { setForm(f); setTab('manual') }} />}
      {tab === 'manual' && <ConceptForm form={form} setForm={setForm} />}

      {tab === 'manual' && (
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
          <span className="mr-auto text-xs text-muted">+15 XP for adding a concept</span>
          <button className="btn-ghost" onClick={onDone}>
            Cancel
          </button>
          <button className="btn-primary" disabled={saving || !form.title.trim() || !form.summary.trim()} onClick={save}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Save concept
          </button>
        </div>
      )}
    </div>
  )
}

function ConceptForm({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const concepts = useConcepts() ?? []
  const sorted = [...concepts].sort((a, b) => a.title.localeCompare(b.title))
  const up = (patch: Partial<FormState>) => setForm({ ...form, ...patch })
  const upCard = (i: number, patch: Partial<NewCardInput>) =>
    up({ cards: form.cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const upLink = (i: number, patch: Partial<Link>) =>
    up({ links: form.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div>
          <label className="label">Term</label>
          <input className="input" autoFocus value={form.title} onChange={(e) => up({ title: e.target.value })} placeholder="e.g. Mega backdoor Roth" />
        </div>
        <div>
          <label className="label">Domain</label>
          <select className="input" value={form.domain} onChange={(e) => up({ domain: e.target.value as Domain })}>
            {Object.entries(DOMAIN_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Definition / notes (markdown)</label>
        <textarea className="input min-h-28" value={form.summary} onChange={(e) => up({ summary: e.target.value })} placeholder="Explain it in your own words — that's how it sticks." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Source URL (optional)</label>
          <input className="input" value={form.source} onChange={(e) => up({ source: e.target.value })} placeholder="https://www.bogleheads.org/wiki/…" />
        </div>
        <div>
          <label className="label">Tags (comma separated)</label>
          <input className="input" value={form.tags} onChange={(e) => up({ tags: e.target.value })} placeholder="roth, advanced" />
        </div>
      </div>

      <div>
        <label className="label">Flashcards</label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.forward} onChange={(e) => up({ forward: e.target.checked })} className="accent-[var(--brand)]" />
            Term → definition
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.reverse} onChange={(e) => up({ reverse: e.target.checked })} className="accent-[var(--brand)]" />
            Definition → term
          </label>
        </div>
        <div className="mt-3 space-y-2">
          {form.cards.map((c, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/50 p-2.5 sm:flex-row sm:items-start">
              <select className="input sm:w-28" value={c.type} onChange={(e) => upCard(i, { type: e.target.value as NewCardInput['type'] })}>
                <option value="basic">Q&A</option>
                <option value="cloze">Cloze</option>
                {c.type === 'mcq' && <option value="mcq">Quiz</option>}
              </select>
              <div className="flex-1 space-y-1.5">
                <input className="input" value={c.front} onChange={(e) => upCard(i, { front: e.target.value })} placeholder={c.type === 'cloze' ? 'Sentence with ____ blank' : 'Question'} />
                {c.type === 'mcq' && c.options && (
                  <div className="grid gap-1 text-xs sm:grid-cols-2">
                    {c.options.map((o, k) => (
                      <div key={k} className={clsx('rounded-lg px-2 py-1', k === c.answer ? 'bg-brand-soft text-brand-ink' : 'bg-surface')}>
                        {k === c.answer ? '✓ ' : ''}
                        {o}
                      </div>
                    ))}
                  </div>
                )}
                <input className="input" value={c.back} onChange={(e) => upCard(i, { back: e.target.value })} placeholder={c.type === 'mcq' ? 'Explanation' : 'Answer'} />
              </div>
              <button className="self-end rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger-ink sm:self-start" onClick={() => up({ cards: form.cards.filter((_, j) => j !== i) })} aria-label="Remove card">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button className="btn-ghost py-1.5 text-xs" onClick={() => up({ cards: [...form.cards, { type: 'basic', front: '', back: '' }] })}>
            <Plus size={14} /> Add a custom card
          </button>
        </div>
      </div>

      <div>
        <label className="label">Connect to the map</label>
        <div className="space-y-2">
          {form.links.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{form.title || 'This'}</span>
              <select className="input w-auto" value={l.type} onChange={(e) => upLink(i, { type: e.target.value as EdgeType })}>
                {Object.entries(EDGE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select className="input min-w-0 flex-1" value={l.to} onChange={(e) => upLink(i, { to: e.target.value })}>
                <option value="">Choose a concept…</option>
                {sorted.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <button className="rounded-lg p-2 text-muted hover:text-danger-ink" onClick={() => up({ links: form.links.filter((_, j) => j !== i) })} aria-label="Remove link">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button className="btn-ghost py-1.5 text-xs" onClick={() => up({ links: [...form.links, { to: '', type: 'related' }] })}>
            <Plus size={14} /> Add a link
          </button>
        </div>
      </div>
    </div>
  )
}

function AiDraft({ onDraft }: { onDraft: (f: FormState) => void }) {
  const concepts = useConcepts() ?? []
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = hasApiKey()

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await draftConcept(text, concepts.map((c) => ({ id: c.id, title: c.title })))
      onDraft({
        title: d.title,
        summary: d.summary,
        domain: d.domain,
        tags: 'ai-draft',
        source: /^https?:\/\//.test(text.trim()) ? text.trim().split(/\s/)[0] : '',
        forward: false,
        reverse: false,
        cards: [
          ...d.cards.map((c) => ({ type: c.type, front: c.front, back: c.back })),
          ...d.quiz.map((q) => ({ type: 'mcq' as const, front: q.question, back: q.explanation, options: q.options, answer: q.answerIndex })),
        ],
        links: d.links.map((l) => ({ to: l.conceptId, type: l.type })),
      })
      toast({ kind: 'info', title: '✨ Draft ready', body: 'Review and edit before saving.' })
    } catch (e) {
      setError(await describeAiError(e))
    } finally {
      setLoading(false)
    }
  }

  if (!ready)
    return (
      <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm">
        <Sparkles className="mx-auto mb-2 text-gold-ink" />
        <p className="font-semibold">AI drafting is optional</p>
        <p className="mt-1 text-muted">
          Add your Anthropic API key in <a href="/settings" className="text-brand-ink underline">Settings</a> to paste a Bogleheads or Reddit excerpt and get
          ready-made cards, quiz questions, and map links.
        </p>
      </div>
    )

  return (
    <div className="space-y-3">
      <Md className="text-sm text-muted">
        {'Paste an excerpt from the **Bogleheads wiki**, an **r/personalfinance** post, or just type a term. Claude drafts a summary, flashcards, quiz questions, and links into your map — you review everything before saving.'}
      </Md>
      <textarea className="input min-h-40" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. “Mega backdoor Roth” or paste a paragraph…" />
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-ink">{error}</p>}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={loading || !text.trim()} onClick={run}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {loading ? 'Drafting…' : 'Draft with Claude'}
        </button>
      </div>
    </div>
  )
}
