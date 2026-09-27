import { describe, expect, it } from 'vitest'
import { decideSync, passwordProblem, type SyncState } from './syncLogic'

const base: SyncState = { cloudUpdatedAt: null, localUpdatedAt: null, lastSyncedAt: null, localHasData: false, canClaimGuest: false }

describe('decideSync', () => {
  it('new account: fresh start, or claim guest progress when signed up from guest mode', () => {
    expect(decideSync(base)).toBe('fresh')
    expect(decideSync({ ...base, canClaimGuest: true })).toBe('claim-guest')
  })

  it('pushes local data when the cloud has none', () => {
    expect(decideSync({ ...base, localHasData: true, localUpdatedAt: 5 })).toBe('push')
  })

  it('pulls when this device has nothing yet (e.g. new device)', () => {
    expect(decideSync({ ...base, cloudUpdatedAt: 100 })).toBe('pull')
  })

  it('pulls when only the cloud changed since the last sync', () => {
    expect(decideSync({ ...base, localHasData: true, cloudUpdatedAt: 200, lastSyncedAt: 100, localUpdatedAt: 90 })).toBe('pull')
  })

  it('pushes when only local changed since the last sync', () => {
    expect(decideSync({ ...base, localHasData: true, cloudUpdatedAt: 100, lastSyncedAt: 100, localUpdatedAt: 150 })).toBe('push')
  })

  it('does nothing when in sync', () => {
    expect(decideSync({ ...base, localHasData: true, cloudUpdatedAt: 100, lastSyncedAt: 100, localUpdatedAt: 100 })).toBe('none')
  })

  it('newest wins when both sides changed', () => {
    const both = { ...base, localHasData: true, lastSyncedAt: 100 }
    expect(decideSync({ ...both, cloudUpdatedAt: 300, localUpdatedAt: 200 })).toBe('pull')
    expect(decideSync({ ...both, cloudUpdatedAt: 200, localUpdatedAt: 300 })).toBe('push')
  })
})

describe('passwordProblem', () => {
  it('requires 8+ characters with letters and numbers', () => {
    expect(passwordProblem('short1')).toMatch(/8 characters/)
    expect(passwordProblem('longpassword')).toMatch(/letters and numbers/)
    expect(passwordProblem('compound2026')).toBeNull()
  })
})
