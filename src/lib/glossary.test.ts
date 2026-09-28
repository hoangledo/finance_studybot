import { describe, expect, it } from 'vitest'
import { compileGlossary, findTerms, termsFromTitle } from './glossary'

const g = compileGlossary([
  { conceptId: 'roth-ira', terms: ['Roth IRA', 'Roth IRAs'] },
  { conceptId: 'traditional-ira', terms: ['Traditional IRA'] },
  { conceptId: 'index-fund', terms: ['index fund', 'index funds'] },
  { conceptId: 'fire', terms: ['FIRE', 'financial independence'] },
  { conceptId: '401k', terms: ['401(k)', '401k'] },
  { conceptId: 'four-percent-rule', terms: ['4% rule'] },
  { conceptId: 'hsa', terms: ['HSA', 'HSAs'] },
])
const linked = (text: string, opts = {}) => findTerms(text, g, opts).filter((s) => s.conceptId).map((s) => `${s.text}→${s.conceptId}`)

describe('glossary matching', () => {
  it('prefers the longest term and ignores case for normal terms', () => {
    expect(linked('Open a roth ira and buy Index Funds.')).toEqual(['roth ira→roth-ira', 'Index Funds→index-fund'])
  })

  it('matches whole words only', () => {
    expect(linked('The indexfunds and HSAX are not terms.')).toEqual([])
  })

  it('treats short acronyms as case-sensitive', () => {
    expect(linked('Sitting by the fire.')).toEqual([])
    expect(linked('The FIRE crowd loves an HSA.')).toEqual(['FIRE→fire', 'HSA→hsa'])
  })

  it('handles punctuation-heavy terms', () => {
    expect(linked('Max your 401(k), then check the 4% rule.')).toEqual(['401(k)→401k', '4% rule→four-percent-rule'])
  })

  it('links only the first mention and never the excluded concept', () => {
    expect(linked('Roth IRA vs Roth IRA vs Traditional IRA', { exclude: 'traditional-ira' })).toEqual(['Roth IRA→roth-ira'])
  })

  it('keeps every character of the original text', () => {
    const text = 'A Roth IRA, an HSA and a 401k.'
    expect(findTerms(text, g).map((s) => s.text).join('')).toBe(text)
  })

  it('derives terms from titles', () => {
    expect(termsFromTitle('HSA (Health Savings Account)')).toEqual(['HSA'])
    expect(termsFromTitle('4% rule / safe withdrawal rate')).toEqual(['4% rule', 'safe withdrawal rate'])
    expect(termsFromTitle('"Age in bonds" rule of thumb')).toEqual(['Age in bonds rule of thumb'])
  })
})
