import { motion } from 'framer-motion'
import { BookOpen, Calculator, Flag, Home, LayoutGrid, Layers, Network, Plus, Route, Settings, UserRound, Wallet, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { useDueCount, useProfile } from '../db/hooks'
import { Cappy } from '../components/mascot/Cappy'
import { Celebrations } from '../features/gamify/Celebrations'
import { GoalCard, GoalRing, MiniAvatar, ProfileCard, StreakBadge, StreakCard } from '../features/gamify/Hud'
import { QuestsCard } from '../features/gamify/Quests'
import { QuickAddModal, useQuickAdd } from '../features/library/QuickAdd'
import { SyncBadge } from '../auth/AccountCard'
import { openAuthFromGuest, useSession } from '../auth/session'
import { supabaseConfigured } from '../auth/supabase'
import { MORE_ROUTES, MoreSheet } from './MoreSheet'
import { useUi } from './uiStore'
import { GlossarySheet } from '../features/glossary/Glossary'

type Tone = 'brand' | 'sky' | 'coral' | 'gold' | 'grape' | 'muted'

const TONE: Record<Tone, { active: string; tile: string; tileActive: string }> = {
  brand: { active: 'border-brand bg-brand-soft text-brand-ink', tile: 'bg-brand-soft text-brand-ink', tileActive: 'bg-brand text-on-color' },
  sky: { active: 'border-sky bg-sky-soft text-sky-ink', tile: 'bg-sky-soft text-sky-ink', tileActive: 'bg-sky text-white' },
  coral: { active: 'border-coral bg-coral-soft text-coral-ink', tile: 'bg-coral-soft text-coral-ink', tileActive: 'bg-coral text-white' },
  gold: { active: 'border-gold bg-gold-soft text-gold-ink', tile: 'bg-gold-soft text-gold-ink', tileActive: 'bg-gold text-on-color' },
  grape: { active: 'border-grape bg-grape-soft text-grape-ink', tile: 'bg-grape-soft text-grape-ink', tileActive: 'bg-grape text-white' },
  muted: { active: 'border-line bg-surface-2 text-ink', tile: 'bg-surface-2 text-muted', tileActive: 'bg-muted text-white' },
}

const NAV: { to: string; label: string; icon: LucideIcon; tone: Tone }[] = [
  { to: '/', label: 'Home', icon: Home, tone: 'coral' },
  { to: '/path', label: 'Learn', icon: Route, tone: 'brand' },
  { to: '/review', label: 'Review', icon: Layers, tone: 'sky' },
  { to: '/money', label: 'Money', icon: Wallet, tone: 'coral' },
  { to: '/map', label: 'Map', icon: Network, tone: 'gold' },
  { to: '/library', label: 'Library', icon: BookOpen, tone: 'grape' },
  { to: '/tools', label: 'Money Lab', icon: Calculator, tone: 'brand' },
  { to: '/missions', label: 'Missions', icon: Flag, tone: 'gold' },
  { to: '/profile', label: 'Profile', icon: UserRound, tone: 'sky' },
  { to: '/settings', label: 'Settings', icon: Settings, tone: 'muted' },
]
const MOBILE_NAV = ['/', '/path', '/review', '/money']

/** Title shown in the phone header, so you always know where you are. */
function pageTitle(path: string) {
  if (path.startsWith('/concept/')) return 'Concept'
  if (path === '/stats') return 'Stats'
  return NAV.find((n) => n.to === path)?.label ?? ''
}

export function Layout() {
  const due = useDueCount()
  const openAdd = useQuickAdd((s) => s.open)
  const loc = useLocation()
  const fullBleed = loc.pathname === '/map'
  const onboarded = useProfile().onboarded
  const authStatus = useSession((st) => st.status)
  const showRail = !fullBleed && onboarded
  const { focus, setMoreOpen, setAddMoneyOpen, setFocus } = useUi()
  const moreActive = MORE_ROUTES.includes(loc.pathname) || loc.pathname.startsWith('/concept/')
  const onMoney = loc.pathname === '/money'
  const showPlus = onMoney || ['/', '/library', '/map'].includes(loc.pathname) || loc.pathname.startsWith('/concept/')


  // Leaving a page always ends focus mode and closes the More sheet.
  useEffect(() => {
    setFocus(false)
    setMoreOpen(false)
  }, [loc.pathname, setFocus, setMoreOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        openAdd()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openAdd])

  return (
    <div className="flex h-full">
      {/* Left nav (tablet and up) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-line bg-surface px-4 py-5 md:flex">
        <NavLink to="/" className="mb-6 flex items-center gap-1 px-1">
          <Cappy mood="idle" size={48} />
          <span className="font-display text-[28px] font-bold tracking-tight text-brand-ink">finquest</span>
        </NavLink>
        <nav className="flex flex-col gap-1.5">
          {NAV.map(({ to, label, icon: Icon, tone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-2xl border-2 px-2.5 py-2 text-[15px] font-extrabold tracking-wide uppercase transition',
                  isActive ? TONE[tone].active : 'border-transparent text-muted hover:bg-surface-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'grid h-9 w-9 place-items-center rounded-xl transition group-hover:scale-110',
                      isActive ? TONE[tone].tileActive : TONE[tone].tile,
                    )}
                  >
                    <Icon size={20} strokeWidth={2.6} />
                  </span>
                  {label}
                  {to === '/review' && due > 0 && (
                    <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-[11px] font-extrabold text-white">{due}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <button className="btn-primary mt-6" onClick={() => openAdd()}>
          <Plus size={18} strokeWidth={3} /> Add concept
          <kbd className="ml-1 rounded-md bg-black/10 px-1.5 text-[10px]">N</kbd>
        </button>
        <div className="mt-auto px-1 pt-6">
          {authStatus === 'signedIn' ? (
            <SyncBadge />
          ) : (
            supabaseConfigured && (
              <button onClick={openAuthFromGuest} className="w-full rounded-2xl border-2 border-dashed border-gold p-3 text-left text-xs font-bold text-gold-ink hover:bg-gold-soft">
                Guest mode · <span className="underline">create an account</span> to save your progress
              </button>
            )
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top HUD (hidden on large screens, where the right rail shows the same info) */}
        {!focus && (
          <header
            className={clsx(
              'pt-safe sticky top-0 z-30 border-b-2 border-line bg-bg/90 backdrop-blur',
              showRail && 'lg:hidden',
            )}
          >
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <MiniAvatar size={40} />
              <span className="min-w-0 truncate font-display text-lg font-bold md:hidden">{pageTitle(loc.pathname)}</span>
              <div className="ml-auto flex items-center gap-3">
                <StreakBadge />
                <GoalRing />
                {showPlus && (
                  <button
                    className={clsx('h-10 w-10 p-0 md:hidden', onMoney ? 'btn-coral' : 'btn-primary')}
                    onClick={() => (onMoney ? setAddMoneyOpen(true) : openAdd())}
                    aria-label={onMoney ? 'Add money entry' : 'Add concept'}
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        <div className="flex min-h-0 flex-1">
          <main
            className={clsx(
              'min-h-0 min-w-0 flex-1',
              fullBleed ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain',
              !fullBleed && (focus ? 'pb-[max(env(safe-area-inset-bottom),16px)]' : 'pb-[calc(88px_+_env(safe-area-inset-bottom))] md:pb-10'),
              fullBleed && !focus && 'pb-[calc(72px_+_env(safe-area-inset-bottom))] md:pb-0',
            )}
          >
            {fullBleed ? (
              <Outlet />
            ) : (
              <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
                <Outlet />
              </div>
            )}
          </main>

          {showRail && (
            <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l-2 border-line px-5 py-6 lg:block">
              <div className="space-y-4">
                <ProfileCard />
                <StreakCard />
                <GoalCard />
                <QuestsCard />
              </div>
            </aside>
          )}
        </div>

        {/* Mobile bottom nav: 4 main tabs + More */}
        {!focus && (
          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-line bg-surface px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),6px)] md:hidden"
          >
            {NAV.filter((n) => MOBILE_NAV.includes(n.to)).map(({ to, label, icon: Icon, tone }) => (
              <NavLink key={to} to={to} end={to === '/'} className="relative flex min-h-12 flex-1 flex-col items-center gap-0.5 text-[11px] font-extrabold">
                {({ isActive }) => (
                  <TabIcon icon={Icon} label={label} active={isActive} tone={tone} badge={to === '/review' ? due : 0} />
                )}
              </NavLink>
            ))}
            <button onClick={() => setMoreOpen(true)} className="relative flex min-h-12 flex-1 flex-col items-center gap-0.5 text-[11px] font-extrabold" aria-haspopup="dialog">
              <TabIcon icon={LayoutGrid} label="More" active={moreActive} tone="grape" />
            </button>
          </nav>
        )}
      </div>

      <QuickAddModal />
      <MoreSheet />
      <GlossarySheet />
      <Celebrations />
    </div>
  )
}

function TabIcon({ icon: Icon, label, active, tone, badge = 0 }: { icon: LucideIcon; label: string; active: boolean; tone: Tone; badge?: number }) {
  return (
    <>
      <motion.span
        whileTap={{ scale: 0.85 }}
        animate={active ? { y: -2 } : { y: 0 }}
        className={clsx('grid h-10 w-14 place-items-center rounded-2xl', active ? TONE[tone].tileActive : 'text-muted')}
      >
        <Icon size={22} strokeWidth={2.6} />
      </motion.span>
      <span className={active ? 'text-ink' : 'text-muted'}>{label}</span>
      {badge > 0 && (
        <span className="absolute top-0 right-[calc(50%-26px)] rounded-full border-2 border-surface bg-danger px-1.5 text-[10px] font-extrabold text-white">{badge}</span>
      )}
    </>
  )
}
