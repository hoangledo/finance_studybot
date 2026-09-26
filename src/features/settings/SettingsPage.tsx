import { Download, Eye, EyeOff, KeyRound, Moon, Monitor, Sun, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import clsx from 'clsx'
import { useTheme, type ThemePref } from '../../app/theme'
import { setProfile } from '../../db/actions'
import { exportAll, importAll, resetAll } from '../../db/backup'
import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import { ensureSeeded } from '../../db/seed'
import { PageHeader } from '../../components/ui'
import { getApiKey, getModel, MODELS, saveAiSettings } from '../ai/settings'
import { toast } from '../gamify/fx'
import { isMuted, play, setMuted } from '../gamify/sounds'

export function SettingsPage() {
  const profile = useProfile()
  const theme = useTheme()
  const [key, setKey] = useState(getApiKey)
  const [model, setModel] = useState(getModel)
  const [showKey, setShowKey] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = async () => {
    const data = await exportAll(db)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `finquest-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast({ kind: 'info', title: 'Backup downloaded' })
  }

  const doImport = async (file: File) => {
    try {
      await importAll(db, JSON.parse(await file.text()))
      toast({ kind: 'info', title: 'Backup restored' })
    } catch (e) {
      toast({ kind: 'error', title: 'Import failed', body: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-5">
        <Section title="Appearance">
          <div className="inline-flex rounded-xl bg-surface-2 p-1">
            {(
              [
                ['system', Monitor, 'System'],
                ['light', Sun, 'Light'],
                ['dark', Moon, 'Dark'],
              ] as [ThemePref, typeof Sun, string][]
            ).map(([p, Icon, label]) => (
              <button
                key={p}
                onClick={() => theme.set(p)}
                className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold', theme.pref === p ? 'bg-surface shadow-sm' : 'text-muted')}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Sound effects">
          <div className="inline-flex rounded-xl bg-surface-2 p-1">
            {[
              [false, 'On 🔊'],
              [true, 'Off 🔇'],
            ].map(([m, label]) => (
              <button
                key={String(m)}
                onClick={() => {
                  setMuted(m as boolean)
                  setMutedState(m as boolean)
                  if (!m) play('correct')
                }}
                className={clsx('rounded-lg px-4 py-1.5 text-sm font-extrabold', muted === m ? 'bg-surface shadow-sm' : 'text-muted')}
              >
                {label as string}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Daily goal">
          <div className="flex flex-wrap gap-2">
            {[30, 50, 100, 150].map((g) => (
              <button key={g} onClick={() => setProfile({ dailyGoal: g })} className={profile.dailyGoal === g ? 'btn-primary' : 'btn-ghost'}>
                {g} XP
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="AI assist (optional)"
          desc="Paste your Anthropic API key to draft concepts and cards from Bogleheads/Reddit excerpts and get “Explain like I'm new” summaries. The key is stored only in this browser and sent only to api.anthropic.com. Usage is billed to your Anthropic account."
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <KeyRound size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                className="input px-9 font-mono"
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-…"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
              />
              <button className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted" onClick={() => setShowKey(!showKey)} aria-label="Toggle key visibility">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.note}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="btn-primary"
              onClick={() => {
                saveAiSettings(key, model)
                toast({ kind: 'info', title: key ? 'AI settings saved' : 'API key removed' })
              }}
            >
              Save
            </button>
            {key && (
              <button
                className="btn-ghost"
                onClick={() => {
                  setKey('')
                  saveAiSettings('', model)
                  toast({ kind: 'info', title: 'API key removed' })
                }}
              >
                Remove key
              </button>
            )}
          </div>
        </Section>

        <Section title="Backup" desc="Your data lives only in this browser. Export a backup file regularly, or to move to another device.">
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={doExport}>
              <Download size={16} /> Export backup
            </button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) doImport(f)
                e.target.value = ''
              }}
            />
          </div>
        </Section>

        <Section title="Danger zone">
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>This erases all progress, XP, and your own concepts. Export first!</span>
              <button
                className="btn-danger"
                onClick={async () => {
                  await resetAll(db)
                  await ensureSeeded(db)
                  setConfirmReset(false)
                  toast({ kind: 'info', title: 'Everything reset' })
                }}
              >
                Erase everything
              </button>
              <button className="btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="btn-ghost text-danger-ink" onClick={() => setConfirmReset(true)}>
              Reset all progress
            </button>
          )}
        </Section>

        <p className="text-xs text-muted">
          Educational content inspired by the Bogleheads wiki and r/personalfinance wiki; not financial advice. Contribution limits are 2026 IRS figures and
          change yearly.
        </p>
      </div>
    </>
  )
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold">{title}</h2>
      {desc && <p className="mt-1 mb-4 max-w-2xl text-sm text-muted">{desc}</p>}
      <div className={desc ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}
