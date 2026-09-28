import { BarChart3, BookOpen, Calculator, Network, Plus, Settings, UserRound, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Modal } from '../components/ui'
import { SyncBadge } from '../auth/AccountCard'
import { openAuthFromGuest, useSession } from '../auth/session'
import { supabaseConfigured } from '../auth/supabase'
import { StreakCard } from '../features/gamify/Hud'
import { QuestsCard } from '../features/gamify/Quests'
import { useQuickAdd } from '../features/library/QuickAdd'
import { useUi } from './uiStore'

const TILES: { to: string; label: string; icon: LucideIcon; cls: string }[] = [
  { to: '/map', label: 'Map', icon: Network, cls: 'bg-gold text-on-color' },
  { to: '/library', label: 'Library', icon: BookOpen, cls: 'bg-grape text-white' },
  { to: '/tools', label: 'Money Lab', icon: Calculator, cls: 'bg-brand text-on-color' },
  { to: '/profile', label: 'Profile', icon: UserRound, cls: 'bg-sky text-white' },
  { to: '/stats', label: 'Stats', icon: BarChart3, cls: 'bg-coral text-white' },
  { to: '/settings', label: 'Settings', icon: Settings, cls: 'bg-muted text-white' },
]

export const MORE_ROUTES = TILES.map((t) => t.to)

/** Phone "More" menu: every page that doesn't fit in the bottom bar, plus quests and streak. */
export function MoreSheet() {
  const open = useUi((s) => s.moreOpen)
  const setOpen = useUi((s) => s.setMoreOpen)
  const openAdd = useQuickAdd((s) => s.open)
  const status = useSession((s) => s.status)
  const close = () => setOpen(false)
  return (
    <Modal open={open} onClose={close} title="More">
      <div className="grid grid-cols-3 gap-3">
        {TILES.map(({ to, label, icon: Icon, cls }) => (
          <Link key={to} to={to} onClick={close} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-b-4 border-line p-3 active:translate-y-0.5">
            <span className={clsx('grid h-12 w-12 place-items-center rounded-2xl', cls)}>
              <Icon size={24} strokeWidth={2.6} />
            </span>
            <span className="text-center text-xs font-extrabold">{label}</span>
          </Link>
        ))}
      </div>
      <button
        className="btn-primary mt-4 w-full"
        onClick={() => {
          close()
          openAdd()
        }}
      >
        <Plus size={18} strokeWidth={3} /> Add a concept
      </button>
      <div className="mt-4 space-y-4">
        <StreakCard />
        <QuestsCard compact />
      </div>
      <div className="mt-4 rounded-2xl bg-surface-2 p-3 text-center">
        {status === 'signedIn' ? (
          <SyncBadge />
        ) : (
          supabaseConfigured && (
            <button
              className="text-sm font-extrabold text-gold-ink underline"
              onClick={() => {
                close()
                openAuthFromGuest()
              }}
            >
              Guest mode · create an account to save your progress
            </button>
          )
        )}
      </div>
    </Modal>
  )
}
