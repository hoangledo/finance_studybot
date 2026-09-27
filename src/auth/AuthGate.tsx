import { useEffect, useState, type ReactNode } from 'react'
import { db, dbNameFor, openDb } from '../db/db'
import { ensureSeeded } from '../db/seed'
import { Cappy } from '../components/mascot/Cappy'
import { setAiScope } from '../features/ai/settings'
import { AuthPage, ResetPasswordPage } from './AuthPage'
import { initSession, peekGuestClaim, takeGuestClaim, useSession } from './session'
import { startSync, stopSync } from './sync'

/**
 * Decides what to show: the sign-in screen, or the app backed by the right local database
 * (the guest database, or the signed-in account's database synced with Supabase).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useSession((s) => s.status)
  const user = useSession((s) => s.user)

  useEffect(() => initSession(), [])

  if (status === 'loading') return <Loading text="Waking up Cappy…" />
  if (status === 'recovery') return <ResetPasswordPage />
  if (status === 'signedOut') return <AuthPage />
  const identity = status === 'guest' ? 'guest' : user!.id
  return (
    <DataRoot key={identity} identity={identity} email={user?.email ?? ''}>
      {children}
    </DataRoot>
  )
}

function DataRoot({ identity, email, children }: { identity: string; email: string; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | { error: string }>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setAiScope(identity)
    const run = async () => {
      if (identity === 'guest') {
        stopSync()
        openDb(dbNameFor('guest'))
        await ensureSeeded(db)
      } else {
        await startSync(identity, () => peekGuestClaim(email) && takeGuestClaim(email))
      }
    }
    run()
      .then(() => !cancelled && setState('ready'))
      .catch((e) => !cancelled && setState({ error: e instanceof Error ? e.message : String(e) }))
    return () => {
      cancelled = true
    }
  }, [identity, email, attempt])

  if (state === 'loading') return <Loading text={identity === 'guest' ? 'Opening your notebook…' : 'Loading your progress…'} />
  if (typeof state === 'object')
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <Cappy mood="oops" size={110} />
          <p className="mt-3 font-display text-xl font-bold">Couldn't load your progress</p>
          <p className="mt-1 text-sm text-muted">{state.error}</p>
          <button
            className="btn-primary mt-5"
            onClick={() => {
              setState('loading')
              setAttempt((a) => a + 1)
            }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  return <>{children}</>
}

function Loading({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="text-center">
        <Cappy mood="idle" size={96} />
        <p className="mt-2 text-sm font-bold text-muted">{text}</p>
      </div>
    </div>
  )
}
