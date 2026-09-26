import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { db } from '../../db/db'
import { useProfile } from '../../db/hooks'
import { addDays, dayKey, weekKey } from '../../lib/dates'
import { titleForLevel } from '../../lib/gamify'
import { Cappy } from '../../components/mascot/Cappy'
import { pick } from '../../components/mascot/lines'
import { Avatar } from '../avatar/Avatar'
import { ACCESSORIES } from '../avatar/parts'
import { useFx } from './fx'

const KIND_STYLE: Record<string, string> = {
  xp: 'bg-gold text-on-color border-gold-edge',
  level: 'bg-grape text-white border-grape-edge',
  streak: 'bg-coral text-white border-coral-edge',
  goal: 'bg-brand text-on-color border-brand-edge',
  info: 'bg-surface text-ink border-line',
  error: 'bg-danger text-white border-danger-edge',
}

export function Toasts() {
  const toasts = useFx((s) => s.toasts)
  const dismiss = useFx((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[60] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.9 }}
            transition={{ type: 'spring', damping: 16, stiffness: 320 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto rounded-full border-2 border-b-4 px-5 py-2 text-center shadow-lg ${KIND_STYLE[t.kind]}`}
          >
            <div className="font-display text-[15px] font-bold">{t.title}</div>
            {t.body && <div className="text-xs font-bold opacity-85">{t.body}</div>}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function LevelUpModal() {
  const lv = useFx((s) => s.levelUp)
  const close = useFx((s) => s.closeLevelUp)
  const profile = useProfile()
  const unlocked = ACCESSORIES.filter((a) => lv?.unlocks.includes(a.id))
  return (
    <AnimatePresence>
      {lv && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="card w-full max-w-sm p-7 text-center shadow-2xl"
            initial={{ scale: 0.6, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto w-fit">
              <Cappy mood="cheer" size={130} />
              <motion.div
                className="absolute -right-6 -bottom-1 grid h-14 w-14 place-items-center rounded-full border-4 border-surface bg-grape font-display text-2xl font-bold text-white shadow-[0_4px_0_var(--grape-edge)]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', damping: 8 }}
              >
                {lv.level}
              </motion.div>
            </div>
            <p className="mt-4 text-xs font-extrabold tracking-[0.2em] text-grape-ink uppercase">Level up!</p>
            <h2 className="mt-1 font-display text-3xl font-bold">{titleForLevel(lv.level)}</h2>
            <p className="mt-2 text-sm text-muted">{pick('levelUp')}</p>
            {unlocked.length > 0 && (
              <div className="mt-5 rounded-2xl bg-gold-soft p-4">
                <p className="text-xs font-extrabold tracking-wide text-gold-ink uppercase">
                  New avatar {unlocked.length > 1 ? 'items' : 'item'} unlocked!
                </p>
                <div className="mt-3 flex justify-center gap-3">
                  {unlocked.map((a) => (
                    <div key={a.id} className="text-center">
                      <Avatar size={60} config={{ ...profile.avatar, accessory: a.id }} />
                      <div className="mt-1 text-xs font-extrabold">{a.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className="btn-primary mt-6 w-full py-3.5" onClick={close}>
              Keep going
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function StreakSheet() {
  const streak = useFx((s) => s.streak)
  const close = useFx((s) => s.closeStreak)
  const today = dayKey()
  const monday = weekKey(today)
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const active =
    useLiveQuery(async () => {
      const rows = await db.activity.bulkGet(Array.from({ length: 7 }, (_, i) => addDays(monday, i)))
      return rows.map((r) => (r?.xp ?? 0) > 0)
    }, [monday]) ?? []

  return (
    <AnimatePresence>
      {streak !== null && (
        <motion.div
          className="fixed inset-0 z-[65] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="card w-full max-w-sm p-7 text-center shadow-2xl"
            initial={{ y: 60, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto text-[96px] leading-none"
              animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              🔥
            </motion.div>
            <motion.div
              className="mt-2 font-display text-6xl font-bold text-coral-ink"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 9 }}
            >
              {streak}
            </motion.div>
            <p className="font-display text-xl font-bold">day streak!</p>
            <p className="mt-1 text-sm text-muted">
              {streak === 1 ? 'Day one of a great habit. Cappy believes in you.' : 'You showed up again. That is how wealth is built.'}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {week.map((d, i) => {
                const on = active[i] || d === today
                return (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-extrabold text-muted">{DOW[i]}</span>
                    <motion.span
                      className={`grid h-8 w-8 place-items-center rounded-full text-sm ${on ? 'bg-coral text-white shadow-[0_3px_0_var(--coral-edge)]' : 'bg-surface-2 text-muted'}`}
                      initial={d === today ? { scale: 0 } : false}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring', damping: 8 }}
                    >
                      {on ? '✓' : ''}
                    </motion.span>
                  </div>
                )
              })}
            </div>
            <button className="btn-coral mt-6 w-full py-3.5" onClick={close}>
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Every overlay effect in one place, so any screen can mount them. */
export function Celebrations() {
  return (
    <>
      <Toasts />
      <StreakSheet />
      <LevelUpModal />
    </>
  )
}
