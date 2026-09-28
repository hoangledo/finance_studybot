import { Loader2, Repeat, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { addTransaction, deleteTransaction, updateTransaction } from '../../db/moneyActions'
import { dayKey } from '../../lib/dates'
import { BUCKET_LABEL, BUCKETS, CADENCE_LABEL, parseAmount } from '../../lib/budget'
import { Modal } from '../../components/ui'
import type { Bucket, Cadence, Category, Transaction, TxnKind } from '../../types'
import { toast } from '../gamify/fx'
import { play } from '../gamify/sounds'

export const BUCKET_STYLE: Record<Bucket, { chip: string; dot: string }> = {
  need: { chip: 'border-sky bg-sky-soft text-sky-ink', dot: 'var(--sky)' },
  want: { chip: 'border-coral bg-coral-soft text-coral-ink', dot: 'var(--coral)' },
  savings: { chip: 'border-brand bg-brand-soft text-brand-ink', dot: 'var(--brand)' },
}

export function TransactionSheet({
  open,
  onClose,
  categories,
  editing,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  editing?: Transaction | null
}) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit entry' : 'Add money entry'}>
      {open && <Form key={editing?.id ?? 'new'} onDone={onClose} categories={categories} editing={editing ?? undefined} />}
    </Modal>
  )
}

function Form({ onDone, categories, editing }: { onDone: () => void; categories: Category[]; editing?: Transaction }) {
  const [kind, setKind] = useState<TxnKind>(editing?.kind ?? 'expense')
  const [amount, setAmount] = useState(editing ? (editing.amountCents / 100).toFixed(2).replace(/\.00$/, '') : '')
  const visible = useMemo(() => categories.filter((c) => c.kind === kind && (!c.archived || c.id === editing?.categoryId)), [categories, kind, editing])
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '')
  const [bucket, setBucket] = useState<Bucket>(editing?.bucket ?? 'need')
  const [bucketTouched, setBucketTouched] = useState(!!editing)
  const [date, setDate] = useState(editing?.date ?? dayKey())
  const [note, setNote] = useState(editing?.note ?? '')
  const [repeat, setRepeat] = useState<Cadence | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep a valid category selected for the current kind.
  useEffect(() => {
    if (!visible.some((c) => c.id === categoryId)) setCategoryId(visible[0]?.id ?? '')
  }, [visible, categoryId])

  // A category's default bucket applies until the user overrides it.
  useEffect(() => {
    const c = categories.find((x) => x.id === categoryId)
    if (c?.bucket && !bucketTouched) setBucket(c.bucket)
  }, [categoryId, categories, bucketTouched])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cents = parseAmount(amount)
    if (!cents) return setError('Enter an amount greater than $0 (up to 2 decimals).')
    if (!categoryId) return setError('Pick a category.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Pick a valid date.')
    setBusy(true)
    try {
      const input = { amountCents: cents, kind, categoryId, bucket: kind === 'expense' ? bucket : undefined, date, note }
      if (editing) await updateTransaction(editing.id, input)
      else {
        await addTransaction(input, repeat || undefined)
        play('correct')
        toast({ kind: 'goal', title: kind === 'income' ? '💰 Income logged!' : '🧾 Expense logged!', body: repeat ? `Repeats ${CADENCE_LABEL[repeat].toLowerCase()}` : undefined })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
        {(['expense', 'income'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={clsx(
              'rounded-xl py-2 text-sm font-extrabold capitalize transition',
              kind === k ? (k === 'income' ? 'bg-brand text-on-color' : 'bg-coral text-white') : 'text-muted',
            )}
          >
            {k === 'income' ? '+ Income' : '− Expense'}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="label">Amount</span>
        <div className="relative">
          <span className="absolute top-1/2 left-4 -translate-y-1/2 font-display text-2xl font-bold text-muted">$</span>
          <input
            className="input py-3 pl-9 font-display text-3xl font-bold"
            inputMode="decimal"
            autoFocus
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount in dollars"
          />
        </div>
      </label>

      <div>
        <span className="label">Category</span>
        <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(c.id)
                setBucketTouched(false)
              }}
              className={clsx(
                'rounded-full border-2 px-3 py-1.5 text-sm font-bold transition',
                categoryId === c.id ? 'border-sky bg-sky-soft text-sky-ink' : 'border-line hover:bg-surface-2',
              )}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {kind === 'expense' && (
        <div>
          <span className="label">Counts as</span>
          <div className="grid grid-cols-3 gap-2">
            {BUCKETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBucket(b)
                  setBucketTouched(true)
                }}
                className={clsx('rounded-xl border-2 py-2 text-sm font-extrabold transition', bucket === b ? BUCKET_STYLE[b].chip : 'border-line text-muted')}
              >
                {BUCKET_LABEL[b]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Date</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} max="2100-12-31" />
        </label>
        {!editing ? (
          <label className="block">
            <span className="label">Repeats</span>
            <select className="input" value={repeat} onChange={(e) => setRepeat(e.target.value as Cadence | '')}>
              <option value="">Never</option>
              {(Object.keys(CADENCE_LABEL) as Cadence[]).map((c) => (
                <option key={c} value={c}>
                  {CADENCE_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          editing.recurringId && (
            <div className="flex items-end pb-2.5 text-xs font-bold text-muted">
              <Repeat size={14} className="mr-1" /> Part of a recurring series
            </div>
          )
        )}
      </div>

      <label className="block">
        <span className="label">Note (optional)</span>
        <input className="input" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Trader Joe's" />
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {editing && (
          <button
            type="button"
            className="btn-ghost text-danger-ink"
            onClick={async () => {
              await deleteTransaction(editing.id)
              onDone()
            }}
            aria-label="Delete entry"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button className={clsx('flex-1 py-3.5', kind === 'income' ? 'btn-primary' : 'btn-coral')} disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {editing ? 'Save changes' : kind === 'income' ? 'Add income' : 'Add expense'}
        </button>
      </div>
    </form>
  )
}
