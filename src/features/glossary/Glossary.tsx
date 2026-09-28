import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Unlock } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { create } from 'zustand'
import { DOMAIN_META } from '../../content/concepts'
import { GLOSSARY_ALIASES } from '../../content/glossaryAliases'
import { unlockConcept } from '../../db/actions'
import { db } from '../../db/db'
import { useConcepts } from '../../db/hooks'
import { compileGlossary, findTerms, termsFromTitle } from '../../lib/glossary'
import { conceptMastery, MASTERY_STYLE } from '../../lib/mastery'
import { Md, Modal, Pill } from '../../components/ui'
import { toast } from '../gamify/fx'
import { play } from '../gamify/sounds'

/* ───────── State: which term's sheet is open ───────── */

interface GlossaryState {
  conceptId: string | null
  /** Inside a lesson we hide "Open concept" so the lesson isn't abandoned by accident. */
  inLesson: boolean
  open: (id: string, inLesson?: boolean) => void
  close: () => void
}

export const useGlossarySheet = create<GlossaryState>((set) => ({
  conceptId: null,
  inLesson: false,
  open: (conceptId, inLesson = false) => set({ conceptId, inLesson }),
  close: () => set({ conceptId: null }),
}))

/* ───────── Compiled term list (concept titles + aliases, incl. your own concepts) ───────── */

function useCompiledGlossary() {
  const concepts = useConcepts()
  return useMemo(
    () =>
      compileGlossary(
        (concepts ?? []).map((c) => ({
          conceptId: c.id,
          terms: [...termsFromTitle(c.title), ...(GLOSSARY_ALIASES[c.id] ?? [])],
        })),
      ),
    [concepts],
  )
}

/* ───────── Markdown with linked terms ───────── */

type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] }

/**
 * Markdown where finance terms become tap-to-define links. The first mention of each concept per
 * block is linked; `exclude` skips the concept this text belongs to.
 */
export function GlossaryMd({ children, className, exclude, inLesson }: { children: string; className?: string; exclude?: string; inLesson?: boolean }) {
  const g = useCompiledGlossary()
  const rehype = useMemo(() => {
    const plugin = () => (tree: HastNode) => {
      const seen = new Set<string>()
      const walk = (node: HastNode) => {
        if (!node.children || node.tagName === 'a' || node.tagName === 'code' || node.tagName === 'pre') return
        node.children = node.children.flatMap((child) => {
          if (child.type !== 'text' || !child.value) {
            walk(child)
            return [child]
          }
          const segs = findTerms(child.value, g, { exclude, seen })
          if (!segs.some((s) => s.conceptId)) return [child]
          return segs.map((s) =>
            s.conceptId
              ? { type: 'element', tagName: 'span', properties: { dataGlossary: s.conceptId }, children: [{ type: 'text', value: s.text }] }
              : { type: 'text', value: s.text },
          )
        })
      }
      walk(tree)
    }
    return [plugin]
  }, [g, exclude])

  return (
    <Md
      className={className}
      rehypePlugins={rehype}
      components={{
        span: ({ node: _node, children: kids, ...props }) => {
          const id = (props as Record<string, unknown>)['data-glossary'] as string | undefined
          if (!id) return <span {...props}>{kids}</span>
          return (
            <GlossaryTerm id={id} inLesson={inLesson}>
              {kids}
            </GlossaryTerm>
          )
        },
      }}
    >
      {children}
    </Md>
  )
}

function GlossaryTerm({ id, inLesson, children }: { id: string; inLesson?: boolean; children: ReactNode }) {
  const open = useGlossarySheet((s) => s.open)
  return (
    <button
      type="button"
      className="inline cursor-help rounded-sm text-left font-[inherit] text-inherit underline decoration-sky decoration-dotted decoration-2 underline-offset-4 hover:bg-sky-soft focus-visible:bg-sky-soft"
      onClick={(e) => {
        e.stopPropagation()
        play('tap')
        open(id, inLesson)
      }}
      aria-label={`Define ${typeof children === 'string' ? children : 'term'}`}
    >
      {children}
    </button>
  )
}

/* ───────── The definition sheet ───────── */

/** First paragraph of a concept summary, as a short definition. */
const firstParagraph = (md: string) => md.split(/\n\s*\n/)[0]

export function GlossarySheet() {
  const { conceptId, inLesson, close } = useGlossarySheet()
  const concept = useLiveQuery(() => (conceptId ? db.concepts.get(conceptId) : undefined), [conceptId])
  const cards = useLiveQuery(() => (conceptId ? db.cards.where('conceptId').equals(conceptId).toArray() : []), [conceptId])
  const open = !!conceptId && !!concept
  const mastery = conceptMastery(cards ?? [])
  const m = MASTERY_STYLE[mastery.level]
  const d = concept ? DOMAIN_META[concept.domain] : null

  return (
    <Modal open={open} onClose={close} title={concept?.title ?? ''}>
      {concept && d && (
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Pill color={d.color}>
              {d.icon} {d.label}
            </Pill>
            <Pill color={m.color}>{m.label}</Pill>
          </div>
          <Md className="text-[15px]">{firstParagraph(concept.summary)}</Md>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {mastery.level === 'locked' && (
              <button
                className="btn-ghost"
                onClick={async () => {
                  const n = await unlockConcept(concept.id)
                  toast({ kind: 'info', title: `🔓 ${n} cards added to reviews` })
                }}
              >
                <Unlock size={15} /> Start learning
              </button>
            )}
            {!inLesson && (
              <Link to={`/concept/${concept.id}`} onClick={close} className="btn-primary">
                <BookOpen size={15} /> Open concept
              </Link>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
