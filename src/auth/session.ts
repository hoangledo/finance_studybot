import Dexie from 'dexie'
import { create } from 'zustand'
import { dbNameFor } from '../db/db'
import { clearAiKey } from '../features/ai/settings'
import { passwordProblem } from './syncLogic'
import { supabase } from './supabase'
import { flushSync, stopSync } from './sync'

export type AuthStatus = 'loading' | 'signedOut' | 'guest' | 'signedIn' | 'recovery'

export interface SessionUser {
  id: string
  email: string
}

interface SessionState {
  status: AuthStatus
  user: SessionUser | null
  /** True when the auth screen was opened from guest mode (offers "back to guest"). */
  fromGuest: boolean
}

const MODE_KEY = 'finquest.mode'
const CLAIM_KEY = 'finquest.claimGuest'

export const useSession = create<SessionState>(() => ({ status: 'loading', user: null, fromGuest: false }))

function ls(k: string, v?: string | null) {
  try {
    if (v === undefined) return localStorage.getItem(k)
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* storage unavailable */
  }
  return null
}

let initialized = false

/** Start listening to Supabase auth. Safe to call more than once. */
export function initSession() {
  if (initialized) return
  initialized = true
  const guestChosen = ls(MODE_KEY) === 'guest'
  if (!supabase) {
    useSession.setState({ status: guestChosen ? 'guest' : 'signedOut' })
    return
  }
  supabase.auth.onAuthStateChange((event, session) => {
    // Supabase warns against awaiting its own calls inside this callback; defer work instead.
    setTimeout(() => {
      const s = useSession.getState()
      if (event === 'PASSWORD_RECOVERY') {
        useSession.setState({ status: 'recovery', user: session?.user ? toUser(session.user) : null })
        return
      }
      if (session?.user) {
        if (s.status === 'recovery') return // finish setting a new password first
        const user = toUser(session.user)
        if (s.status === 'signedIn' && s.user?.id === user.id) return // token refresh etc.
        ls(MODE_KEY, null)
        useSession.setState({ status: 'signedIn', user, fromGuest: false })
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        useSession.setState({ status: ls(MODE_KEY) === 'guest' ? 'guest' : 'signedOut', user: null })
      }
    }, 0)
  })
}

function toUser(u: { id: string; email?: string }): SessionUser {
  return { id: u.id, email: u.email ?? '' }
}

/* ───────────── Actions used by the UI ───────────── */

export function continueAsGuest() {
  ls(MODE_KEY, 'guest')
  useSession.setState({ status: 'guest', user: null, fromGuest: false })
}

/** From guest mode, open the sign-in / sign-up screen. */
export function openAuthFromGuest() {
  useSession.setState({ status: 'signedOut', fromGuest: true })
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Accounts are not configured on this site.')
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(friendlyError(error.message))
}

/** Returns true when the user must confirm their email before signing in. */
export async function signUp(email: string, password: string, fromGuest: boolean) {
  if (!supabase) throw new Error('Accounts are not configured on this site.')
  const problem = passwordProblem(password)
  if (problem) throw new Error(problem)
  const clean = email.trim().toLowerCase()
  // Remember that this account was created from guest mode, so its first sign-in can
  // carry the guest progress over (only into a brand-new, empty account).
  if (fromGuest) ls(CLAIM_KEY, clean)
  const { data, error } = await supabase.auth.signUp({ email: clean, password, options: { emailRedirectTo: window.location.origin } })
  if (error) throw new Error(friendlyError(error.message))
  return !data.session
}

export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error('Accounts are not configured on this site.')
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
  // Don't reveal whether an account exists; only surface rate limits and similar.
  if (error && /rate|limit|too many/i.test(error.message)) throw new Error(friendlyError(error.message))
}

export async function setNewPassword(password: string) {
  if (!supabase) throw new Error('Accounts are not configured on this site.')
  const problem = passwordProblem(password)
  if (problem) throw new Error(problem)
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(friendlyError(error.message))
  useSession.setState({ status: 'signedIn', user: data.user ? toUser(data.user) : useSession.getState().user })
}

/**
 * Sign out: save any unsynced progress first, then remove this account's local copy so the
 * next person on this browser can't read it. Returns false if unsynced changes would be lost
 * (pass `force` to sign out anyway).
 */
export async function signOut(force = false): Promise<boolean> {
  const { user } = useSession.getState()
  if (!supabase || !user) return true
  const saved = await flushSync()
  if (!saved && !force) return false
  stopSync()
  await supabase.auth.signOut()
  clearAiKey(user.id)
  await Dexie.delete(dbNameFor({ userId: user.id })).catch(() => {})
  useSession.setState({ status: 'signedOut', user: null, fromGuest: false })
  return true
}

/** Whether this signed-in account was created from guest mode in this browser. */
export function takeGuestClaim(email: string) {
  const claim = ls(CLAIM_KEY)
  if (claim && claim === email.toLowerCase()) {
    ls(CLAIM_KEY, null)
    return true
  }
  return false
}

export function peekGuestClaim(email: string) {
  return ls(CLAIM_KEY) === email.toLowerCase()
}

function friendlyError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email first — check your inbox for the link.'
  if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists. Try signing in.'
  if (/rate|too many/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.'
  if (/password/i.test(msg)) return msg
  if (/fetch|network/i.test(msg)) return "Can't reach the server. Check your connection."
  return msg
}
