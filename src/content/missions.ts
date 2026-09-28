/**
 * Real-world money missions: small, concrete actions that turn a lesson into a habit.
 * Educational checklists only — the app never asks for account numbers or passwords.
 */

export type MissionGroup = 'start' | 'protect' | 'debt' | 'invest'

export interface Mission {
  id: string
  group: MissionGroup
  title: string
  emoji: string
  why: string // one-sentence motivation
  conceptId: string // concept to read more about
  lessonId?: string
  xp: number
  steps: { text: string; tip?: string }[]
}

export const MISSION_GROUPS: Record<MissionGroup, { title: string; subtitle: string }> = {
  start: { title: 'Start here', subtitle: 'See where your money goes' },
  protect: { title: 'Protect yourself', subtitle: 'Cushions and safeguards' },
  debt: { title: 'Debt & credit', subtitle: 'Pay less interest' },
  invest: { title: 'Invest', subtitle: 'Put money to work' },
}

export const MISSIONS: Mission[] = [
  {
    id: 'track-a-month',
    group: 'start',
    title: 'Track one month of spending',
    emoji: '🧾',
    why: 'You can’t plan what you can’t see — a month of real data beats any guess.',
    conceptId: 'budget',
    lessonId: 'l-budget',
    xp: 40,
    steps: [
      { text: 'Log this month’s take-home income in My Money' },
      { text: 'Log your rent / housing and bills', tip: 'Mark them “Repeats monthly” so they fill in automatically.' },
      { text: 'Log everyday spending for at least 2 weeks' },
      { text: 'Look at your split vs. 50/30/20 on the Money page' },
    ],
  },
  {
    id: 'review-subscriptions',
    group: 'start',
    title: 'Review your subscriptions',
    emoji: '📺',
    why: 'Forgotten subscriptions are the easiest “wants” to cut.',
    conceptId: 'lifestyle-inflation',
    lessonId: 'l-networth',
    xp: 30,
    steps: [
      { text: 'List every subscription from your bank or card statements' },
      { text: 'Mark the ones you haven’t used in the last month' },
      { text: 'Cancel or downgrade at least one' },
      { text: 'Move what you saved to savings (log it as Savings)' },
    ],
  },
  {
    id: 'automate-savings',
    group: 'start',
    title: 'Pay yourself first',
    emoji: '🤖',
    why: 'Automatic saving happens even on days you don’t feel disciplined.',
    conceptId: 'pay-yourself-first',
    lessonId: 'l-budget',
    xp: 40,
    steps: [
      { text: 'Pick an amount to save each payday (start small — even $25)' },
      { text: 'Set up an automatic transfer on payday in your bank app' },
      { text: 'Add it in My Money as a recurring Savings entry' },
    ],
  },
  {
    id: 'open-hysa',
    group: 'protect',
    title: 'Open a high-yield savings account',
    emoji: '🏦',
    why: 'Your emergency fund should earn real interest while staying safe and liquid.',
    conceptId: 'hysa',
    lessonId: 'l-emergency',
    xp: 50,
    steps: [
      { text: 'Compare a few FDIC-insured online banks’ savings rates' },
      { text: 'Check for monthly fees and minimums (look for none)' },
      { text: 'Open the account and link your checking account' },
      { text: 'Make a first deposit and nickname it “Emergency fund”' },
    ],
  },
  {
    id: 'starter-fund',
    group: 'protect',
    title: 'Build a $1,000 starter fund',
    emoji: '🛟',
    why: 'A small cushion keeps surprises from landing on a credit card.',
    conceptId: 'emergency-fund',
    lessonId: 'l-emergency',
    xp: 60,
    steps: [
      { text: 'Decide how much you can move per paycheck' },
      { text: 'Reach $250' },
      { text: 'Reach $500' },
      { text: 'Reach $1,000 🎉' },
    ],
  },
  {
    id: 'freeze-credit',
    group: 'protect',
    title: 'Freeze your credit',
    emoji: '🧊',
    why: 'A free credit freeze blocks most new-account identity fraud and doesn’t hurt your score.',
    conceptId: 'credit-report',
    lessonId: 'l-credit',
    xp: 40,
    steps: [
      { text: 'Freeze at Equifax' },
      { text: 'Freeze at Experian' },
      { text: 'Freeze at TransUnion' },
      { text: 'Store the PINs / logins in your password manager', tip: 'You’ll temporarily lift a freeze when you apply for credit.' },
    ],
  },
  {
    id: 'credit-report',
    group: 'debt',
    title: 'Check your credit reports',
    emoji: '📄',
    why: 'Errors on your report can cost you money — checking is free and doesn’t hurt your score.',
    conceptId: 'credit-report',
    lessonId: 'l-credit',
    xp: 30,
    steps: [
      { text: 'Get your free reports at AnnualCreditReport.com' },
      { text: 'Check every account is really yours' },
      { text: 'Dispute anything wrong with that bureau' },
    ],
  },
  {
    id: 'autopay-minimums',
    group: 'debt',
    title: 'Never miss a payment',
    emoji: '⏰',
    why: 'Payment history is about 35% of your credit score.',
    conceptId: 'credit-score',
    lessonId: 'l-credit',
    xp: 30,
    steps: [
      { text: 'Turn on autopay for at least the minimum on every card and loan' },
      { text: 'Set a calendar reminder a few days before each due date' },
      { text: 'Pay card statements in full when you can' },
    ],
  },
  {
    id: 'debt-plan',
    group: 'debt',
    title: 'Make a debt payoff plan',
    emoji: '❄️',
    why: 'A written plan (avalanche or snowball) turns debt into a countdown.',
    conceptId: 'debt-avalanche',
    lessonId: 'l-payoff',
    xp: 50,
    steps: [
      { text: 'List every debt with balance, APR and minimum payment' },
      { text: 'Enter them in the Money Lab “Debt Payoff Race”' },
      { text: 'Pick avalanche or snowball and a monthly budget' },
      { text: 'Send your first extra payment to the target debt' },
    ],
  },
  {
    id: 'get-the-match',
    group: 'invest',
    title: 'Get your full 401(k) match',
    emoji: '🏢',
    why: 'An employer match is an instant 50–100% return — free money.',
    conceptId: 'employer-match',
    lessonId: 'l-401k',
    xp: 50,
    steps: [
      { text: 'Find your employer’s match formula (HR portal or plan documents)' },
      { text: 'Check your current contribution percentage' },
      { text: 'Raise it to at least the full match' },
      { text: 'Check your vesting schedule' },
    ],
  },
  {
    id: 'check-fees',
    group: 'invest',
    title: 'Check your fund fees',
    emoji: '👹',
    why: 'A 1% fee can quietly eat a quarter of your ending wealth.',
    conceptId: 'expense-ratio',
    lessonId: 'l-index',
    xp: 40,
    steps: [
      { text: 'Look up the expense ratio of every fund you own' },
      { text: 'Flag anything above about 0.25%' },
      { text: 'Find a low-cost index fund alternative for any you flagged', tip: 'In a 401(k), look for “index” or “target date” options.' },
    ],
  },
  {
    id: 'roth-ira',
    group: 'invest',
    title: 'Open and fund a Roth IRA',
    emoji: '🌱',
    why: 'Tax-free growth for decades — and your contributions stay accessible.',
    conceptId: 'roth-ira',
    lessonId: 'l-roth',
    xp: 60,
    steps: [
      { text: 'Check that you have earned income and are under the income limit' },
      { text: 'Open a Roth IRA at a low-cost brokerage' },
      { text: 'Make a first contribution' },
      { text: 'Invest it — cash sitting in the account doesn’t grow', tip: 'A target-date or total-market index fund is a simple choice.' },
    ],
  },
]

export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]))
