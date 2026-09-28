import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeAll, describe, expect, it, vi } from 'vitest'

/* ── Minimal browser globals for the sync engine ── */
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})
vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} })
vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} })
vi.stubGlobal('navigator', { onLine: true })

/* ── In-memory stand-in for the Supabase `user_progress` table ── */
const cloud = new Map<string, { data: unknown; updated_at: string }>()
const fakeSupabase = {
  from: () => ({
    select: () => ({
      eq: (_col: string, uid: string) => ({
        maybeSingle: async () => ({ data: cloud.get(uid) ? structuredClone(cloud.get(uid)) : null, error: null }),
      }),
    }),
    upsert: async (row: { user_id: string; data: unknown; updated_at: string }) => {
      cloud.set(row.user_id, { data: structuredClone(row.data), updated_at: row.updated_at })
      return { error: null }
    },
  }),
}
vi.mock('./supabase', () => ({ supabase: fakeSupabase, supabaseConfigured: true }))

let mod: typeof import('./sync')
let dbMod: typeof import('../db/db')
beforeAll(async () => {
  mod = await import('./sync')
  dbMod = await import('../db/db')
})

const cloudXp = (uid: string) => (cloud.get(uid)!.data as { data: { profile: { xp: number }[] } }).data.profile[0].xp
const waitForMutationEvent = () => new Promise((r) => setTimeout(r, 30))

describe('account sync', () => {
  it('seeds and uploads a brand-new account', async () => {
    const r = await mod.startSync('user-a', () => false)
    expect(r.action).toBe('fresh')
    expect(cloud.has('user-a')).toBe(true)
    expect(await dbMod.db.concepts.count()).toBeGreaterThan(50)
    expect(dbMod.db.name).toBe('finquest-u-user-a')
  })

  it('uploads local changes', async () => {
    await dbMod.db.profile.update('me', { xp: 321 })
    await dbMod.db.transactions.add({ id: 'tx-1', date: '2026-09-01', amountCents: 450000, kind: 'income', categoryId: 'cat-salary', note: 'Pay', createdAt: 1 })
    await dbMod.db.categories.update('cat-dining', { monthlyLimitCents: 15000 })
    await waitForMutationEvent()
    expect(await mod.flushSync()).toBe(true)
    expect(cloudXp('user-a')).toBe(321)
  })

  it('restores progress on a new device', async () => {
    mod.stopSync()
    dbMod.db.close()
    await Dexie.delete('finquest-u-user-a')
    store.delete('finquest.sync.user-a')
    const r = await mod.startSync('user-a', () => false)
    expect(r.action).toBe('pull')
    expect((await dbMod.db.profile.get('me'))!.xp).toBe(321)
    // Money tracker data travels with the account too.
    expect((await dbMod.db.transactions.get('tx-1'))!.amountCents).toBe(450000)
    expect((await dbMod.db.categories.get('cat-dining'))!.monthlyLimitCents).toBe(15000)
  })

  it('keeps accounts separate', async () => {
    const r = await mod.startSync('user-b', () => false)
    expect(r.action).toBe('fresh')
    expect((await dbMod.db.profile.get('me'))!.xp).toBe(0)
    expect(cloudXp('user-a')).toBe(321)
  })

  it('moves guest progress into an account created from guest mode', async () => {
    mod.stopSync()
    const guest = new dbMod.FinDB('finquest-guest')
    const { ensureSeeded } = await import('../db/seed')
    await ensureSeeded(guest)
    await guest.profile.update('me', { xp: 77, onboarded: true })
    guest.close()

    const r = await mod.startSync('user-c', () => true)
    expect(r.action).toBe('claim-guest')
    expect(cloudXp('user-c')).toBe(77)
    const after = new dbMod.FinDB('finquest-guest')
    expect(await after.profile.count()).toBe(0) // guest copy cleared
    after.close()
  })
})
