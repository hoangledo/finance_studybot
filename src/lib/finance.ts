/** Pure personal-finance math used by the calculator widgets. Rates are decimals (0.07 = 7%). */

export interface YearPoint {
  year: number
  balance: number
  contributed: number
}

/** Month-by-month growth with a contribution at the end of every month, sampled once a year. */
export function growthSeries(
  principal: number,
  monthly: number,
  annualRate: number,
  years: number,
): YearPoint[] {
  const r = annualRate / 12
  let balance = principal
  let contributed = principal
  const out: YearPoint[] = [{ year: 0, balance, contributed }]
  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + r) + monthly
    contributed += monthly
    if (m % 12 === 0) out.push({ year: m / 12, balance, contributed })
  }
  return out
}

export function futureValue(principal: number, monthly: number, annualRate: number, years: number) {
  const s = growthSeries(principal, monthly, annualRate, years)
  return s[s.length - 1].balance
}

/** How much an expense ratio costs you: the same plan grown at (return) vs (return - fee). */
export function feeDrag(principal: number, monthly: number, annualReturn: number, fee: number, years: number) {
  const gross = growthSeries(principal, monthly, annualReturn, years)
  const net = growthSeries(principal, monthly, annualReturn - fee, years)
  return {
    series: gross.map((p, i) => ({ year: p.year, noFee: p.balance, withFee: net[i].balance })),
    lost: gross[gross.length - 1].balance - net[net.length - 1].balance,
  }
}

/**
 * Traditional vs Roth for the same pre-tax dollars.
 * Traditional: the full amount grows, then is taxed at the retirement rate.
 * Roth: tax is paid now, the remainder grows untaxed.
 */
export function rothVsTraditional(
  preTaxAmount: number,
  annualReturn: number,
  years: number,
  taxNow: number,
  taxLater: number,
) {
  const growth = Math.pow(1 + annualReturn, years)
  const traditional = preTaxAmount * growth * (1 - taxLater)
  const roth = preTaxAmount * (1 - taxNow) * growth
  return { traditional, roth, winner: roth > traditional ? 'roth' : roth < traditional ? 'traditional' : 'tie' }
}

/** Standard amortized loan payment. */
export function loanPayment(principal: number, annualRate: number, months: number) {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12
  return (principal * r) / (1 - Math.pow(1 + r, -months))
}

export interface Debt {
  name: string
  balance: number
  rate: number // APR decimal
  minPayment: number
}

export interface PayoffResult {
  months: number
  totalInterest: number
  order: string[] // names in the order they were paid off
  series: { month: number; total: number }[]
  feasible: boolean
}

/** Simulate paying several debts with a fixed monthly budget. Extra money goes to the target debt. */
export function payoffPlan(debts: Debt[], budget: number, strategy: 'avalanche' | 'snowball'): PayoffResult {
  const ds = debts.filter((d) => d.balance > 0).map((d) => ({ ...d }))
  const minTotal = ds.reduce((s, d) => s + d.minPayment, 0)
  if (budget < minTotal || ds.length === 0) {
    return { months: 0, totalInterest: 0, order: [], series: [], feasible: ds.length === 0 }
  }
  const sortKey = (a: Debt, b: Debt) => (strategy === 'avalanche' ? b.rate - a.rate : a.balance - b.balance)
  let month = 0
  let totalInterest = 0
  const order: string[] = []
  const series = [{ month: 0, total: ds.reduce((s, d) => s + d.balance, 0) }]
  while (ds.some((d) => d.balance > 0.005) && month < 1200) {
    month++
    for (const d of ds) {
      if (d.balance <= 0) continue
      const interest = d.balance * (d.rate / 12)
      d.balance += interest
      totalInterest += interest
    }
    let money = budget
    // Minimums first
    for (const d of ds) {
      if (d.balance <= 0) continue
      const pay = Math.min(d.minPayment, d.balance)
      d.balance -= pay
      money -= pay
    }
    // Extra to targets in strategy order (snowball re-sorts by current balance)
    const targets = ds.filter((d) => d.balance > 0).sort(sortKey)
    for (const d of targets) {
      if (money <= 0) break
      const pay = Math.min(money, d.balance)
      d.balance -= pay
      money -= pay
    }
    for (const d of ds) {
      if (d.balance <= 0.005 && !order.includes(d.name)) {
        d.balance = 0
        order.push(d.name)
      }
    }
    series.push({ month, total: ds.reduce((s, d) => s + d.balance, 0) })
  }
  return { months: month, totalInterest, order, series, feasible: month < 1200 }
}

/**
 * Years until investments cover expenses at a safe withdrawal rate
 * (the classic "savings rate → years to retire" math). Uses real (after-inflation) returns.
 */
export function yearsToFI(
  income: number,
  savingsRate: number,
  realReturn: number,
  withdrawalRate = 0.04,
  startingBalance = 0,
): number {
  const saved = income * savingsRate
  const expenses = income - saved
  if (expenses <= 0) return 0
  const target = expenses / withdrawalRate
  let bal = startingBalance
  let years = 0
  while (bal < target && years < 100) {
    bal = bal * (1 + realReturn) + saved
    years++
  }
  if (years === 0) return 0
  // Interpolate within the final year for a smoother number
  const prev = (bal - saved) / (1 + realReturn)
  const frac = (target - prev) / (bal - prev)
  return years - 1 + Math.max(0, Math.min(1, frac))
}

export function budgetSplit(takeHome: number, needs = 0.5, wants = 0.3) {
  return { needs: takeHome * needs, wants: takeHome * wants, savings: takeHome * (1 - needs - wants) }
}

export const usd = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits })

export const compactUsd = (n: number) =>
  Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `$${(n / 1e3).toFixed(0)}k` : usd(n)
