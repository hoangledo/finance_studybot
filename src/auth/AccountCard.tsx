import { Cloud, CloudOff, Loader2, LogOut, UserPlus } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { openAuthFromGuest, signOut, useSession } from './session'
import { supabaseConfigured } from './supabase'
import { useSync } from './sync'

export function SyncBadge({ className }: { className?: string }) {
  const status = useSession((s) => s.status)
  const sync = useSync()
  if (status !== 'signedIn') return null
  const map = {
    idle: { icon: Cloud, text: 'Connecting…', cls: 'text-muted' },
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-sky-ink' },
    saved: { icon: Cloud, text: 'Saved to your account', cls: 'text-brand-ink' },
    offline: { icon: CloudOff, text: 'Offline, will sync later', cls: 'text-gold-ink' },
    error: { icon: CloudOff, text: "Couldn't save, retrying", cls: 'text-danger-ink' },
    setup: { icon: CloudOff, text: 'Cloud storage not set up (run the SQL migration)', cls: 'text-danger-ink' },
  }[sync.status]
  const Icon = map.icon
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-extrabold', map.cls, className)} title={map.text}>
      <Icon size={14} strokeWidth={2.8} className={sync.status === 'saving' ? 'animate-spin' : undefined} />
      {map.text}
    </span>
  )
}

export function AccountCard() {
  const { status, user } = useSession()
  const [busy, setBusy] = useState(false)
  const [unsynced, setUnsynced] = useState(false)

  const doSignOut = async (force = false) => {
    setBusy(true)
    const ok = await signOut(force)
    setBusy(false)
    if (!ok) setUnsynced(true)
  }

  if (status === 'guest')
    return (
      <div className="card flex flex-col gap-3 border-gold p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="font-display text-lg font-bold">You're in guest mode</div>
          <p className="text-sm text-muted">
            Progress is saved only in this browser. Create a free account to keep it safe and use it on any device, and your guest progress comes along.
          </p>
        </div>
        {supabaseConfigured && (
          <button className="btn-sun shrink-0" onClick={openAuthFromGuest}>
            <UserPlus size={17} strokeWidth={2.8} /> Save my progress
          </button>
        )}
      </div>
    )

  if (status !== 'signedIn' || !user) return null
  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold tracking-wide text-muted uppercase">Signed in as</div>
          <div className="truncate font-display text-lg font-bold">{user.email}</div>
          <SyncBadge className="mt-1" />
        </div>
        {!unsynced && (
          <button className="btn-ghost shrink-0" onClick={() => doSignOut()} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} strokeWidth={2.8} />} Sign out
          </button>
        )}
      </div>
      {unsynced && (
        <div className="mt-4 rounded-2xl bg-danger-soft p-4 text-sm">
          <p className="font-bold text-danger-ink">Some recent progress hasn't reached the cloud yet (you may be offline).</p>
          <p className="mt-1 text-muted">Signing out now removes this device's copy, so those changes would be lost.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => doSignOut()} disabled={busy}>
              Try saving again
            </button>
            <button className="btn-danger" onClick={() => doSignOut(true)} disabled={busy}>
              Sign out anyway
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
