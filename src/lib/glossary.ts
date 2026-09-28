/** Find finance terms in text so they can become tap-to-define links. Pure and testable. */

export interface GlossaryEntry {
  conceptId: string
  terms: string[]
}

interface Compiled {
  byTerm: Map<string, string> // lower-cased term → conceptId
  exact: Map<string, string> // acronyms (case-sensitive) → conceptId
  loose: RegExp | null
  acronyms: RegExp | null
}

export type Segment = { text: string; conceptId?: string }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const isAcronym = (t: string) => t.length <= 5 && /^[A-Z0-9()&]+s?$/.test(t) && /[A-Z]/.test(t)

/** Turn a concept title into linkable terms: drop parentheticals, split "A / B", strip quotes. */
export function termsFromTitle(title: string): string[] {
  return title
    .replace(/\([^)]*\)/g, '')
    .split(' / ')
    .map((t) => t.replace(/["“”]/g, '').trim())
    .filter((t) => t.length >= 3)
}

export function compileGlossary(entries: GlossaryEntry[]): Compiled {
  const byTerm = new Map<string, string>()
  const exact = new Map<string, string>()
  for (const e of entries) {
    for (const raw of e.terms) {
      const t = raw.trim()
      if (t.length < 2) continue
      if (isAcronym(t)) {
        if (!exact.has(t)) exact.set(t, e.conceptId)
      } else if (!byTerm.has(t.toLowerCase())) byTerm.set(t.toLowerCase(), e.conceptId)
    }
  }
  // Longest first so "Roth IRA" wins over "IRA", "index funds" over "index fund".
  const alt = (terms: string[]) => terms.sort((a, b) => b.length - a.length).map(escape).join('|')
  const bound = (src: string, flags: string) => (src ? new RegExp(`(?<![A-Za-z0-9])(?:${src})(?![A-Za-z0-9])`, flags) : null)
  return {
    byTerm,
    exact,
    loose: bound(alt([...byTerm.keys()]), 'gi'),
    acronyms: bound(alt([...exact.keys()]), 'g'),
  }
}

/**
 * Split text into plain and linked segments. `seen` carries concept ids already linked in this
 * block (first mention only); `exclude` is the concept whose own page/card we're on.
 */
export function findTerms(text: string, g: Compiled, opts: { exclude?: string; seen?: Set<string> } = {}): Segment[] {
  const seen = opts.seen ?? new Set<string>()
  const out: Segment[] = []
  let pos = 0
  const next = (re: RegExp | null, from: number) => {
    if (!re) return null
    re.lastIndex = from
    return re.exec(text)
  }
  while (pos < text.length) {
    let a = next(g.loose, pos)
    let b = next(g.acronyms, pos)
    // Skip matches for concepts we must not link, continuing the search after them.
    const resolve = (m: RegExpExecArray | null, exact: boolean, re: RegExp | null): RegExpExecArray | null => {
      while (m) {
        const id = exact ? g.exact.get(m[0]) : g.byTerm.get(m[0].toLowerCase())
        if (id && id !== opts.exclude && !seen.has(id)) return m
        m = next(re, m.index + Math.max(1, m[0].length))
      }
      return null
    }
    a = resolve(a, false, g.loose)
    b = resolve(b, true, g.acronyms)
    const m = !a ? b : !b ? a : a.index < b.index || (a.index === b.index && a[0].length >= b[0].length) ? a : b
    if (!m) break
    const id = (m === b ? g.exact.get(m[0]) : g.byTerm.get(m[0].toLowerCase()))!
    if (m.index > pos) out.push({ text: text.slice(pos, m.index) })
    out.push({ text: m[0], conceptId: id })
    seen.add(id)
    pos = m.index + m[0].length
  }
  if (pos < text.length) out.push({ text: text.slice(pos) })
  return out
}
