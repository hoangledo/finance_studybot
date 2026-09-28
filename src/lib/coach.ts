/** Money coach: turn real spending data into the next lesson / mission / tool to try. Pure and tested. */
import type { MoneySettings, Transaction } from '../types'
import { addDays } from './dates'
import { periodRange, summarize } from './budget'

export interface CoachTip {
  id: string
  emoji: string
  title: string
  body: string
  to: string // route
  cta: string
  priority: number
}

export interface CoachInput {
  transactions: Transaction[]
  settings: MoneySettings
  today: string
  lessonsDone: Set<string>
  missionsDone: Set<string>
}

const EMERGENCY = new Set(['cat-emergency'])
const DEBT = new Set(['cat-debt', 'cat-extra-debt'])
const INVEST = new Set(['cat-invest', 'cat-roth'])

/** Prefer the lesson until it's done, then the first unfinished mission. */
function next(i: CoachInput, lesson: string | null, missions: string[]): { to: string; cta: string } | null {
  if (lesson && !i.lessonsDone.has(lesson)) return { to: `/lesson/${lesson}`, cta: 'Take the lesson' }
  const m = missions.find((id) => !i.missionsDone.has(id))
  if (m) return { to: `/missions#${m}`, cta: 'Start the mission' }
  return null
}

export function coachInsights(i: CoachInput): CoachTip[] {
  const tips: CoachTip[] = []
  const add = (t: Omit<CoachTip, 'to' | 'cta'>, target: { to: string; cta: string } | null) => target && tips.push({ ...t, ...target })

  if (i.transactions.length === 0) {
    add(
      { id: 'no-data', emoji: '🧾', title: 'Start with a month of real numbers', body: 'Log your income and spending in My Money so I can coach you on your own situation.', priority: 50 },
      next(i, null, ['track-a-month']) ?? { to: '/money', cta: 'Open My Money' },
    )
    return tips
  }

  const month = periodRange('month', i.today)
  const s = summarize(i.transactions, month)
  const since = addDays(i.today, -90)
  const recent = i.transactions.filter((t) => t.date >= since && t.date <= i.today)
  const hasIncome = recent.some((t) => t.kind === 'income')
  const t = i.settings.targets

  if (s.incomeCents > 0 && s.spentCents > s.incomeCents)
    add(
      { id: 'overspent', emoji: '🚨', title: 'Spending is above income this month', body: 'That gap usually lands on a credit card. A zero-based budget gives every dollar a job first.', priority: 95 },
      next(i, 'l-budget', ['track-a-month', 'review-subscriptions']) ?? { to: '/money', cta: 'Review this month' },
    )

  if (s.incomeCents > 0 && s.split.want * 100 > t.want + 5)
    add(
      {
        id: 'wants-high',
        emoji: '🛍️',
        title: `Wants are ${Math.round(s.split.want * 100)}% of income`,
        body: `That's ${Math.round(s.split.want * 100 - t.want)} points over your ${t.want}% target. Subscriptions are the easiest place to trim.`,
        priority: 90,
      },
      next(i, 'l-budget', ['review-subscriptions']),
    )

  if (hasIncome && !recent.some((x) => EMERGENCY.has(x.categoryId)))
    add(
      { id: 'no-emergency', emoji: '🛟', title: 'No emergency-fund savings lately', body: 'A cushion of even $1,000 keeps a surprise bill off your credit card.', priority: 85 },
      next(i, 'l-emergency', ['open-hysa', 'starter-fund']),
    )

  if (s.incomeCents > 0 && s.savingsRate !== null && s.savingsRate < t.savings / 100)
    add(
      {
        id: 'low-savings',
        emoji: '📉',
        title: `Savings rate is ${Math.round(s.savingsRate * 100)}%`,
        body: `Your target is ${t.savings}%. Automating a transfer on payday is the easiest fix — then see how it changes your years to FI.`,
        priority: 80,
      },
      next(i, null, ['automate-savings']) ?? { to: '/tools', cta: 'Open Years to FI' },
    )

  if (recent.some((x) => DEBT.has(x.categoryId)))
    add(
      { id: 'debt', emoji: '❄️', title: 'You’re paying down debt', body: 'A written avalanche or snowball plan makes every extra dollar count.', priority: 70 },
      next(i, 'l-payoff', ['debt-plan', 'autopay-minimums']),
    )

  if (hasIncome && !recent.some((x) => INVEST.has(x.categoryId)))
    add(
      { id: 'no-investing', emoji: '📈', title: 'No investing logged yet', body: 'Time in the market is your biggest ally. Start with the free money: your employer match.', priority: 60 },
      next(i, 'l-index', ['get-the-match', 'roth-ira']),
    )

  if (tips.length === 0 && s.incomeCents > 0)
    add(
      { id: 'on-track', emoji: '🎉', title: 'You’re on track this month', body: 'Split looks healthy. Keep the streak going — or rehearse bigger decisions in the Life Simulator.', priority: 10 },
      { to: '/sim', cta: 'Play the simulator' },
    )

  // Highest priority first; one tip per destination.
  const seen = new Set<string>()
  return tips
    .sort((a, b) => b.priority - a.priority)
    .filter((x) => (seen.has(x.to) ? false : (seen.add(x.to), true)))
}
