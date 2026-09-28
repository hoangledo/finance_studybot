import { futureValue, loanPayment, usd } from '../lib/finance'

/**
 * "Number-crunch" flashcards: finance-math questions with fresh numbers every review.
 * Each template draws random inputs, computes the answer with the app's own formulas, and
 * suggests plausible wrong answers based on common mistakes.
 */

export type CalcFormat = 'money' | 'years' | 'percent'

export interface CalcDraw {
  question: string
  answer: number
  mistakes: number[] // plausible wrong answers (e.g. simple instead of compound interest)
  format: CalcFormat
  explain: string
}

export interface CalcTemplate {
  id: string
  conceptId: string
  title: string // shown in lists (the card's front when not reviewing)
  draw: (r: Rng) => CalcDraw
}

export interface Rng {
  int: (min: number, max: number, step?: number) => number
  pick: <T>(xs: readonly T[]) => T
}

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const CALC_TEMPLATES: CalcTemplate[] = [
  {
    id: 'compound-lump',
    conceptId: 'compound-interest',
    title: 'Number crunch: compound growth',
    draw: (r) => {
      const p = r.int(5, 50, 5) * 1000
      const rate = r.pick([0.05, 0.06, 0.07, 0.08] as const)
      const years = r.pick([10, 20, 30] as const)
      const answer = p * Math.pow(1 + rate, years)
      return {
        question: `You invest ${usd(p)} once and earn ${pct(rate)} a year, compounded yearly. About how much is it worth after ${years} years?`,
        answer,
        mistakes: [p * (1 + rate * years), p * rate * years, answer * 1.6],
        format: 'money',
        explain: `${usd(p)} × (1 + ${rate})^${years} ≈ ${usd(answer)}. Simple interest would give only ${usd(p * (1 + rate * years))}: compounding earns returns on past returns.`,
      }
    },
  },
  {
    id: 'rule-of-72',
    conceptId: 'compound-interest',
    title: 'Number crunch: Rule of 72',
    draw: (r) => {
      const rate = r.pick([3, 4, 6, 8, 9, 12] as const)
      const answer = 72 / rate
      return {
        question: `Using the Rule of 72, about how many years does money take to double at ${rate}% a year?`,
        answer,
        mistakes: [100 / rate, 72 / (rate * 2), rate * 1.5],
        format: 'years',
        explain: `72 ÷ ${rate} = ${Math.round(answer * 10) / 10} years.`,
      }
    },
  },
  {
    id: 'monthly-investing',
    conceptId: 'compound-interest',
    title: 'Number crunch: investing every month',
    draw: (r) => {
      const monthly = r.int(100, 800, 50)
      const years = r.pick([20, 25, 30] as const)
      const answer = futureValue(0, monthly, 0.07, years)
      const contributed = monthly * 12 * years
      return {
        question: `You invest ${usd(monthly)} every month for ${years} years at 7% a year. Roughly what does it grow to?`,
        answer,
        mistakes: [contributed, contributed * 1.2, answer * 2],
        format: 'money',
        explain: `You put in ${usd(contributed)}; compounding grows it to about ${usd(answer)}.`,
      }
    },
  },
  {
    id: 'four-percent',
    conceptId: 'four-percent-rule',
    title: 'Number crunch: your FI number',
    draw: (r) => {
      const spend = r.int(30, 90, 5) * 1000
      return {
        question: `You spend ${usd(spend)} a year. Using the 4% rule, how much do you need invested to be financially independent?`,
        answer: spend * 25,
        mistakes: [spend * 4, spend * 10, spend * 40],
        format: 'money',
        explain: `4% rule → 25× annual spending: ${usd(spend)} × 25 = ${usd(spend * 25)}.`,
      }
    },
  },
  {
    id: 'expense-fee',
    conceptId: 'expense-ratio',
    title: 'Number crunch: fund fees',
    draw: (r) => {
      const bal = r.int(20, 200, 10) * 1000
      const fee = r.pick([0.0004, 0.005, 0.01] as const)
      const answer = bal * fee
      return {
        question: `You have ${usd(bal)} in a fund with a ${pct(fee)} expense ratio. About how much does it cost you per year?`,
        answer,
        mistakes: [answer * 10, answer / 10, answer * 100],
        format: 'money',
        explain: `${usd(bal)} × ${pct(fee)} = ${usd(answer)} a year — every year, and you also lose the growth on it.`,
      }
    },
  },
  {
    id: 'card-interest',
    conceptId: 'apr',
    title: 'Number crunch: credit card interest',
    draw: (r) => {
      const bal = r.int(2, 12, 1) * 1000
      const apr = r.pick([0.18, 0.22, 0.24, 0.29] as const)
      const answer = bal * apr
      return {
        question: `You carry a ${usd(bal)} credit card balance at ${pct(apr)} APR all year. About how much interest is that?`,
        answer,
        mistakes: [answer / 12, answer * 2, bal * 0.05],
        format: 'money',
        explain: `${usd(bal)} × ${pct(apr)} ≈ ${usd(answer)} a year (a bit more with monthly compounding) — a guaranteed ${pct(apr)} return if you pay it off.`,
      }
    },
  },
  {
    id: 'budget-savings',
    conceptId: 'rule-50-30-20',
    title: 'Number crunch: 50/30/20 savings',
    draw: (r) => {
      const pay = r.int(25, 80, 5) * 100
      return {
        question: `Your take-home pay is ${usd(pay)} a month. Under 50/30/20, how much goes to savings and extra debt payments?`,
        answer: pay * 0.2,
        mistakes: [pay * 0.3, pay * 0.5, pay * 0.1],
        format: 'money',
        explain: `20% of ${usd(pay)} = ${usd(pay * 0.2)} (needs ${usd(pay * 0.5)}, wants ${usd(pay * 0.3)}).`,
      }
    },
  },
  {
    id: 'emergency-size',
    conceptId: 'emergency-fund',
    title: 'Number crunch: emergency fund size',
    draw: (r) => {
      const exp = r.int(18, 45, 1) * 100
      const months = r.pick([3, 4, 6] as const)
      return {
        question: `Your essential expenses are ${usd(exp)} a month. How big is a ${months}-month emergency fund?`,
        answer: exp * months,
        mistakes: [exp * 12, exp * (months === 6 ? 3 : 6), exp],
        format: 'money',
        explain: `${months} × ${usd(exp)} = ${usd(exp * months)}. Base it on essential expenses, not income.`,
      }
    },
  },
  {
    id: 'utilization',
    conceptId: 'credit-utilization',
    title: 'Number crunch: credit utilization',
    draw: (r) => {
      const limit = r.int(4, 20, 1) * 1000
      const bal = Math.round(limit * r.pick([0.1, 0.2, 0.3, 0.45, 0.6] as const))
      const answer = bal / limit
      return {
        question: `You have ${usd(bal)} of card balances across ${usd(limit)} of total limits. What is your credit utilization?`,
        answer,
        mistakes: [1 - answer, answer / 2, Math.min(0.95, answer * 2)],
        format: 'percent',
        explain: `${usd(bal)} ÷ ${usd(limit)} = ${pct(answer)}. Under 30% is the usual advice; under 10% is better.`,
      }
    },
  },
  {
    id: 'savings-rate',
    conceptId: 'savings-rate',
    title: 'Number crunch: savings rate',
    draw: (r) => {
      const income = r.int(40, 120, 5) * 1000
      const saved = Math.round(income * r.pick([0.1, 0.15, 0.2, 0.25, 0.3] as const))
      const answer = saved / income
      return {
        question: `You take home ${usd(income)} a year and save ${usd(saved)} of it. What is your savings rate?`,
        answer,
        mistakes: [saved / (income - saved), 1 - answer, answer * 2],
        format: 'percent',
        explain: `${usd(saved)} ÷ ${usd(income)} = ${pct(answer)}.`,
      }
    },
  },
  {
    id: 'mortgage-payment',
    conceptId: 'amortization',
    title: 'Number crunch: loan payment',
    draw: (r) => {
      const p = r.int(200, 500, 25) * 1000
      const rate = r.pick([0.05, 0.06, 0.07] as const)
      const answer = loanPayment(p, rate, 360)
      return {
        question: `A ${usd(p)} 30-year mortgage at ${pct(rate)}. About what is the monthly principal + interest payment?`,
        answer,
        mistakes: [p / 360, (p * rate) / 12, answer * 1.35],
        format: 'money',
        explain: `The amortization formula gives ≈ ${usd(answer)}/month. ${usd(p / 360)} would ignore interest; ${usd((p * rate) / 12)} is interest only.`,
      }
    },
  },
  {
    id: 'roth-vs-trad',
    conceptId: 'traditional-vs-roth',
    title: 'Number crunch: Traditional after tax',
    draw: (r) => {
      const x = r.int(5, 20, 1) * 1000
      const growth = r.pick([2, 4, 8] as const)
      const tax = r.pick([0.12, 0.22, 0.24] as const)
      const answer = x * growth * (1 - tax)
      return {
        question: `${usd(x)} goes into a Traditional account and grows ${growth}×. You withdraw it all at a ${pct(tax)} tax rate. What do you keep?`,
        answer,
        mistakes: [x * growth, x * growth * tax, x * (1 - tax)],
        format: 'money',
        explain: `${usd(x)} × ${growth} × (1 − ${pct(tax)}) = ${usd(answer)}. A Roth taxed at the same ${pct(tax)} up front would end with exactly the same amount.`,
      }
    },
  },
  {
    id: 'employer-match',
    conceptId: 'employer-match',
    title: 'Number crunch: employer match',
    draw: (r) => {
      const salary = r.int(40, 120, 5) * 1000
      const [matchPct, upTo] = r.pick([
        [0.5, 0.06],
        [1, 0.04],
        [1, 0.05],
        [0.5, 0.08],
      ] as const)
      const answer = salary * upTo * matchPct
      return {
        question: `Salary ${usd(salary)}. Your employer matches ${matchPct * 100}% of contributions up to ${upTo * 100}% of salary, and you contribute ${upTo * 100}%. How much does the employer add per year?`,
        answer,
        mistakes: [salary * upTo, salary * matchPct, answer / 2],
        format: 'money',
        explain: `You put in ${usd(salary * upTo)}; ${matchPct * 100}% of that is ${usd(answer)} of free money.`,
      }
    },
  },
]

export const CALC_BY_ID = Object.fromEntries(CALC_TEMPLATES.map((t) => [t.id, t]))
