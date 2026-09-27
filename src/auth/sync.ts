import Dexie, { type ObservabilitySet } from 'dexie'
import { create } from 'zustand'
import { exportAll, importAll, resetAll } from '../db/backup'
import { db, dbNameFor, FinDB, openDb } from '../db/db'
import { ensureSeeded } from '../db/seed'
import { decideSync, type SyncAction } from './syncLogic'
import { supabase } from './supabase'

/*
 * Local-first sync: the app always reads and writes the local IndexedDB for this account.
 * Changes are pushed to Supabase (one JSON snapshot row per user, protected by RLS) a few
 * seconds after they happen, when the tab is hidden, and before sign-out. On sign-in and when
 * the tab regains focus, a newer cloud copy (e.g. from another device) is pulled in.
 */

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error' | 'setup'

export const useSync = create<{ status: SyncStatus; savedAt: number | null }>(() => ({ status: 'idle', savedAt: null }))

const TABLE = 'user_progress'
const PUSH_DELAY_MS = 2500

interface Marks {
  localUpdatedAt: number | null
  lastSyncedAt: number | null
}

let current: { userId: string } | null = null
let suppress = 0
let timer: ReturnType<typeof setTimeout> | null = null
let pushing: Promise<boolean> | null = null

const marksKey = (uid: string) => `finquest.sync.${uid}`
function readMarks(uid: string): Marks {
  try {
    return { localUpdatedAt: null, lastSyncedAt: null, ...JSON.parse(localStorage.getItem(marksKey(uid)) ?? '{}') }
  } catch {
    return { localUpdatedAt: null, lastSyncedAt: null }
  }
}
function writeMarks(uid: string, patch: Partial<Marks>) {
  try {
    localStorage.setItem(marksKey(uid), JSON.stringify({ ...readMarks(uid), ...patch }))
  } catch {
    /* ignore */
  }
}

async function withSuppressed<T>(fn: () => Promise<T>) {
  suppress++
  try {
    return await fn()
  } finally {
    // Dexie reports mutations asynchronously; keep ignoring them for a moment.
    setTimeout(() => suppress--, 50)
  }
}

/* ───────────── Cloud I/O ───────────── */

async function fetchCloud(uid: string, withData: boolean) {
  const { data, error } = await supabase!
    .from(TABLE)
    .select(withData ? 'data, updated_at' : 'updated_at')
    .eq('user_id', uid)
    .maybeSingle<{ data?: unknown; updated_at: string }>()
  if (error) throw error
  return data ? { data: data.data, updatedAt: Date.parse(data.updated_at) } : null
}

/** PostgREST reports a missing table as PGRST205: the SQL migration hasn't been run yet. */
function isMissingTable(e: unknown) {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'PGRST205'
}

function failureStatus(e: unknown): SyncStatus {
  if (isMissingTable(e)) return 'setup'
  return navigator.onLine ? 'error' : 'offline'
}

async function push(): Promise<boolean> {
  if (!current || !supabase) return false
  if (pushing) return pushing
  const uid = current.userId
  pushing = (async () => {
    useSync.setState({ status: 'saving' })
    const stamp = Date.now()
    try {
      const snapshot = await exportAll(db)
      const { error } = await supabase!.from(TABLE).upsert({ user_id: uid, data: snapshot, updated_at: new Date(stamp).toISOString() })
      if (error) throw error
      writeMarks(uid, { lastSyncedAt: stamp })
      useSync.setState({ status: 'saved', savedAt: stamp })
      return true
    } catch (e) {
      useSync.setState({ status: failureStatus(e) })
      return false
    } finally {
      pushing = null
    }
  })()
  const ok = await pushing
  // Something changed while we were uploading? Queue another save.
  const m = readMarks(uid)
  if (ok && current?.userId === uid && (m.localUpdatedAt ?? 0) > (m.lastSyncedAt ?? 0)) schedulePush()
  return ok
}

function schedulePush(delay = PUSH_DELAY_MS) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void push()
  }, delay)
}

async function pull(uid: string, data: unknown, updatedAt: number) {
  await withSuppressed(async () => {
    await importAll(db, data)
    await ensureSeeded(db) // merge any newer seed content into an older snapshot
  })
  writeMarks(uid, { lastSyncedAt: updatedAt, localUpdatedAt: updatedAt })
  useSync.setState({ status: 'saved', savedAt: updatedAt })
}

/* ───────────── Change detection & lifecycle ───────────── */

function onMutated(parts: ObservabilitySet) {
  if (!current || suppress > 0) return
  const prefix = `idb://${db.name}/`
  if (!Object.keys(parts).some((k) => k.startsWith(prefix))) return
  writeMarks(current.userId, { localUpdatedAt: Date.now() })
  schedulePush()
}

async function onFocus() {
  if (!current || !supabase || document.visibilityState !== 'visible') return
  const uid = current.userId
  const m = readMarks(uid)
  if ((m.localUpdatedAt ?? 0) > (m.lastSyncedAt ?? 0)) return void push()
  try {
    const head = await fetchCloud(uid, false)
    if (head && head.updatedAt > (m.lastSyncedAt ?? 0)) {
      const full = await fetchCloud(uid, true)
      if (full && current?.userId === uid) await pull(uid, full.data, full.updatedAt)
    }
  } catch (e) {
    useSync.setState({ status: failureStatus(e) })
  }
}

function onHidden() {
  if (document.visibilityState === 'hidden' && current) {
    const m = readMarks(current.userId)
    if ((m.localUpdatedAt ?? 0) > (m.lastSyncedAt ?? 0)) void push()
  }
}

function onOnline() {
  if (current) void push()
}

/**
 * Open this account's local database and reconcile it with the cloud.
 * `canClaimGuest` lets a brand-new account inherit the guest progress from this browser.
 */
export async function startSync(userId: string, canClaimGuest: () => boolean): Promise<{ action: SyncAction; offline: boolean }> {
  stopSync()
  openDb(dbNameFor({ userId }))
  current = { userId }
  const marks = readMarks(userId)
  const localHasData = Boolean(await db.meta.get('seedVersion'))

  let cloud: { data?: unknown; updatedAt: number } | null
  try {
    cloud = await fetchCloud(userId, true)
  } catch (e) {
    // Offline (or cloud not set up): keep working locally; changes sync once it's reachable.
    await withSuppressed(() => ensureSeeded(db))
    useSync.setState({ status: failureStatus(e) })
    attach()
    return { action: 'none', offline: true }
  }

  const action = decideSync({
    cloudUpdatedAt: cloud?.updatedAt ?? null,
    localUpdatedAt: marks.localUpdatedAt,
    lastSyncedAt: marks.lastSyncedAt,
    localHasData,
    canClaimGuest: cloud === null && !localHasData && canClaimGuest(),
  })

  if (action === 'pull') await pull(userId, cloud!.data, cloud!.updatedAt)
  else if (action === 'claim-guest') {
    const guest = new FinDB(dbNameFor('guest'))
    const snapshot = await exportAll(guest)
    await importAll(db, snapshot)
    await resetAll(guest) // the progress now belongs to the account
    guest.close()
    await ensureSeeded(db)
    writeMarks(userId, { localUpdatedAt: Date.now() })
    await push()
  } else if (action === 'fresh' || action === 'push') {
    await ensureSeeded(db)
    writeMarks(userId, { localUpdatedAt: Date.now() })
    await push()
  } else {
    await withSuppressed(() => ensureSeeded(db))
    useSync.setState({ status: 'saved', savedAt: marks.lastSyncedAt })
  }

  attach()
  return { action, offline: false }
}

function attach() {
  Dexie.on('storagemutated', onMutated)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('online', onOnline)
}

export function stopSync() {
  if (timer) clearTimeout(timer)
  timer = null
  Dexie.on('storagemutated').unsubscribe(onMutated)
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onFocus)
  document.removeEventListener('visibilitychange', onHidden)
  window.removeEventListener('online', onOnline)
  current = null
  useSync.setState({ status: 'idle', savedAt: null })
}

/** Upload pending changes now. Resolves true when everything is saved to the cloud. */
export async function flushSync(): Promise<boolean> {
  if (!current) return true
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const m = readMarks(current.userId)
  if ((m.localUpdatedAt ?? 0) <= (m.lastSyncedAt ?? 0) && !pushing) return true
  return push()
}
