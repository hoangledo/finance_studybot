import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { Cappy, type Mood } from '../components/mascot/Cappy'
import { SpeechBubble } from '../components/mascot/SpeechBubble'
import { continueAsGuest, sendPasswordReset, setNewPassword, signIn, signUp, useSession } from './session'
import { supabaseConfigured } from './supabase'

type Mode = 'signin' | 'signup' | 'forgot' | 'checkEmail' | 'resetSent'

export function AuthPage() {
  const fromGuest = useSession((s) => s.fromGuest)
  const [mode, setMode] = useState<Mode>(fromGuest ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = (m: Mode) => {
    setMode(m)
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') await signIn(email, password)
      else if (mode === 'signup') {
        const needsConfirm = await signUp(email, password, fromGuest)
        if (needsConfirm) go('checkEmail')
      } else if (mode === 'forgot') {
        await sendPasswordReset(email)
        go('resetSent')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const mood: Mood = error ? 'oops' : mode === 'checkEmail' || mode === 'resetSent' ? 'cheer' : mode === 'forgot' ? 'think' : 'wave'
  const line =
    mode === 'signup'
      ? fromGuest
        ? 'Create an account and your guest progress comes with you!'
        : 'New here? Make an account so your progress follows you everywhere.'
      : mode === 'forgot'
        ? "No worries, it happens. I'll email you a reset link."
        : mode === 'checkEmail'
          ? 'Almost there! Check your inbox and click the confirmation link.'
          : mode === 'resetSent'
            ? 'If that email has an account, a reset link is on its way.'
            : 'Welcome back! Sign in to pick up where you left off.'

  return (
    <AuthShell mood={mood} line={line}>
      {!supabaseConfigured ? (
        <div className="space-y-4 text-center">
          <p className="rounded-2xl bg-gold-soft p-4 text-sm font-bold text-gold-ink">
            Accounts aren't set up on this site yet (missing Supabase settings). You can still learn in guest mode — progress stays in this browser.
          </p>
          <button className="btn-primary w-full py-3.5" onClick={continueAsGuest}>
            Continue as guest
          </button>
        </div>
      ) : mode === 'checkEmail' || mode === 'resetSent' ? (
        <div className="space-y-4 text-center">
          <div className="text-5xl">📬</div>
          <p className="font-bold">
            {mode === 'checkEmail' ? (
              <>
                We sent a confirmation link to <span className="text-sky-ink">{email}</span>. Open it on this device, then sign in.
              </>
            ) : (
              'Open the link in the email to choose a new password.'
            )}
          </p>
          <button className="btn-primary w-full py-3.5" onClick={() => go('signin')}>
            Back to sign in
          </button>
        </div>
      ) : (
        <>
          {mode !== 'forgot' && (
            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => go(m)}
                  className={clsx('min-h-10 rounded-xl py-2 text-sm font-extrabold transition', mode === m ? 'bg-surface shadow-sm' : 'text-muted')}
                >
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}
          {mode === 'forgot' && <h2 className="mb-4 font-display text-2xl font-bold">Reset your password</h2>}

          <form onSubmit={submit} className="space-y-3" noValidate={false}>
            <label className="block">
              <span className="label">Email</span>
              <div className="relative">
                <Mail size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-10"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </label>
            {mode !== 'forgot' && (
              <PasswordField
                value={password}
                onChange={setPassword}
                show={show}
                setShow={setShow}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                hint={mode === 'signup' ? 'At least 8 characters, with letters and numbers.' : undefined}
              />
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>
              {busy && <Loader2 size={18} className="animate-spin" />}
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
            {mode === 'signin' ? (
              <button type="button" className="text-sky-ink hover:underline" onClick={() => go('forgot')}>
                Forgot password?
              </button>
            ) : mode === 'forgot' ? (
              <button type="button" className="text-sky-ink hover:underline" onClick={() => go('signin')}>
                ← Back to sign in
              </button>
            ) : (
              <span />
            )}
          </div>
        </>
      )}

      {supabaseConfigured && mode !== 'checkEmail' && mode !== 'resetSent' && (
        <div className="mt-6 border-t-2 border-line pt-5 text-center">
          <button type="button" className="btn-ghost w-full" onClick={continueAsGuest}>
            {fromGuest ? 'Back to guest mode' : 'Try it as a guest'}
          </button>
          <p className="mt-2 text-xs text-muted">Guest progress stays in this browser only. Create an account anytime to keep it.</p>
        </div>
      )}
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await setNewPassword(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthShell mood={error ? 'oops' : 'think'} line="Pick a new password and you're back in business.">
      <h2 className="mb-4 font-display text-2xl font-bold">Choose a new password</h2>
      <form onSubmit={submit} className="space-y-3">
        <PasswordField value={password} onChange={setPassword} show={show} setShow={setShow} autoComplete="new-password" hint="At least 8 characters, with letters and numbers." />
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">
            {error}
          </p>
        )}
        <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>
          {busy && <Loader2 size={18} className="animate-spin" />}
          Save password
        </button>
      </form>
    </AuthShell>
  )
}

function PasswordField({
  value,
  onChange,
  show,
  setShow,
  autoComplete,
  hint,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  setShow: (v: boolean) => void
  autoComplete: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="label">Password</span>
      <div className="relative">
        <LockKeyhole size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input
          className="input px-10"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your password"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-muted"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

function AuthShell({ mood, line, children }: { mood: Mood; line: string; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-bg px-4 pt-[calc(env(safe-area-inset-top,0px)_+_24px)] pb-[calc(env(safe-area-inset-bottom,0px)_+_24px)]">
      <div className="mx-auto max-w-md">
        <div className="mb-2 flex items-center justify-center gap-1">
          <span className="font-display text-4xl font-bold tracking-tight text-brand-ink">finquest</span>
        </div>
        <div className="mb-4 flex items-end justify-center gap-2">
          <Cappy mood={mood} size={110} className="shrink-0" />
          <SpeechBubble className="mb-6 max-w-[240px] text-sm">{line}</SpeechBubble>
        </div>
        <div className="card p-6">{children}</div>
        <p className="mt-4 text-center text-xs text-muted">Passwords are handled by Supabase Auth and never stored by FinQuest.</p>
      </div>
    </div>
  )
}
