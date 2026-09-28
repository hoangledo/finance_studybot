/**
 * Life Simulator: 10 years of money decisions. Pure, seeded and deterministic so it can be tested.
 * Amounts are in dollars inside the simulation (converted to cents only when saved).
 */
import { rng } from './calc'

export const YEARS = 10
export const TAKE_HOME_RATE = 0.78 // after income tax + FICA (rough)
export const ESSENTIALS_SHARE = 0.55 // rent, food, bills: the part of take-home you can't flex
export const DEBT_APR = 0.22
export const CASH_RATE = 0.04 // high-yield savings

export interface Allocation {
  fun: number // % of flexible money, 0..100 (all four sum to 100)
  emergency: number
  debt: number
  invest: number
}

export interface YearLog {
  year: number
  age: number
  eventId: string
  choice: string
  marketReturn: number
  netWorth: number
  happiness: number
  note: string
}

export interface SimState {
  seed: number
  year: number // completed years (0..10)
  age: number
  salary: number
  extraIncome: number
  extraEssentials: number
  cash: number
  debt: number
  invested: number
  happiness: number // 0..100
  matchJoined: boolean
  forcedReturn: number | null // set by events for the current year
  soldInCrash: boolean
  missedRebound: boolean
  eventOrder: string[]
  log: YearLog[]
  pendingNote: string // what the event did this year
  pendingChoice: string
}

export interface Choice {
  label: string
  hint: string
}

export interface SimEvent {
  id: string
  emoji: string
  title: string
  body: string
  choices: Choice[]
}

/** A realistic mix of yearly stock-market returns (with a crash applied by its event). */
const MARKET = [0.26, 0.12, -0.04, 0.18, 0.07, 0.21, 0.1, 0.15, 0.01, 0.13, 0.28, -0.06, 0.09, 0.19, 0.05]

const clampHappy = (h: number) => Math.max(0, Math.min(100, Math.round(h)))
export const netWorth = (s: SimState) => s.cash + s.invested - s.debt
export const takeHome = (s: SimState) => s.salary * TAKE_HOME_RATE + s.extraIncome
export const essentials = (s: SimState) => s.salary * TAKE_HOME_RATE * ESSENTIALS_SHARE + s.extraEssentials
export const flexible = (s: SimState) => Math.max(0, takeHome(s) - essentials(s) - (s.matchJoined ? s.salary * 0.06 : 0))

/** Pay from cash first; any shortfall goes on the credit card. */
function payFromCash(s: SimState, amount: number): SimState {
  const fromCash = Math.min(s.cash, amount)
  return { ...s, cash: s.cash - fromCash, debt: s.debt + (amount - fromCash) }
}

const EVENTS: Record<string, { event: Omit<SimEvent, 'id'>; apply: (s: SimState, choice: number, r: ReturnType<typeof rng>) => [SimState, string] }> = {
  car: {
    event: { emoji: '🚗', title: 'Your car breaks down', body: 'The repair costs $2,000.', choices: [{ label: 'Pay for the repair', hint: 'From your emergency fund — or the credit card if it’s short' }, { label: 'Take the bus for a year', hint: 'No cost, but it’s a hassle' }] },
    apply: (s, c) =>
      c === 0
        ? [payFromCash(s, 2000), s.cash >= 2000 ? 'Your emergency fund covered it. Stress-free!' : 'Not enough cash — the rest went on the credit card at 22%.']
        : [{ ...s, happiness: clampHappy(s.happiness - 8) }, 'You saved $2,000 but lost a lot of free time.'],
  },
  job: {
    event: { emoji: '💼', title: 'A job offer', body: 'A new company offers 15% more pay, with longer hours.', choices: [{ label: 'Take the offer', hint: '+15% salary, a bit more stress' }, { label: 'Stay where you are', hint: 'Keep your current balance' }] },
    apply: (s, c) => (c === 0 ? [{ ...s, salary: s.salary * 1.15, happiness: clampHappy(s.happiness - 4) }, 'Salary +15%! Remember: spend raises slowly.'] : [{ ...s, happiness: clampHappy(s.happiness + 2) }, 'You kept your work-life balance.']),
  },
  crash: {
    event: {
      emoji: '📉',
      title: 'The market crashes 30%',
      body: 'Headlines are scary and your investments just dropped.',
      choices: [
        { label: 'Stay the course', hint: 'Hold and keep investing' },
        { label: 'Sell everything', hint: 'Move investments to cash' },
        { label: 'Buy more', hint: 'Move half your emergency cash into investments' },
      ],
    },
    apply: (s, c) => {
      const crashed = { ...s, forcedReturn: -0.3 }
      if (c === 1) return [{ ...crashed, cash: s.cash + s.invested * 0.7, invested: 0, soldInCrash: true, missedRebound: true }, 'You locked in the loss and will miss the rebound.']
      if (c === 2) return [{ ...crashed, invested: s.invested + s.cash / 2 / 0.7, cash: s.cash / 2 }, 'Bold! You bought at a discount (but have less of a cushion).']
      return [crashed, 'You held on. Historically, markets have recovered from every crash.']
    },
  },
  bonus: {
    event: { emoji: '🎁', title: 'A $3,000 bonus!', body: 'Your hard work paid off. What do you do with it?', choices: [{ label: 'Treat yourself', hint: 'Happiness boost' }, { label: 'Pay down debt', hint: 'Or save it if you have no debt' }, { label: 'Invest it', hint: 'Let it compound' }] },
    apply: (s, c) => {
      if (c === 0) return [{ ...s, happiness: clampHappy(s.happiness + 8) }, 'Enjoyed it! Balance matters too.']
      if (c === 1) {
        const pay = Math.min(3000, s.debt)
        return [{ ...s, debt: s.debt - pay, cash: s.cash + (3000 - pay) }, pay > 0 ? 'A guaranteed 22% return by killing debt.' : 'No debt — it went to your emergency fund.']
      }
      return [{ ...s, invested: s.invested + 3000 }, 'Invested. Time in the market does the rest.']
    },
  },
  medical: {
    event: { emoji: '🩺', title: 'An unexpected medical bill', body: 'You owe $1,500.', choices: [{ label: 'Pay it now', hint: 'From your emergency fund if you can' }, { label: 'Put it on the credit card', hint: 'Deal with it later' }] },
    apply: (s, c) => (c === 0 ? [payFromCash(s, 1500), s.cash >= 1500 ? 'Paid from savings — this is what an emergency fund is for.' : 'Cash ran short, so part landed on the card.'] : [{ ...s, debt: s.debt + 1500 }, 'Now it grows at 22% APR…']),
  },
  wedding: {
    event: { emoji: '💒', title: 'Your best friend’s wedding', body: 'Travel and gifts will cost about $1,200.', choices: [{ label: 'Go and celebrate', hint: '$1,200, big happiness boost' }, { label: 'Skip it', hint: 'Save the money' }] },
    apply: (s, c) => (c === 0 ? [{ ...payFromCash(s, 1200), happiness: clampHappy(s.happiness + 7) }, 'Great memories. Money is for living, too.'] : [{ ...s, happiness: clampHappy(s.happiness - 5) }, 'You saved money but missed out.']),
  },
  apartment: {
    event: { emoji: '🏠', title: 'A nicer apartment', body: 'It costs $400/month more than your current place.', choices: [{ label: 'Upgrade', hint: '+$4,800/year of essentials, forever' }, { label: 'Stay put', hint: 'Keep costs low' }] },
    apply: (s, c) => (c === 0 ? [{ ...s, extraEssentials: s.extraEssentials + 4800, happiness: clampHappy(s.happiness + 6) }, 'Nice place! This is how lifestyle creep starts.'] : [s, 'Keeping fixed costs low gives you flexibility.']),
  },
  match: {
    event: { emoji: '🏢', title: 'Your employer adds a 401(k) match', body: 'They’ll add 50% of what you contribute, up to 6% of salary.', choices: [{ label: 'Contribute 6%', hint: 'Less take-home, free money every year' }, { label: 'Not now', hint: 'Keep your paycheck as is' }] },
    apply: (s, c) => (c === 0 ? [{ ...s, matchJoined: true }, 'Free money unlocked: +3% of salary every year.'] : [s, 'You left free money on the table.']),
  },
  raise: {
    event: { emoji: '📈', title: 'Annual review time', body: 'You did great work this year.', choices: [{ label: 'Accept the standard 3%', hint: 'Safe and simple' }, { label: 'Negotiate for more', hint: 'Could get 8% — or just 2%' }] },
    apply: (s, c, r) => {
      if (c === 0) return [{ ...s, salary: s.salary * 1.03 }, '+3% salary.']
      const won = r.int(0, 1) === 1
      return [{ ...s, salary: s.salary * (won ? 1.08 : 1.02) }, won ? 'You negotiated an 8% raise!' : 'Only 2% this time — but asking was worth it.']
    },
  },
  side: {
    event: { emoji: '🛠️', title: 'A side-hustle opportunity', body: 'Freelancing could add $6,000 a year.', choices: [{ label: 'Start the side hustle', hint: '+$6,000/yr, less free time' }, { label: 'Pass', hint: 'Protect your evenings' }] },
    apply: (s, c) => (c === 0 ? [{ ...s, extraIncome: s.extraIncome + 6000, happiness: clampHappy(s.happiness - 3) }, 'Extra income! Save most of it.'] : [s, 'Rest is valuable too.']),
  },
}

export const EVENT_IDS = Object.keys(EVENTS)

export function createGame(seed: number): SimState {
  const r = rng(seed)
  const order = [...EVENT_IDS]
  for (let i = order.length - 1; i > 0; i--) {
    const j = r.int(0, i)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return {
    seed,
    year: 0,
    age: 22,
    salary: 50_000,
    extraIncome: 0,
    extraEssentials: 0,
    cash: 500,
    debt: 8_000,
    invested: 0,
    happiness: 60,
    matchJoined: false,
    forcedReturn: null,
    soldInCrash: false,
    missedRebound: false,
    eventOrder: order.slice(0, YEARS),
    log: [],
    pendingNote: '',
    pendingChoice: '',
  }
}

export function currentEvent(s: SimState): SimEvent | null {
  if (s.year >= YEARS) return null
  const id = s.eventOrder[s.year]
  return { id, ...EVENTS[id].event }
}

export function applyChoice(s: SimState, choice: number): SimState {
  const ev = currentEvent(s)
  if (!ev) return s
  const r = rng(s.seed * 31 + s.year * 7 + choice)
  const [next, note] = EVENTS[ev.id].apply(s, choice, r)
  return { ...next, pendingNote: note, pendingChoice: ev.choices[choice].label }
}

/** Live the rest of the year with this split of flexible money, then advance one year. */
export function liveYear(s: SimState, a: Allocation): SimState {
  const total = a.fun + a.emergency + a.debt + a.invest || 1
  const flex = flexible(s)
  const part = (x: number) => (flex * x) / total
  let st: SimState = { ...s }
  // Extra debt payments: anything beyond the balance flows into investments.
  const debtPay = Math.min(part(a.debt), st.debt)
  st.debt -= debtPay
  st.invested += part(a.invest) + (part(a.debt) - debtPay)
  st.cash += part(a.emergency)
  if (st.matchJoined) st.invested += st.salary * 0.06 * 1.5 // your 6% plus the 3% match
  // Growth and interest over the year
  const r = rng(s.seed * 97 + s.year)
  const drawn = MARKET[r.int(0, MARKET.length - 1)]
  // After a crash, markets usually rebound — unless you sold (you miss it).
  const prevCrash = s.log.at(-1)?.eventId === 'crash'
  const marketReturn = st.forcedReturn ?? (prevCrash ? 0.25 : drawn)
  st.invested *= 1 + (st.missedRebound && prevCrash ? 0 : marketReturn)
  st.cash *= 1 + CASH_RATE
  st.debt *= 1 + DEBT_APR
  // Happiness: some fun matters; debt and a thin cushion add stress.
  const funShare = (a.fun / total) * 100
  let h = st.happiness + (funShare - 20) / 4
  if (st.debt > 0) h -= 3
  if (st.cash < essentials(st) / 4) h -= 2 // less than ~3 months of essentials
  st.happiness = clampHappy(h)
  st.age += 1
  st.year += 1
  st.log = [
    ...s.log,
    { year: st.year, age: st.age, eventId: s.eventOrder[s.year], choice: s.pendingChoice, marketReturn, netWorth: netWorth(st), happiness: st.happiness, note: s.pendingNote },
  ]
  st = { ...st, forcedReturn: null, pendingNote: '', pendingChoice: '', missedRebound: prevCrash ? false : st.missedRebound }
  return st
}

export interface SimResult {
  netWorth: number
  happiness: number
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  lessons: { lessonId: string; why: string }[]
}

export function finalResult(s: SimState): SimResult {
  const nw = netWorth(s)
  const score = Math.round(nw / 1000 + s.happiness / 2)
  let grade: SimResult['grade'] = nw >= 120_000 ? 'A' : nw >= 80_000 ? 'B' : nw >= 40_000 ? 'C' : nw >= 0 ? 'D' : 'F'
  // A great outcome needs a life you enjoyed, too.
  if (s.happiness < 40 && grade === 'A') grade = 'B'
  const lessons: SimResult['lessons'] = []
  if (s.soldInCrash) lessons.push({ lessonId: 'l-boglehead', why: 'You sold during the crash and missed the rebound — see “stay the course”.' })
  if (s.debt > 0) lessons.push({ lessonId: 'l-payoff', why: 'Credit card debt was still growing at 22% at the end.' })
  if (s.log.some((l) => (l.eventId === 'car' || l.eventId === 'medical') && /card/.test(l.note))) lessons.push({ lessonId: 'l-emergency', why: 'An emergency landed on your credit card.' })
  if (!s.matchJoined && s.eventOrder.includes('match')) lessons.push({ lessonId: 'l-401k', why: 'You skipped a free employer match.' })
  if (s.invested < 30_000) lessons.push({ lessonId: 'l-compound', why: 'Investing more, earlier, lets compounding work for you.' })
  if (s.happiness < 40) lessons.push({ lessonId: 'l-budget', why: 'All work and no fun — budgets should include things you enjoy.' })
  return { netWorth: nw, happiness: s.happiness, score, grade, lessons }
}
