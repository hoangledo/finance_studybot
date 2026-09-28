import { Archive, ArchiveRestore, Pause, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { archiveCategory, deleteRecurring, saveCategory, setCategoryLimit, setMoneySettings, updateRecurring } from '../../db/moneyActions'
import { dayKey, parseDay } from '../../lib/dates'
import { BUCKET_LABEL, BUCKETS, CADENCE_LABEL, money, occurrences, parseAmount } from '../../lib/budget'
import { Modal } from '../../components/ui'
import type { Bucket, Category, MoneySettings, Recurring, TxnKind } from '../../types'
import { BUCKET_STYLE } from './TransactionSheet'

type Tab = 'targets' | 'categories' | 'recurring'

export function MoneySettingsSheet({
  open,
  onClose,
  settings,
  categories,
  recurring,
  catById,
}: {
  open: boolean
  onClose: () => void
  settings: MoneySettings
  categories: Category[]
  recurring: Recurring[]
  catById: Map<string, Category>
}) {
  const [tab, setTab] = useState<Tab>('targets')
  return (
    <Modal open={open} onClose={onClose} title="Money settings" wide>
      <div className="mb-4 inline-flex rounded-2xl bg-surface-2 p-1">
        {(['targets', 'categories', 'recurring'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx('rounded-xl px-4 py-1.5 text-sm font-extrabold capitalize', tab === t ? 'bg-surface shadow-sm' : 'text-muted')}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'targets' && <Targets settings={settings} />}
      {tab === 'categories' && <Categories categories={categories} />}
      {tab === 'recurring' && <RecurringList recurring={recurring} catById={catById} />}
    </Modal>
  )
}

function Targets({ settings }: { settings: MoneySettings }) {
  const t = settings.targets
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        How you want to split take-home income. The classic <strong>50/30/20</strong> rule is a starting point; adjust it to your life. The three always add up to
        100%.
      </p>
      {BUCKETS.map((b) => (
        <label key={b} className="block">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="flex items-center gap-2 text-sm font-extrabold">
              <span className="h-3 w-3 rounded-full" style={{ background: BUCKET_STYLE[b].dot }} />
              {BUCKET_LABEL[b]}
            </span>
            <span className="font-display text-xl font-bold tabular-nums">{t[b]}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={t[b]}
            onChange={(e) => setMoneySettings({ targets: { ...t, [b]: Number(e.target.value) } }, b)}
            className="w-full"
            aria-label={`${BUCKET_LABEL[b]} target percent`}
          />
        </label>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line pt-4">
        <button className="btn-ghost" onClick={() => setMoneySettings({ targets: { need: 50, want: 30, savings: 20 } })}>
          Reset to 50/30/20
        </button>
        <label className="flex items-center gap-2 text-sm font-bold">
          Weeks start on
          <select className="input w-auto py-1.5" value={settings.weekStart} onChange={(e) => setMoneySettings({ weekStart: Number(e.target.value) as 0 | 1 })}>
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </select>
        </label>
      </div>
    </div>
  )
}

function Categories({ categories }: { categories: Category[] }) {
  const [showArchived, setShowArchived] = useState(false)
  const [draft, setDraft] = useState<{ emoji: string; name: string; kind: TxnKind; bucket: Bucket }>({ emoji: '🏷️', name: '', kind: 'expense', bucket: 'want' })
  const list = categories.filter((c) => showArchived || !c.archived)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Set a monthly limit to get a warning as you approach it. Limits scale automatically for weekly and yearly views.</p>
      <div className="space-y-2">
        {list.map((c) => (
          <CategoryRow key={c.id} c={c} />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[var(--brand)]" />
        Show archived
      </label>

      <form
        className="rounded-2xl border-2 border-dashed border-line p-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!draft.name.trim()) return
          await saveCategory({ ...draft, name: draft.name.trim() })
          setDraft({ ...draft, name: '' })
        }}
      >
        <div className="label">New category</div>
        <div className="flex flex-wrap gap-2">
          <input className="input w-14 text-center" value={draft.emoji} maxLength={4} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} aria-label="Emoji" />
          <input className="input min-w-0 flex-1" placeholder="Name" maxLength={30} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className="input w-auto" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as TxnKind })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          {draft.kind === 'expense' && (
            <select className="input w-auto" value={draft.bucket} onChange={(e) => setDraft({ ...draft, bucket: e.target.value as Bucket })}>
              {BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {BUCKET_LABEL[b]}
                </option>
              ))}
            </select>
          )}
          <button className="btn-primary px-4" aria-label="Add category">
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </form>
    </div>
  )
}

function CategoryRow({ c }: { c: Category }) {
  const [limit, setLimit] = useState(c.monthlyLimitCents ? String(c.monthlyLimitCents / 100) : '')
  const commitLimit = () => {
    const cents = limit.trim() === '' ? undefined : parseAmount(limit) ?? undefined
    setCategoryLimit(c.id, cents)
    setLimit(cents ? String(cents / 100) : '')
  }
  return (
    <div className={clsx('flex flex-wrap items-center gap-2 rounded-2xl border-2 border-line p-2.5', c.archived && 'opacity-50')}>
      <span className="text-xl">{c.emoji}</span>
      <span className="min-w-0 flex-1 truncate font-bold">{c.name}</span>
      {c.kind === 'expense' ? (
        <>
          <select
            className="input w-auto py-1.5 text-xs"
            value={c.bucket ?? 'want'}
            onChange={(e) => saveCategory({ ...c, bucket: e.target.value as Bucket })}
            aria-label={`${c.name} bucket`}
          >
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {BUCKET_LABEL[b]}
              </option>
            ))}
          </select>
          <div className="relative">
            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs font-bold text-muted">$</span>
            <input
              className="input w-28 py-1.5 pl-6 text-xs"
              inputMode="decimal"
              placeholder="No limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              onBlur={commitLimit}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              aria-label={`${c.name} monthly limit`}
            />
          </div>
        </>
      ) : (
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-extrabold text-brand-ink">Income</span>
      )}
      <button
        className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
        onClick={() => archiveCategory(c.id, !c.archived)}
        aria-label={c.archived ? `Restore ${c.name}` : `Archive ${c.name}`}
        title={c.archived ? 'Restore' : 'Archive (hides it from new entries; past entries keep it)'}
      >
        {c.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      </button>
    </div>
  )
}

function RecurringList({ recurring, catById }: { recurring: Recurring[]; catById: Map<string, Category> }) {
  const today = dayKey()
  if (recurring.length === 0)
    return (
      <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        No recurring items yet. When adding an entry, choose <strong>Repeats</strong> (weekly, every 2 weeks, monthly) for things like salary, rent or
        subscriptions — they'll appear automatically each period.
      </p>
    )
  return (
    <div className="space-y-2">
      {recurring.map((r) => {
        const c = catById.get(r.categoryId)
        const next = occurrences(r, today, `${Number(today.slice(0, 4)) + 2}-12-31`).find((d) => d > today)
        return (
          <div key={r.id} className={clsx('flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line p-3', r.paused && 'opacity-60')}>
            <span className="text-xl">{c?.emoji ?? '🔁'}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{r.note || c?.name}</div>
              <div className="text-xs font-bold text-muted">
                {CADENCE_LABEL[r.cadence]} · {r.paused ? 'Paused' : next ? `next ${parseDay(next).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'ended'}
              </div>
            </div>
            <span className={clsx('font-display font-bold', r.kind === 'income' ? 'text-brand-ink' : 'text-coral-ink')}>
              {r.kind === 'income' ? '+' : '−'}
              {money(r.amountCents)}
            </span>
            <button
              className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
              onClick={() => updateRecurring(r.id, { paused: !r.paused })}
              aria-label={r.paused ? 'Resume' : 'Pause'}
            >
              {r.paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button className="rounded-lg p-1.5 text-muted hover:text-danger-ink" onClick={() => deleteRecurring(r.id)} aria-label="Stop repeating" title="Stop repeating (past entries are kept)">
              <Trash2 size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
