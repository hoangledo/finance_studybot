import { registerSW } from 'virtual:pwa-register'
import { toast } from '../features/gamify/fx'

/** Register the offline service worker (production only) and announce updates with a toast. */
export function initPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const update = registerSW({
    onNeedRefresh() {
      toast({ kind: 'info', title: '✨ Update ready', body: 'Tap to reload', sticky: true, onTap: () => update(true) })
    },
    onOfflineReady() {
      toast({ kind: 'info', title: '📴 Ready to work offline', body: 'FinQuest now works without internet' })
    },
  })
}
