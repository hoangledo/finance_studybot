import type { CardType, Domain } from '../types'

/**
 * Seed curriculum. Written for this app — each concept links out to the Bogleheads wiki
 * or r/personalfinance wiki for deeper reading. Dollar limits are 2026 IRS figures; they change yearly.
 */

export interface SeedConcept {
  id: string
  title: string
  domain: Domain
  summary: string
  sources: string[]
  cards: [front: string, back: string, type?: CardType][]
}

const bh = (page: string) => `https://www.bogleheads.org/w/index.php?search=${encodeURIComponent(page)}`
const PF_WIKI = 'https://www.reddit.com/r/personalfinance/wiki/index'
const PF_FLOW = 'https://www.reddit.com/r/personalfinance/wiki/commontopics'

export const DOMAIN_META: Record<Domain, { label: string; color: string; icon: string }> = {
  budgeting: { label: 'Budgeting & Cash Flow', color: '#14b8a6', icon: '🧾' },
  emergency: { label: 'Emergency Fund', color: '#0ea5e9', icon: '🛟' },
  debt: { label: 'Debt', color: '#ef4444', icon: '⛓️' },
  credit: { label: 'Credit', color: '#f97316', icon: '💳' },
  accounts: { label: 'Tax-Advantaged Accounts', color: '#8b5cf6', icon: '🏦' },
  tax: { label: 'Taxes', color: '#eab308', icon: '🧮' },
  investing: { label: 'Investing Fundamentals', color: '#22c55e', icon: '📈' },
  bogleheads: { label: 'Bogleheads Philosophy', color: '#10b981', icon: '🧭' },
  retirement: { label: 'Retirement & Withdrawal', color: '#6366f1', icon: '🏖️' },
  insurance: { label: 'Insurance', color: '#ec4899', icon: '🛡️' },
}

export const SEED_CONCEPTS: SeedConcept[] = [
  /* ───────────────────────── Budgeting ───────────────────────── */
  {
    id: 'budget',
    title: 'Budget',
    domain: 'budgeting',
    summary:
      'A **budget** is a plan for every dollar of take-home pay: what goes to needs, wants, savings and debt. It is step 0 of the r/personalfinance flowchart because you cannot save what you cannot see.\n\nThe mechanics matter less than the habit: track spending for a month, then decide in advance where next month\'s money goes.',
    sources: [PF_FLOW, bh('Budgeting')],
    cards: [
      ['What is a budget, in one sentence?', 'A plan that assigns every dollar of take-home pay to a job (needs, wants, saving, debt) before the month starts.'],
      ['Why is budgeting "step 0" of the r/personalfinance flowchart?', 'Every later step (emergency fund, debt payoff, investing) needs a surplus — and you only find/create the surplus by knowing where money goes.'],
      ['First practical step to start a budget?', 'Track actual spending for ~1 month (bank/credit-card exports work) so the plan is based on reality.'],
    ],
  },
  {
    id: 'rule-50-30-20',
    title: '50/30/20 rule',
    domain: 'budgeting',
    summary:
      'A simple starting budget: **50%** of take-home pay to needs (rent, groceries, minimum payments), **30%** to wants, **20%** to savings and extra debt payments. It is a rule of thumb, not a law — in high-cost cities needs may exceed 50%.',
    sources: [PF_WIKI],
    cards: [
      ['50/30/20 rule: what are the three buckets?', '50% needs, 30% wants, 20% savings & extra debt payoff (of take-home pay).'],
      ['Under 50/30/20, is a minimum loan payment a "need" or "savings"?', 'A need (the 50%). Payments *above* the minimum count toward the 20%.'],
      ['50/30/20: take-home $4,000/mo → savings bucket = ____', '$800 per month (20%).', 'cloze'],
    ],
  },
  {
    id: 'zero-based-budget',
    title: 'Zero-based budget',
    domain: 'budgeting',
    summary:
      'In a **zero-based budget**, income minus planned outflows equals exactly zero — every dollar gets a job, including savings. Popularized by apps like YNAB. Unassigned money tends to leak into spending.',
    sources: [PF_WIKI],
    cards: [
      ['What does "zero" mean in a zero-based budget?', 'Income − all assigned uses (spending + saving + debt) = $0. Every dollar is assigned; it doesn\'t mean you spend everything.'],
      ['Main advantage of zero-based budgeting?', 'No "leftover" money silently drifts into spending — savings is an explicit line item.'],
    ],
  },
  {
    id: 'pay-yourself-first',
    title: 'Pay yourself first',
    domain: 'budgeting',
    summary:
      'Move savings out **automatically on payday**, before you can spend it — e.g. a 401(k) payroll deduction or an automatic transfer to savings. It turns saving from a willpower problem into a default.',
    sources: [bh('Savings rate')],
    cards: [
      ['What does "pay yourself first" mean?', 'Automatically save/invest a set amount as soon as you\'re paid, then live on the rest.'],
      ['Why does automation beat "saving what\'s left"?', 'Spending expands to fill available money; removing it first makes saving the default and needs no willpower.'],
    ],
  },
  {
    id: 'net-worth',
    title: 'Net worth',
    domain: 'budgeting',
    summary:
      '**Net worth = assets − liabilities.** Assets: cash, investments, home equity. Liabilities: loans, card balances. Tracking it quarterly is the best single scoreboard for financial progress — income is not wealth.',
    sources: [bh('Net worth')],
    cards: [
      ['Formula for net worth?', 'Assets − Liabilities.'],
      ['A $400k house with a $320k mortgage adds how much to net worth?', '$80k (the equity).'],
      ['Why track net worth instead of income?', 'High income with high spending builds no wealth; net worth measures what you actually keep.'],
    ],
  },
  {
    id: 'savings-rate',
    title: 'Savings rate',
    domain: 'budgeting',
    summary:
      '**Savings rate** = what you save ÷ what you earn. It is the biggest lever you control: it both grows your investments *and* lowers the spending you need to replace in retirement. Many Bogleheads target 15–20%+ for a traditional retirement age.',
    sources: [bh('Savings rate')],
    cards: [
      ['Why does savings rate matter twice for retirement?', 'Saving more grows the portfolio AND shows you can live on less, shrinking the amount you need.'],
      ['Commonly cited savings target for a normal retirement age?', '~15% of gross income (including any employer match), more if starting late.'],
    ],
  },
  {
    id: 'lifestyle-inflation',
    title: 'Lifestyle inflation',
    domain: 'budgeting',
    summary:
      '**Lifestyle inflation** (lifestyle creep) is spending rising in step with income, so raises never become savings. A simple defense: save at least half of every raise.',
    sources: [PF_WIKI],
    cards: [
      ['What is lifestyle inflation?', 'Spending creeping up as income rises, so raises don\'t increase savings.'],
      ['A simple rule to beat lifestyle creep?', 'Commit a fixed share (e.g. 50%) of each raise to savings before you get used to it.'],
    ],
  },
  {
    id: 'sinking-fund',
    title: 'Sinking fund',
    domain: 'budgeting',
    summary:
      'A **sinking fund** saves a little each month for a known, irregular expense (car insurance, holidays, car replacement). It keeps predictable costs from being "emergencies".',
    sources: [PF_WIKI],
    cards: [
      ['Sinking fund vs emergency fund?', 'Sinking fund = saving for a *known* future cost (annual insurance, holidays). Emergency fund = for the *unknown* (job loss, medical).'],
      ['$1,200 annual car insurance via sinking fund → monthly set-aside = ____', '$100/month.', 'cloze'],
    ],
  },

  /* ───────────────────────── Emergency ───────────────────────── */
  {
    id: 'emergency-fund',
    title: 'Emergency fund',
    domain: 'emergency',
    summary:
      'Cash set aside for job loss, medical bills or urgent repairs. The r/personalfinance flow: first a **small starter fund** (~$1,000 or one month of expenses), then after high-interest debt a **full fund of 3–6 months of essential expenses** (more if income is volatile or you are the sole earner).\n\nKeep it safe and liquid (HYSA / money market) — not in stocks.',
    sources: [bh('Emergency funds'), PF_FLOW],
    cards: [
      ['Typical full emergency fund size?', '3–6 months of *essential* expenses (more with unstable income or dependents).'],
      ['Why build a small starter emergency fund before attacking debt?', 'So a surprise expense doesn\'t go on a credit card and undo your payoff progress.'],
      ['Why not keep your emergency fund in stocks?', 'Emergencies often coincide with market crashes/recessions — you\'d be forced to sell low. It needs to be stable and liquid.'],
      ['Is the emergency fund sized on income or expenses?', 'Expenses — specifically essential expenses you\'d still pay if your income stopped.'],
    ],
  },
  {
    id: 'hysa',
    title: 'High-yield savings account (HYSA)',
    domain: 'emergency',
    summary:
      'An FDIC-insured savings account (usually at an online bank) paying far more interest than a big-bank savings account. The standard home for an emergency fund and short-term goals. Rates float with the Fed funds rate.',
    sources: [PF_WIKI],
    cards: [
      ['Why use a HYSA for an emergency fund?', 'FDIC-insured, instantly-ish accessible, and earns meaningful interest vs ~0% at many big banks.'],
      ['FDIC insurance limit per depositor, per bank, per ownership category?', '$250,000.'],
    ],
  },
  {
    id: 'money-market-fund',
    title: 'Money market fund',
    domain: 'emergency',
    summary:
      'A mutual fund holding very short-term, high-quality debt (e.g. T-bills) that aims to keep a stable $1 share price. An alternative to a HYSA for cash; not FDIC-insured but very low risk. Treasury money market funds\' interest is usually exempt from state income tax.',
    sources: [bh('Money market fund')],
    cards: [
      ['Money market *fund* vs money market *account*?', 'Fund: a mutual fund at a brokerage (not FDIC-insured, very low risk). Account: a bank deposit (FDIC-insured).'],
      ['Tax perk of a Treasury money market fund?', 'Interest from U.S. Treasuries is generally exempt from state and local income tax.'],
    ],
  },

  /* ───────────────────────── Debt ───────────────────────── */
  {
    id: 'apr',
    title: 'APR',
    domain: 'debt',
    summary:
      '**Annual Percentage Rate** — the yearly cost of borrowing. Credit cards commonly charge 20–30% APR. Paying off a 24% card is a guaranteed, tax-free 24% return — better than any investment.',
    sources: [PF_WIKI],
    cards: [
      ['Paying off a 24% APR card is equivalent to what investment return?', 'A guaranteed, risk-free, tax-free 24% return.'],
      ['Typical credit card APR range?', 'Roughly 20–30%.'],
    ],
  },
  {
    id: 'high-interest-debt',
    title: 'High-interest debt',
    domain: 'debt',
    summary:
      'r/personalfinance treats debt above roughly **10% interest** as an emergency: pay it off aggressively right after the employer match. Moderate debt (~4–10%) gets a judgment call; low-interest debt (<~4%) can be paid on schedule while you invest.',
    sources: [PF_FLOW],
    cards: [
      ['Rough threshold for "high-interest" debt on r/personalfinance?', 'Above ~10% interest (credit cards, many personal/car loans).'],
      ['Where does high-interest debt payoff fall in the priority order?', 'After the starter emergency fund and the employer match, before IRAs and extra retirement saving.'],
      ['Why is low-interest (<4%) debt often paid only on schedule?', 'Expected long-run investment returns likely exceed the interest cost.'],
    ],
  },
  {
    id: 'debt-avalanche',
    title: 'Debt avalanche',
    domain: 'debt',
    summary:
      'Pay minimums on everything, then throw all extra money at the **highest-interest-rate** debt first. Mathematically optimal — it minimizes total interest paid.',
    sources: [PF_WIKI],
    cards: [
      ['Debt avalanche: which debt gets the extra money?', 'The one with the highest interest rate.'],
      ['Advantage of avalanche over snowball?', 'Least total interest paid and usually the fastest overall payoff.'],
    ],
  },
  {
    id: 'debt-snowball',
    title: 'Debt snowball',
    domain: 'debt',
    summary:
      'Pay minimums on everything, then attack the **smallest balance** first. Costs more interest than avalanche, but quick wins can keep people motivated. The best method is the one you stick with.',
    sources: [PF_WIKI],
    cards: [
      ['Debt snowball: which debt gets the extra money?', 'The one with the smallest balance.'],
      ['Why might someone choose snowball despite paying more interest?', 'Early paid-off accounts give motivation (behavioral win).'],
    ],
  },
  {
    id: 'minimum-payment-trap',
    title: 'Minimum payment trap',
    domain: 'debt',
    summary:
      'Card minimums are set so that most of the payment is interest. Paying only the minimum on a large balance can take **decades** and cost more than the original purchase.',
    sources: [PF_WIKI],
    cards: [
      ['Why is paying only the credit card minimum so costly?', 'Most of the minimum goes to interest, so the balance barely drops — payoff can take decades.'],
    ],
  },
  {
    id: 'student-loans',
    title: 'Student loans',
    domain: 'debt',
    summary:
      'Federal student loans have protections private ones lack: income-driven repayment, deferment, and forgiveness programs like **PSLF**. Refinancing federal loans into private ones gives those up. Prioritize by interest rate like any other debt.',
    sources: [PF_WIKI],
    cards: [
      ['Big downside of refinancing federal student loans privately?', 'You lose federal protections: income-driven repayment, deferment/forbearance, and forgiveness (e.g. PSLF).'],
      ['What is PSLF?', 'Public Service Loan Forgiveness: federal loans forgiven after 120 qualifying payments while working full-time for government or a qualifying nonprofit.'],
    ],
  },
  {
    id: 'mortgage',
    title: 'Mortgage',
    domain: 'debt',
    summary:
      'A loan secured by a home, usually 15 or 30 years. Payment = principal + interest (+ taxes and insurance via escrow = **PITI**). Early payments are mostly interest (amortization). 20% down avoids PMI.',
    sources: [bh('Mortgage')],
    cards: [
      ['What does PITI stand for?', 'Principal, Interest, Taxes, Insurance — the full monthly housing payment.'],
      ['What is PMI and how do you avoid it?', 'Private Mortgage Insurance, charged on conventional loans with <20% down; avoid with 20% down or remove it once equity hits ~20%.'],
      ['Why are early mortgage payments mostly interest?', 'Interest is charged on the remaining balance, which is largest at the start (amortization).'],
    ],
  },
  {
    id: 'amortization',
    title: 'Amortization',
    domain: 'debt',
    summary:
      'Paying a loan down with **equal payments** over time. Each payment covers that month\'s interest first; the rest reduces principal. As the balance shrinks, more of each payment goes to principal.',
    sources: [bh('Amortization')],
    cards: [
      ['In an amortizing loan, what happens to the interest share of each payment over time?', 'It shrinks — as principal falls, less interest accrues, so more of each fixed payment goes to principal.'],
    ],
  },

  /* ───────────────────────── Credit ───────────────────────── */
  {
    id: 'credit-score',
    title: 'Credit score',
    domain: 'credit',
    summary:
      'A 300–850 number (FICO is most common) estimating how likely you are to repay. Biggest factors: **payment history (~35%)**, **amounts owed / utilization (~30%)**, length of history (~15%), new credit (~10%), credit mix (~10%).',
    sources: [PF_WIKI],
    cards: [
      ['Largest factor in a FICO score?', 'Payment history (~35%) — never miss a payment; set up autopay for at least the minimum.'],
      ['Second-largest FICO factor?', 'Amounts owed, mostly credit utilization (~30%).'],
      ['Does checking your own credit score hurt it?', 'No — that\'s a soft inquiry. Only hard inquiries from applying for credit have a small, temporary effect.'],
    ],
  },
  {
    id: 'credit-utilization',
    title: 'Credit utilization',
    domain: 'credit',
    summary:
      'Revolving balances ÷ total credit limits. Lower is better — under **30%** is the common advice, under 10% is better. It has no memory: pay the balance down and the score recovers next month.',
    sources: [PF_WIKI],
    cards: [
      ['How is credit utilization calculated?', 'Total revolving balances ÷ total revolving credit limits.'],
      ['$1,500 balance on $5,000 total limits → utilization = ____', '30%', 'cloze'],
      ['Why can closing an old card hurt your score?', 'It removes that limit, raising utilization (and may shorten average account age later).'],
    ],
  },
  {
    id: 'credit-report',
    title: 'Credit report',
    domain: 'credit',
    summary:
      'Your history as recorded by the three bureaus (Equifax, Experian, TransUnion). Get free reports at **AnnualCreditReport.com**, dispute errors, and consider **freezing** your credit (free) to block identity theft.',
    sources: [PF_WIKI],
    cards: [
      ['Three US credit bureaus?', 'Equifax, Experian, TransUnion.'],
      ['Official free site for credit reports?', 'AnnualCreditReport.com'],
      ['What does a credit freeze do, and does it cost money?', 'Blocks new creditors from pulling your report (stopping most new-account fraud). It\'s free and doesn\'t affect your score.'],
    ],
  },

  /* ───────────────────────── Accounts ───────────────────────── */
  {
    id: 'prime-directive',
    title: 'The Prime Directive (money priority order)',
    domain: 'accounts',
    summary:
      'The r/personalfinance flowchart ordering:\n\n1. Budget & reduce expenses; pay essentials\n2. Small emergency fund\n3. Get the full **employer match**\n4. Pay off **high-interest debt**\n5. Full emergency fund (3–6 months)\n6. **IRA** (Roth or Traditional) — and HSA if eligible\n7. **Max the 401(k)/403(b)**\n8. Other goals & **taxable** investing, extra payments on moderate debt',
    sources: [PF_FLOW],
    cards: [
      ['First "free money" step after a starter emergency fund?', 'Contribute enough to get the full employer 401(k) match.'],
      ['After the match, what comes next on the flowchart?', 'Pay off high-interest debt.'],
      ['Which comes first: maxing the 401(k) or funding an IRA?', 'IRA first (more fund choice, often lower fees), then max the 401(k).'],
      ['Where does a taxable brokerage account fall in the order?', 'Near the end — after tax-advantaged space (match, IRA, HSA, full 401(k)) is used.'],
    ],
  },
  {
    id: '401k',
    title: '401(k)',
    domain: 'accounts',
    summary:
      'An employer retirement plan funded by payroll deductions. **Traditional** contributions reduce taxable income now; **Roth 401(k)** contributions are after-tax and grow tax-free. 2026 employee limit: **$24,500** (plus catch-up if 50+). 403(b) and 457(b) are the nonprofit/government cousins.',
    sources: [bh('401(k)')],
    cards: [
      ['2026 401(k) employee contribution limit (under 50)?', '$24,500 (check IRS each year).'],
      ['Traditional 401(k) contribution: when is it taxed?', 'Not now — it reduces taxable income today; withdrawals are taxed as ordinary income in retirement.'],
      ['What are 403(b) and 457(b)?', 'Workplace retirement plans for nonprofit/school (403b) and government (457b) employees, similar to a 401(k).'],
    ],
  },
  {
    id: 'employer-match',
    title: 'Employer match',
    domain: 'accounts',
    summary:
      'Many employers add money when you contribute, e.g. "**50% of contributions up to 6% of salary**". That is an instant 50–100% return — never leave it on the table. It usually comes before paying off high-interest debt.',
    sources: [PF_FLOW, bh('401(k)')],
    cards: [
      ['Match is "100% up to 4%" and you earn $60k. Contribute 4% ($2,400) → employer adds?', '$2,400.'],
      ['Match is "50% up to 6%", salary $80k. Minimum contribution to get the full match?', '6% of salary ($4,800), which gets you $2,400 from the employer.'],
      ['Why is the match prioritized even above paying 24% credit card debt?', 'It\'s an immediate 50–100% return, beating even 24% interest.'],
    ],
  },
  {
    id: 'vesting',
    title: 'Vesting',
    domain: 'accounts',
    summary:
      'Your own contributions are always 100% yours. Employer match may **vest** over time (e.g. 3-year cliff or 20%/year). Leave before vesting and you forfeit the unvested portion.',
    sources: [bh('Vesting')],
    cards: [
      ['Are your own 401(k) contributions subject to vesting?', 'No — they are always 100% yours. Only employer contributions can vest over time.'],
      ['What is a 3-year cliff vesting schedule?', '0% of employer money is yours until 3 years of service, then 100%.'],
    ],
  },
  {
    id: 'traditional-vs-roth',
    title: 'Traditional vs Roth',
    domain: 'accounts',
    summary:
      '**Traditional**: tax deduction now, taxed on withdrawal. **Roth**: pay tax now, tax-free withdrawals. If your tax rate is the same then and now, they come out **identical**. So the choice is a bet on your marginal rate now vs in retirement: higher now → Traditional; lower now (early career) → Roth.',
    sources: [bh('Traditional versus Roth')],
    cards: [
      ['If your tax rate now equals your rate in retirement, which wins: Roth or Traditional?', 'Neither — they produce the same after-tax result (multiplication is commutative).'],
      ['General rule for choosing Roth vs Traditional?', 'Compare marginal tax rate now vs expected rate in retirement. Higher now → Traditional; lower now → Roth.'],
      ['Why do many early-career, low-income people favor Roth?', 'Their current tax rate is likely lower than it will be later.'],
    ],
  },
  {
    id: 'roth-ira',
    title: 'Roth IRA',
    domain: 'accounts',
    summary:
      'An individual retirement account funded with after-tax dollars; growth and qualified withdrawals are **tax-free**. 2026 limit: **$7,500** (combined across all IRAs). Contributions (not earnings) can be withdrawn anytime without tax or penalty. Direct contributions phase out at higher incomes.',
    sources: [bh('Roth IRA')],
    cards: [
      ['2026 IRA contribution limit (under 50)?', '$7,500 total across all Traditional + Roth IRAs.'],
      ['Can you withdraw Roth IRA contributions before 59½?', 'Yes — contributions (not earnings) can be withdrawn anytime without tax or penalty.'],
      ['What do you need to contribute to an IRA?', 'Earned income (wages or self-employment) at least equal to the contribution, or a working spouse.'],
      ['High earners over the Roth income limit can use what workaround?', 'The backdoor Roth: nondeductible Traditional IRA contribution, then convert to Roth.'],
    ],
  },
  {
    id: 'traditional-ira',
    title: 'Traditional IRA',
    domain: 'accounts',
    summary:
      'An IRA where contributions may be **tax-deductible** (deduction phases out if you have a workplace plan and higher income). Growth is tax-deferred; withdrawals are ordinary income. Also the usual destination for **rollovers** from old 401(k)s.',
    sources: [bh('Traditional IRA')],
    cards: [
      ['When might a Traditional IRA contribution NOT be deductible?', 'When you (or a spouse) are covered by a workplace plan and income is above the phase-out range.'],
      ['How are Traditional IRA withdrawals taxed?', 'As ordinary income (plus a 10% penalty before 59½ unless an exception applies).'],
    ],
  },
  {
    id: 'backdoor-roth',
    title: 'Backdoor Roth IRA',
    domain: 'accounts',
    summary:
      'For incomes above the Roth limit: make a **nondeductible** Traditional IRA contribution, then **convert** it to Roth. Watch the **pro-rata rule** — existing pre-tax IRA balances make part of the conversion taxable.',
    sources: [bh('Backdoor Roth')],
    cards: [
      ['Two steps of a backdoor Roth?', '1) Nondeductible contribution to a Traditional IRA. 2) Convert it to a Roth IRA.'],
      ['What rule can make a backdoor Roth partly taxable?', 'The pro-rata rule — pre-tax money in any Traditional/SEP/SIMPLE IRA is counted.'],
    ],
  },
  {
    id: 'hsa',
    title: 'HSA (Health Savings Account)',
    domain: 'accounts',
    summary:
      'Available only with an **HSA-eligible high-deductible health plan**. Triple tax advantage: **deductible in, tax-free growth, tax-free out** for qualified medical costs. 2026 limits: **$4,400** self / **$8,750** family. Many Bogleheads invest it and pay medical bills from cash, keeping receipts to reimburse later.',
    sources: [bh('Health savings account')],
    cards: [
      ['What is the HSA "triple tax advantage"?', 'Tax-deductible contributions, tax-free growth, and tax-free withdrawals for qualified medical expenses.'],
      ['What health plan is required to contribute to an HSA?', 'An HSA-eligible high-deductible health plan (HDHP).'],
      ['What is the "stealth IRA" strategy?', 'Invest the HSA, pay medical costs out of pocket, save receipts, and reimburse yourself tax-free years later.'],
      ['2026 HSA limit (self-only coverage)?', '$4,400.'],
    ],
  },
  {
    id: 'taxable-brokerage',
    title: 'Taxable brokerage account',
    domain: 'accounts',
    summary:
      'A regular investment account with no contribution limits or withdrawal rules. You pay tax on dividends yearly and on realized gains when you sell. Used after tax-advantaged space is full, or for goals before retirement. Hold tax-efficient funds (total-market index) here.',
    sources: [bh('Taxable account')],
    cards: [
      ['Two main taxes in a taxable brokerage account?', 'Tax on dividends/interest each year, and capital gains tax when you sell at a profit.'],
      ['What kinds of funds are best in taxable accounts?', 'Tax-efficient ones — broad stock index funds/ETFs with low turnover (and muni bonds for high earners).'],
    ],
  },
  {
    id: '529-plan',
    title: '529 plan',
    domain: 'accounts',
    summary:
      'A tax-advantaged education savings account. Growth is tax-free when used for qualified education costs; many states give a state tax deduction. Up to a lifetime limit, leftover funds can roll into the beneficiary\'s Roth IRA (subject to rules).',
    sources: [bh('529 plan')],
    cards: [
      ['What is a 529 plan for?', 'Saving for education; growth is tax-free for qualified education expenses.'],
      ['Should you fund a child\'s 529 before your own retirement?', 'Generally no — there are loans for college but not for retirement. Secure your own retirement first.'],
    ],
  },
  {
    id: 'rollover',
    title: 'Rollover',
    domain: 'accounts',
    summary:
      'Moving money from an old employer plan to an IRA or new plan, ideally as a **direct (trustee-to-trustee) rollover** to avoid withholding. Cashing out instead triggers income tax plus a 10% penalty if under 59½.',
    sources: [bh('Rollover')],
    cards: [
      ['Why prefer a direct rollover over having a check mailed to you?', 'An indirect rollover withholds 20% and gives you 60 days to redeposit the full amount, or it becomes taxable.'],
      ['Cost of cashing out a 401(k) at age 30?', 'Ordinary income tax plus a 10% early-withdrawal penalty — and the lost future growth.'],
    ],
  },

  /* ───────────────────────── Tax ───────────────────────── */
  {
    id: 'marginal-tax-rate',
    title: 'Marginal tax rate',
    domain: 'tax',
    summary:
      'US income tax is **progressive**: each bracket\'s rate applies only to income *within* that bracket. Your marginal rate is the rate on your *next* dollar. A raise can never lower your take-home pay by pushing you into a higher bracket.',
    sources: [bh('Marginal tax rate')],
    cards: [
      ['Does moving into a higher tax bracket raise the tax on ALL your income?', 'No — only the dollars above the bracket threshold are taxed at the higher rate.'],
      ['What is your marginal tax rate?', 'The rate applied to your next dollar of income.'],
      ['Which rate matters for Traditional vs Roth decisions: marginal or effective?', 'Marginal — a deduction saves tax at your top (marginal) rate.'],
    ],
  },
  {
    id: 'effective-tax-rate',
    title: 'Effective tax rate',
    domain: 'tax',
    summary:
      'Total tax ÷ total income. Always lower than your marginal rate in a progressive system, because lower brackets are taxed less.',
    sources: [bh('Marginal tax rate')],
    cards: [
      ['Effective tax rate formula?', 'Total tax paid ÷ total income.'],
      ['Why is effective rate lower than marginal rate?', 'Earlier dollars are taxed at lower bracket rates (and the standard deduction is taxed at 0%).'],
    ],
  },
  {
    id: 'standard-deduction',
    title: 'Standard deduction',
    domain: 'tax',
    summary:
      'A flat amount of income not taxed at all. You take the standard deduction or itemize (mortgage interest, state taxes, charity) — whichever is larger. Most households take the standard deduction.',
    sources: [bh('Standard deduction')],
    cards: [
      ['Standard deduction vs itemizing — how do you choose?', 'Take whichever is larger.'],
      ['Does the standard deduction reduce tax or taxable income?', 'Taxable income (it\'s a deduction, not a credit).'],
    ],
  },
  {
    id: 'capital-gains-tax',
    title: 'Capital gains tax',
    domain: 'tax',
    summary:
      'Tax on profit when you sell an investment in a taxable account. Held **>1 year → long-term** rates (0%, 15%, 20%). Held ≤1 year → short-term, taxed like ordinary income. Holding longer is usually cheaper.',
    sources: [bh('Capital gains')],
    cards: [
      ['Holding period for long-term capital gains?', 'More than one year.'],
      ['Long-term capital gains rates?', '0%, 15% or 20% depending on income (plus 3.8% NIIT for high earners).'],
      ['How are short-term gains taxed?', 'As ordinary income, at your marginal rate.'],
    ],
  },
  {
    id: 'tax-loss-harvesting',
    title: 'Tax-loss harvesting',
    domain: 'tax',
    summary:
      'In a taxable account, selling an investment at a loss to realize a deductible loss, then buying a **similar but not "substantially identical"** fund to stay invested. Losses offset gains and up to $3,000/yr of ordinary income. Beware the **wash sale** rule (30 days before/after).',
    sources: [bh('Tax loss harvesting')],
    cards: [
      ['What is the wash sale rule?', 'A loss is disallowed if you buy a substantially identical security within 30 days before or after the sale (including in IRAs).'],
      ['How much net capital loss can offset ordinary income per year?', '$3,000; the rest carries forward.'],
    ],
  },

  /* ───────────────────────── Investing ───────────────────────── */
  {
    id: 'compound-interest',
    title: 'Compound interest',
    domain: 'investing',
    summary:
      'Earnings that themselves earn returns. Growth is exponential, so **time** is the most powerful ingredient. **Rule of 72:** years to double ≈ 72 ÷ annual return %.',
    sources: [bh('Compound interest')],
    cards: [
      ['Rule of 72: at 8% per year, money doubles in about ____ years', '9', 'cloze'],
      ['Why does starting early matter so much?', 'Growth compounds exponentially — the last decades add the most dollars, so extra years at the start are worth a lot.'],
      ['What is compounding?', 'Earning returns on previous returns, not just on the original amount.'],
    ],
  },
  {
    id: 'inflation',
    title: 'Inflation',
    domain: 'investing',
    summary:
      'The general rise in prices over time (US long-run average ~3%). It quietly shrinks the value of cash. **Real return = nominal return − inflation** (approx.).',
    sources: [bh('Inflation')],
    cards: [
      ['Approximate real return formula?', 'Real return ≈ nominal return − inflation.'],
      ['At 3% inflation, roughly how long until prices double?', '~24 years (rule of 72: 72 ÷ 3).'],
    ],
  },
  {
    id: 'stocks',
    title: 'Stocks',
    domain: 'investing',
    summary:
      'Shares of ownership in companies. Highest long-run expected returns among common asset classes, with high volatility — drops of 30–50% happen. Suited to money you won\'t need for 5+ years.',
    sources: [bh('Stocks')],
    cards: [
      ['What is a share of stock?', 'Partial ownership of a company, giving a claim on its future profits.'],
      ['Stocks: main reward and main risk?', 'Reward: highest long-run expected return. Risk: large, sometimes prolonged declines (volatility).'],
    ],
  },
  {
    id: 'bonds',
    title: 'Bonds',
    domain: 'investing',
    summary:
      'Loans to governments or companies that pay interest. Lower expected return than stocks but steadier; they **dampen portfolio swings**. When interest rates rise, existing bond prices fall — more so for longer **duration**.',
    sources: [bh('Bonds')],
    cards: [
      ['What happens to existing bond prices when interest rates rise?', 'They fall.'],
      ['What does bond duration measure?', 'Sensitivity to interest-rate changes: price drops ~duration% for each 1% rise in rates.'],
      ['Main job of bonds in a Boglehead portfolio?', 'Reduce volatility and provide stability (and money to rebalance into stocks after crashes).'],
    ],
  },
  {
    id: 'risk-and-return',
    title: 'Risk and return',
    domain: 'investing',
    summary:
      'Higher expected returns come with higher risk; there is no free lunch. Any product promising high returns with low risk is a red flag.',
    sources: [bh('Risk and return')],
    cards: [
      ['Core relationship between risk and expected return?', 'To seek higher expected returns you must accept more risk.'],
      ['Red flag in any investment pitch?', 'Promised high returns with little or no risk.'],
    ],
  },
  {
    id: 'diversification',
    title: 'Diversification',
    domain: 'investing',
    summary:
      'Spreading money across many investments so no single failure sinks you. It lowers risk without lowering expected return — "the only free lunch in investing". A total-market index fund owns thousands of companies.',
    sources: [bh('Diversification')],
    cards: [
      ['Why is diversification called "the only free lunch"?', 'It reduces risk (from single companies) without reducing expected return.'],
      ['What risk can diversification NOT remove?', 'Market (systematic) risk — the whole market can still fall.'],
    ],
  },
  {
    id: 'index-fund',
    title: 'Index fund',
    domain: 'investing',
    summary:
      'A fund that simply holds every stock (or bond) in an index, like the S&P 500 or the total US market. Very low cost, broad diversification, low turnover. The core building block of the Bogleheads approach.',
    sources: [bh('Index fund')],
    cards: [
      ['What does an index fund do?', 'Holds all the securities in a market index to match its return, instead of picking winners.'],
      ['Three advantages of index funds?', 'Low costs, broad diversification, tax efficiency (low turnover).'],
    ],
  },
  {
    id: 'expense-ratio',
    title: 'Expense ratio',
    domain: 'investing',
    summary:
      'The annual fee a fund charges, as a % of assets. Broad index funds cost ~0.03–0.10%; many active funds charge ~0.5–1%+. Because fees compound, **costs matter** — a 1% fee can consume roughly a quarter of your ending wealth over decades.',
    sources: [bh('Expense ratio')],
    cards: [
      ['What is an expense ratio?', 'The annual fund fee as a percentage of your invested assets.'],
      ['$100k at 0.04% vs 1% expense ratio: annual cost?', '$40 vs $1,000.'],
      ['Why does a 1% fee matter so much over 30 years?', 'It compounds — you lose the fee AND all the growth it would have earned.'],
    ],
  },
  {
    id: 'etf-vs-mutual-fund',
    title: 'ETF vs mutual fund',
    domain: 'investing',
    summary:
      'Both pool many investments. **ETFs** trade like stocks during the day and are usually a bit more tax-efficient. **Mutual funds** trade once a day at NAV and allow automatic dollar-based investing. Same underlying index = nearly identical results.',
    sources: [bh('Exchange-traded fund')],
    cards: [
      ['Key trading difference: ETF vs mutual fund?', 'ETFs trade intraday on an exchange; mutual funds trade once daily at net asset value (NAV).'],
      ['Does ETF vs mutual fund matter much for a long-term index investor?', 'Not much — cost and underlying index matter far more.'],
    ],
  },
  {
    id: 'total-stock-market',
    title: 'Total stock market fund',
    domain: 'investing',
    summary:
      'A fund holding essentially every US stock — large, mid and small — weighted by market value. One fund, ~3,500+ companies. Examples track the CRSP US Total Market Index.',
    sources: [bh('Total stock market index fund')],
    cards: [
      ['Total stock market fund vs S&P 500 fund?', 'Total market adds mid- and small-cap stocks (~3,500+ vs 500 large caps); returns are very similar since large caps dominate.'],
    ],
  },
  {
    id: 'international-stocks',
    title: 'International stocks',
    domain: 'investing',
    summary:
      'Stocks of non-US companies (developed and emerging markets). The US is ~60% of world market value. Bogleheads commonly hold **20–40% of stocks** internationally for diversification.',
    sources: [bh('Domestic/International')],
    cards: [
      ['Why hold international stocks?', 'Diversification — different countries lead in different decades; the US is only ~60% of the global market.'],
      ['Common Boglehead range for international allocation?', '20–40% of the stock portion (market weight ≈ 40%).'],
    ],
  },
  {
    id: 'active-vs-passive',
    title: 'Active vs passive investing',
    domain: 'investing',
    summary:
      'Active managers try to beat the market; passive (index) investors accept the market return. After costs, **most active funds underperform** their index over long periods, and past winners rarely persist.',
    sources: [bh('Active management')],
    cards: [
      ['Why does the average active fund underperform the index?', 'Before costs, active investors as a group earn the market return; after higher fees and trading costs, they must trail it.'],
    ],
  },
  {
    id: 'market-timing',
    title: 'Market timing',
    domain: 'investing',
    summary:
      'Trying to jump in and out of the market to avoid drops. Almost nobody does it reliably — and missing just a few of the best days (which cluster near the worst) drastically cuts returns. "**Time in the market beats timing the market.**"',
    sources: [bh('Market timing')],
    cards: [
      ['Why is market timing so hard?', 'You must be right twice (when to sell AND when to buy back), and the best days often come right after the worst.'],
    ],
  },
  {
    id: 'dollar-cost-averaging',
    title: 'Dollar-cost averaging vs lump sum',
    domain: 'investing',
    summary:
      '**DCA:** invest a fixed amount on a schedule (what happens naturally with each paycheck). With a windfall, **lump-sum** investing wins about two-thirds of the time because markets usually rise, but DCA can reduce regret.',
    sources: [bh('Dollar cost averaging')],
    cards: [
      ['With a windfall, which usually wins: lump sum or DCA?', 'Lump sum, about 2/3 of the time, since markets tend to rise.'],
      ['Why might someone still DCA a windfall?', 'To reduce regret/anxiety if the market drops right after investing.'],
    ],
  },
  {
    id: 'volatility',
    title: 'Volatility & drawdowns',
    domain: 'investing',
    summary:
      'Volatility is how much prices swing. A **drawdown** is a peak-to-trough drop (US stocks fell ~50% in 2008–09 and ~34% in early 2020). Volatility only becomes a permanent loss if you sell during the drop.',
    sources: [bh('Risk tolerance')],
    cards: [
      ['What is a drawdown?', 'The decline from a portfolio\'s peak to its lowest point before recovering.'],
      ['When does volatility become a permanent loss?', 'When you sell during the decline instead of holding through recovery.'],
    ],
  },

  /* ───────────────────────── Bogleheads ───────────────────────── */
  {
    id: 'bogleheads-philosophy',
    title: 'Bogleheads philosophy',
    domain: 'bogleheads',
    summary:
      'Inspired by Vanguard founder **John C. Bogle**. Core ideas: develop a workable plan · invest early and often · never bear too much or too little risk · diversify · never try to time the market · use index funds when possible · keep costs low · minimize taxes · invest with simplicity · stay the course.',
    sources: [bh('Bogleheads investment philosophy')],
    cards: [
      ['Who inspired the Bogleheads philosophy?', 'John C. Bogle, founder of Vanguard and creator of the first retail index fund.'],
      ['Name four Bogleheads principles.', 'E.g. invest early and often, diversify, keep costs low, use index funds, minimize taxes, don\'t time the market, stay the course.'],
      ['Why keep costs low?', 'Every dollar of cost comes straight out of your return; costs are one of the few things you control.'],
    ],
  },
  {
    id: 'three-fund-portfolio',
    title: 'Three-fund portfolio',
    domain: 'bogleheads',
    summary:
      'The classic Boglehead portfolio: a **US total stock market** fund + an **international total stock** fund + a **US total bond market** fund. Maximum diversification, rock-bottom cost, easy rebalancing. You just choose the percentages.',
    sources: [bh('Three-fund portfolio')],
    cards: [
      ['What are the three funds in the three-fund portfolio?', 'US total stock market, international total stock market, US total bond market.'],
      ['Main advantages of a three-fund portfolio?', 'Broad diversification, very low cost, simplicity, tax efficiency, easy rebalancing.'],
    ],
  },
  {
    id: 'asset-allocation',
    title: 'Asset allocation',
    domain: 'bogleheads',
    summary:
      'Your split between stocks, bonds and cash — the single biggest decision in a portfolio, since it drives most of your risk and return. Choose it from your **need, ability and willingness** to take risk, then stick with it.',
    sources: [bh('Asset allocation')],
    cards: [
      ['What is asset allocation?', 'The mix of asset classes (stocks, bonds, cash) in your portfolio.'],
      ['Three dimensions of risk to consider when setting allocation?', 'Need to take risk, ability to take risk, and willingness to take risk.'],
    ],
  },
  {
    id: 'age-in-bonds',
    title: '"Age in bonds" rule of thumb',
    domain: 'bogleheads',
    summary:
      'A starting heuristic: bond % ≈ your age (e.g. 30 → 30% bonds). Variants like "age − 10" or "age − 20" are more aggressive. A rough guide, not a rule.',
    sources: [bh('Asset allocation')],
    cards: [
      ['"Age in bonds" for a 40-year-old = ____ bonds', '40% bonds / 60% stocks.', 'cloze'],
      ['What does "age minus 20 in bonds" mean for a 30-year-old?', '10% bonds, 90% stocks — a more aggressive variant.'],
    ],
  },
  {
    id: 'rebalancing',
    title: 'Rebalancing',
    domain: 'bogleheads',
    summary:
      'Moving back to your target allocation after markets drift it — e.g. when stocks surge, sell some stocks/buy bonds. Controls risk and enforces "buy low, sell high". Common methods: once a year, or when off by **5 percentage points** (bands). Rebalance with new contributions or inside tax-advantaged accounts to avoid taxes.',
    sources: [bh('Rebalancing')],
    cards: [
      ['Why rebalance?', 'To keep risk at your chosen level; it also mechanically sells high and buys low.'],
      ['Two common rebalancing triggers?', 'Time (e.g. once a year) or thresholds/bands (e.g. an asset is 5 points off target).'],
      ['Tax-friendly ways to rebalance?', 'Direct new contributions to the underweight asset, or trade inside tax-advantaged accounts.'],
    ],
  },
  {
    id: 'target-date-fund',
    title: 'Target-date fund',
    domain: 'bogleheads',
    summary:
      'A single fund-of-funds (often a three/four-fund portfolio inside) that picks an allocation for your retirement year and **automatically gets more conservative** over time (the "glide path"). A great one-fund choice in tax-advantaged accounts.',
    sources: [bh('Target date funds')],
    cards: [
      ['What is a target-date fund\'s "glide path"?', 'Its planned shift from mostly stocks to more bonds as the target year approaches.'],
      ['Why are target-date funds less ideal in a taxable account?', 'They hold bonds (tax-inefficient) and can\'t be tax-loss harvested by component.'],
    ],
  },
  {
    id: 'asset-location',
    title: 'Tax-efficient fund placement',
    domain: 'bogleheads',
    summary:
      'Also called **asset location**: put tax-*inefficient* assets (bonds, REITs) in tax-advantaged accounts and tax-*efficient* ones (total-market stock index funds) in taxable. Same allocation, lower taxes.',
    sources: [bh('Tax-efficient fund placement')],
    cards: [
      ['Asset allocation vs asset location?', 'Allocation = what mix you hold. Location = which account each holding lives in.'],
      ['Where should bond funds usually go?', 'Tax-advantaged accounts (401k/IRA), since their interest is taxed as ordinary income.'],
      ['Which holding is most tax-efficient in a taxable account?', 'A broad stock index fund/ETF (qualified dividends, low turnover).'],
    ],
  },
  {
    id: 'stay-the-course',
    title: 'Stay the course',
    domain: 'bogleheads',
    summary:
      'Bogle\'s most famous advice: pick a sensible plan and **stick to it**, especially during crashes. Investor behavior (panic selling, chasing performance) costs more than almost anything else.',
    sources: [bh('Staying the course')],
    cards: [
      ['What does "stay the course" mean?', 'Stick to your plan and allocation through market turmoil; don\'t panic-sell or chase hot investments.'],
      ['What behavior gap does "stay the course" guard against?', 'Investors earning less than their funds because they buy high (after gains) and sell low (after drops).'],
    ],
  },
  {
    id: 'risk-tolerance',
    title: 'Risk tolerance',
    domain: 'bogleheads',
    summary:
      'How much decline you can live through without abandoning your plan. Test it honestly: *if my portfolio fell 50%, would I sell?* If yes, hold more bonds — an allocation you can stick with beats a "better" one you abandon.',
    sources: [bh('Risk tolerance')],
    cards: [
      ['Simple risk-tolerance gut check?', 'Imagine your stock holdings dropping 50%. If you would sell, your allocation is too aggressive.'],
    ],
  },

  /* ───────────────────────── Retirement ───────────────────────── */
  {
    id: 'four-percent-rule',
    title: '4% rule / safe withdrawal rate',
    domain: 'retirement',
    summary:
      'From the Trinity study / Bengen: withdrawing **4% of the starting portfolio**, then adjusting for inflation each year, historically survived 30 years in nearly all US periods. Flip it: you need about **25× annual expenses** invested.',
    sources: [bh('Safe withdrawal rates')],
    cards: [
      ['The 4% rule implies you need how many times your annual expenses?', '25× (1 ÷ 0.04).'],
      ['$60k/year spending → FI target under the 4% rule = ____', '$1.5 million.', 'cloze'],
      ['What time horizon was the 4% rule designed for?', 'About 30 years; longer (early) retirements often use 3–3.5%.'],
    ],
  },
  {
    id: 'fire',
    title: 'FIRE',
    domain: 'retirement',
    summary:
      '**Financial Independence, Retire Early.** The key driver is savings rate: at a 50% savings rate, the math gets you to FI in roughly 17 years from zero; at 10%, ~50 years.',
    sources: [bh('Financial independence')],
    cards: [
      ['What does FIRE stand for?', 'Financial Independence, Retire Early.'],
      ['Most important variable for years-to-FI?', 'Savings rate.'],
    ],
  },
  {
    id: 'sequence-risk',
    title: 'Sequence-of-returns risk',
    domain: 'retirement',
    summary:
      'Bad returns **early in retirement**, while you are withdrawing, can permanently damage a portfolio even if the long-run average is fine. Bonds, cash buffers and flexible spending help.',
    sources: [bh('Sequence of returns risk')],
    cards: [
      ['What is sequence-of-returns risk?', 'The danger that poor returns early in retirement, combined with withdrawals, deplete the portfolio even if average returns are fine.'],
    ],
  },
  {
    id: 'rmd',
    title: 'Required minimum distributions',
    domain: 'retirement',
    summary:
      'Starting at age **73** (75 for those born 1960 or later), you must withdraw a minimum yearly amount from pre-tax retirement accounts. Roth IRAs have no RMDs for the original owner.',
    sources: [bh('Required minimum distribution')],
    cards: [
      ['Do Roth IRAs have RMDs for the original owner?', 'No.'],
      ['Current RMD starting age?', '73 (rising to 75 for people born in 1960 or later).'],
    ],
  },
  {
    id: 'social-security',
    title: 'Social Security',
    domain: 'retirement',
    summary:
      'A US government income stream based on your top 35 earning years. You can claim from 62 (reduced) to 70 (increased ~8%/year after full retirement age). Delaying is effectively buying an inflation-adjusted annuity.',
    sources: [bh('Social Security')],
    cards: [
      ['How many earning years are used to calculate Social Security?', 'Your highest 35 (inflation-indexed).'],
      ['Benefit gain for delaying past full retirement age?', 'About 8% per year until age 70.'],
    ],
  },

  /* ───────────────────────── Insurance ───────────────────────── */
  {
    id: 'term-life',
    title: 'Term life insurance',
    domain: 'insurance',
    summary:
      'Pure insurance for a fixed period (e.g. 20–30 years). Cheap. Needed if someone depends on your income. Common sizing: **10–12× income** or enough to cover the dependents\' needs.',
    sources: [bh('Life insurance')],
    cards: [
      ['Who needs life insurance?', 'Someone whose death would financially hurt dependents (spouse, kids) who rely on their income.'],
      ['Common term life coverage rule of thumb?', '~10–12× annual income, sized to dependents\' needs.'],
    ],
  },
  {
    id: 'whole-life',
    title: 'Whole life insurance',
    domain: 'insurance',
    summary:
      'Permanent insurance with a "cash value" savings component. Premiums are many times higher than term. The consensus on r/personalfinance and Bogleheads: for most people, **"buy term and invest the difference."**',
    sources: [bh('Whole life insurance')],
    cards: [
      ['"Buy term and invest the difference" — what does it mean?', 'Buy cheap term life insurance and invest the premium savings vs whole life, usually ending up ahead.'],
      ['Why is whole life usually a poor investment?', 'High fees/commissions and low returns on the cash value versus cheap term + index funds.'],
    ],
  },
  {
    id: 'disability-insurance',
    title: 'Disability insurance',
    domain: 'insurance',
    summary:
      'Replaces part of your income if illness or injury stops you from working. For young workers, your **future earnings are your biggest asset** — long-term disability coverage protects it. Check your employer plan first.',
    sources: [bh('Disability insurance')],
    cards: [
      ['Why is disability insurance important for young workers?', 'Their future earning power is their biggest asset, and disability is more likely than early death.'],
      ['Short-term vs long-term disability insurance?', 'Short-term covers weeks–months; long-term covers years to retirement — long-term is the critical one.'],
    ],
  },
  {
    id: 'hdhp',
    title: 'High-deductible health plan',
    domain: 'insurance',
    summary:
      'A health plan with a higher deductible and usually lower premiums. An **HSA-eligible HDHP** unlocks HSA contributions. Good fit if you are fairly healthy and have cash to cover the deductible.',
    sources: [bh('High deductible health plan')],
    cards: [
      ['What is a deductible?', 'The amount you pay for covered care before insurance starts paying.'],
      ['Main financial perk of an HSA-eligible HDHP?', 'It lets you contribute to an HSA (triple tax advantage), plus usually lower premiums.'],
    ],
  },
]

export type SeedEdge = [from: string, to: string, type: 'prereq' | 'partOf' | 'related' | 'contrasts' | 'example']

export const SEED_EDGES: SeedEdge[] = [
  // Budgeting
  ['budget', 'rule-50-30-20', 'example'],
  ['budget', 'zero-based-budget', 'example'],
  ['budget', 'pay-yourself-first', 'related'],
  ['budget', 'sinking-fund', 'related'],
  ['budget', 'savings-rate', 'prereq'],
  ['savings-rate', 'lifestyle-inflation', 'related'],
  ['budget', 'emergency-fund', 'prereq'],
  ['net-worth', 'savings-rate', 'related'],
  ['sinking-fund', 'emergency-fund', 'contrasts'],
  // Emergency
  ['emergency-fund', 'hysa', 'related'],
  ['emergency-fund', 'money-market-fund', 'related'],
  ['hysa', 'money-market-fund', 'contrasts'],
  // Debt & credit
  ['apr', 'high-interest-debt', 'prereq'],
  ['high-interest-debt', 'debt-avalanche', 'related'],
  ['high-interest-debt', 'debt-snowball', 'related'],
  ['debt-avalanche', 'debt-snowball', 'contrasts'],
  ['apr', 'minimum-payment-trap', 'prereq'],
  ['amortization', 'mortgage', 'prereq'],
  ['student-loans', 'high-interest-debt', 'related'],
  ['credit-utilization', 'credit-score', 'partOf'],
  ['credit-report', 'credit-score', 'related'],
  ['minimum-payment-trap', 'credit-utilization', 'related'],
  ['credit-score', 'mortgage', 'related'],
  // Priority order
  ['budget', 'prime-directive', 'partOf'],
  ['emergency-fund', 'prime-directive', 'partOf'],
  ['employer-match', 'prime-directive', 'partOf'],
  ['high-interest-debt', 'prime-directive', 'partOf'],
  ['roth-ira', 'prime-directive', 'partOf'],
  ['hsa', 'prime-directive', 'partOf'],
  ['401k', 'prime-directive', 'partOf'],
  ['taxable-brokerage', 'prime-directive', 'partOf'],
  // Accounts
  ['401k', 'employer-match', 'related'],
  ['employer-match', 'vesting', 'related'],
  ['marginal-tax-rate', 'traditional-vs-roth', 'prereq'],
  ['traditional-vs-roth', 'roth-ira', 'related'],
  ['traditional-vs-roth', 'traditional-ira', 'related'],
  ['roth-ira', 'traditional-ira', 'contrasts'],
  ['roth-ira', 'backdoor-roth', 'related'],
  ['traditional-ira', 'backdoor-roth', 'prereq'],
  ['401k', 'rollover', 'related'],
  ['rollover', 'traditional-ira', 'related'],
  ['hdhp', 'hsa', 'prereq'],
  ['taxable-brokerage', 'capital-gains-tax', 'related'],
  ['529-plan', 'roth-ira', 'related'],
  ['401k', 'rmd', 'related'],
  // Tax
  ['marginal-tax-rate', 'effective-tax-rate', 'contrasts'],
  ['standard-deduction', 'effective-tax-rate', 'related'],
  ['capital-gains-tax', 'tax-loss-harvesting', 'related'],
  ['taxable-brokerage', 'tax-loss-harvesting', 'related'],
  // Investing
  ['compound-interest', 'stocks', 'related'],
  ['inflation', 'compound-interest', 'related'],
  ['risk-and-return', 'stocks', 'related'],
  ['risk-and-return', 'bonds', 'related'],
  ['stocks', 'bonds', 'contrasts'],
  ['diversification', 'index-fund', 'prereq'],
  ['index-fund', 'expense-ratio', 'related'],
  ['index-fund', 'etf-vs-mutual-fund', 'related'],
  ['index-fund', 'total-stock-market', 'example'],
  ['active-vs-passive', 'index-fund', 'related'],
  ['market-timing', 'dollar-cost-averaging', 'related'],
  ['volatility', 'risk-tolerance', 'related'],
  ['expense-ratio', 'compound-interest', 'related'],
  ['stocks', 'volatility', 'related'],
  ['international-stocks', 'diversification', 'example'],
  // Bogleheads
  ['index-fund', 'bogleheads-philosophy', 'partOf'],
  ['expense-ratio', 'bogleheads-philosophy', 'partOf'],
  ['stay-the-course', 'bogleheads-philosophy', 'partOf'],
  ['market-timing', 'stay-the-course', 'contrasts'],
  ['total-stock-market', 'three-fund-portfolio', 'partOf'],
  ['international-stocks', 'three-fund-portfolio', 'partOf'],
  ['bonds', 'three-fund-portfolio', 'partOf'],
  ['asset-allocation', 'three-fund-portfolio', 'related'],
  ['risk-tolerance', 'asset-allocation', 'prereq'],
  ['age-in-bonds', 'asset-allocation', 'example'],
  ['asset-allocation', 'rebalancing', 'related'],
  ['three-fund-portfolio', 'target-date-fund', 'contrasts'],
  ['asset-allocation', 'asset-location', 'contrasts'],
  ['asset-location', 'taxable-brokerage', 'related'],
  ['bogleheads-philosophy', 'three-fund-portfolio', 'example'],
  // Retirement
  ['four-percent-rule', 'fire', 'related'],
  ['savings-rate', 'fire', 'prereq'],
  ['sequence-risk', 'four-percent-rule', 'related'],
  ['bonds', 'sequence-risk', 'related'],
  ['social-security', 'four-percent-rule', 'related'],
  ['roth-ira', 'rmd', 'related'],
  // Insurance
  ['term-life', 'whole-life', 'contrasts'],
  ['disability-insurance', 'emergency-fund', 'related'],
  ['hdhp', 'emergency-fund', 'related'],
]
