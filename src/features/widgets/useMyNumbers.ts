import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { monthlyAverages } from '../../lib/budget'
import { dayKey } from '../../lib/dates'

/** Monthly averages from the money tracker, in dollars, for "Use my numbers". */
export function useMyNumbers() {
  const txns = useLiveQuery(() => db.transactions.toArray(), [])
  const avg = txns ? monthlyAverages(txns, dayKey()) : null
  if (!avg || avg.incomeCents <= 0) return null
  const income = avg.incomeCents / 100
  const need = avg.bucketCents.need / 100
  const want = avg.bucketCents.want / 100
  const saved = Math.max(0, income - need - want)
  return {
    monthlyIncome: income,
    needShare: need / income,
    wantShare: want / income,
    monthlySaved: saved,
    savingsRate: saved / income,
    basis: avg.partial ? 'this month so far' : `your last ${avg.monthsUsed} month${avg.monthsUsed > 1 ? 's' : ''}`,
  }
}
