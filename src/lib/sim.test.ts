import { describe, expect, it } from 'vitest'
import { applyChoice, createGame, currentEvent, DEBT_APR, finalResult, flexible, liveYear, netWorth, YEARS, type Allocation, type SimState } from './sim'

const play = (seed: number, pickChoice: (id: string) => number, alloc: Allocation) => {
  let s = createGame(seed)
  while (s.year < YEARS) {
    const ev = currentEvent(s)!
    s = applyChoice(s, pickChoice(ev.id))
    s = liveYear(s, alloc)
  }
  return s
}
const findSeedWith = (pred: (s: SimState) => boolean) => {
  for (let seed = 1; seed < 500; seed++) if (pred(createGame(seed))) return seed
  throw new Error('no seed')
}

describe('life simulator', () => {
  it('is deterministic for a seed and lasts 10 years with 10 different events', () => {
    const smart: Allocation = { fun: 15, emergency: 20, debt: 35, invest: 30 }
    const a = play(7, () => 0, smart)
    const b = play(7, () => 0, smart)
    expect(a).toEqual(b)
    expect(a.log).toHaveLength(YEARS)
    expect(new Set(a.log.map((l) => l.eventId)).size).toBe(YEARS)
    expect(a.age).toBe(32)
  })

  it('rewards a balanced plan over spending everything', () => {
    const smart = finalResult(play(3, () => 0, { fun: 15, emergency: 20, debt: 35, invest: 30 }))
    const spender = finalResult(play(3, () => 0, { fun: 100, emergency: 0, debt: 0, invest: 0 }))
    expect(smart.netWorth).toBeGreaterThan(spender.netWorth)
    expect(spender.grade).toBe('F') // 22% debt snowballs
    expect(['A', 'B']).toContain(smart.grade)
    expect(spender.lessons.map((l) => l.lessonId)).toContain('l-payoff')
  })

  it('applies card interest on unpaid debt', () => {
    const s = createGame(1)
    const next = liveYear(applyChoice(s, 0), { fun: 100, emergency: 0, debt: 0, invest: 0 })
    expect(next.debt).toBeGreaterThanOrEqual(s.debt * (1 + DEBT_APR) - 1)
  })

  it('selling in a crash locks in the loss; staying the course recovers', () => {
    const seed = findSeedWith((g) => g.eventOrder.indexOf('crash') >= 2 && g.eventOrder.indexOf('crash') <= 7)
    const alloc: Allocation = { fun: 10, emergency: 10, debt: 30, invest: 50 }
    const hold = play(seed, () => 0, alloc)
    const sell = play(seed, (id) => (id === 'crash' ? 1 : 0), alloc)
    expect(hold.invested).toBeGreaterThan(sell.invested)
    expect(finalResult(sell).lessons.map((l) => l.lessonId)).toContain('l-boglehead')
  })

  it('an emergency fund keeps surprises off the credit card', () => {
    const s = { ...createGame(2), cash: 5000, eventOrder: ['car'] }
    const paid = applyChoice(s, 0)
    expect(paid.cash).toBe(3000)
    expect(paid.debt).toBe(s.debt)
    const broke = applyChoice({ ...s, cash: 500 }, 0)
    expect(broke.debt).toBe(s.debt + 1500)
  })

  it('joining the match lowers take-home but grows investments', () => {
    const s = { ...createGame(4), eventOrder: ['match'] }
    const joined = applyChoice(s, 0)
    expect(flexible(joined)).toBeLessThan(flexible(s))
    const a = liveYear(joined, { fun: 25, emergency: 25, debt: 25, invest: 25 })
    const b = liveYear(applyChoice(s, 1), { fun: 25, emergency: 25, debt: 25, invest: 25 })
    expect(netWorth(a)).toBeGreaterThan(netWorth(b))
  })
})
