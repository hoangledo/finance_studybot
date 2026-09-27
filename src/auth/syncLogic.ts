/**
 * Decides how a signed-in user's local database and their cloud copy are reconciled.
 * Timestamps are epoch milliseconds; `null` means "never".
 */
export type SyncAction =
  | 'pull' // cloud copy replaces local
  | 'push' // local copy replaces cloud
  | 'claim-guest' // brand-new account: carry over the guest progress from this browser
  | 'fresh' // brand-new account: start from the seed curriculum
  | 'none'

export interface SyncState {
  cloudUpdatedAt: number | null // null = no cloud row yet
  localUpdatedAt: number | null // last local change we recorded
  lastSyncedAt: number | null // last time local and cloud were known to match
  localHasData: boolean
  canClaimGuest: boolean // this account was created from guest mode in this browser
}

export function decideSync(s: SyncState): SyncAction {
  if (s.cloudUpdatedAt === null) {
    if (s.localHasData) return 'push'
    return s.canClaimGuest ? 'claim-guest' : 'fresh'
  }
  if (!s.localHasData) return 'pull'
  const localDirty = s.localUpdatedAt !== null && (s.lastSyncedAt === null || s.localUpdatedAt > s.lastSyncedAt)
  const cloudNewer = s.lastSyncedAt === null || s.cloudUpdatedAt > s.lastSyncedAt
  if (localDirty && cloudNewer) {
    // Both changed since the last sync (e.g. offline on two devices): newest wins.
    return (s.localUpdatedAt ?? 0) >= s.cloudUpdatedAt ? 'push' : 'pull'
  }
  if (localDirty) return 'push'
  if (cloudNewer) return 'pull'
  return 'none'
}

/** Basic client-side password rule; Supabase enforces its own settings server-side too. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Mix letters and numbers.'
  return null
}
