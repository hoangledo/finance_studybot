export type AnimalId = 'fox' | 'cat' | 'bear' | 'bunny' | 'frog' | 'panda'
export type AccessoryId =
  | 'none'
  | 'cap'
  | 'glasses'
  | 'bowtie'
  | 'beanie'
  | 'headphones'
  | 'sunglasses'
  | 'gradcap'
  | 'tophat'
  | 'crown'
  | 'party'
  | 'star'
  | 'halo'

export interface AvatarConfig {
  animal: AnimalId
  color: string // background color id
  accessory: AccessoryId
}

export const ANIMALS: { id: AnimalId; label: string }[] = [
  { id: 'fox', label: 'Fox' },
  { id: 'cat', label: 'Cat' },
  { id: 'bear', label: 'Bear' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'frog', label: 'Frog' },
  { id: 'panda', label: 'Panda' },
]

export const COLORS: { id: string; hex: string }[] = [
  { id: 'sky', hex: '#4cb8ff' },
  { id: 'mint', hex: '#1ed39a' },
  { id: 'sun', hex: '#ffc93c' },
  { id: 'coral', hex: '#ff7a45' },
  { id: 'grape', hex: '#9b7bff' },
  { id: 'pink', hex: '#ff8fc7' },
  { id: 'navy', hex: '#2e4a66' },
  { id: 'cream', hex: '#f3e6c8' },
]

export interface Accessory {
  id: AccessoryId
  label: string
  level?: number // unlocks at this level
  streak?: number // or at this best streak (days)
}

export const ACCESSORIES: Accessory[] = [
  { id: 'none', label: 'None', level: 1 },
  { id: 'cap', label: 'Cap', level: 2 },
  { id: 'glasses', label: 'Glasses', level: 3 },
  { id: 'bowtie', label: 'Bow tie', level: 4 },
  { id: 'beanie', label: 'Beanie', level: 5 },
  { id: 'headphones', label: 'Headphones', level: 7 },
  { id: 'sunglasses', label: 'Shades', level: 8 },
  { id: 'gradcap', label: 'Grad cap', level: 10 },
  { id: 'tophat', label: 'Top hat', level: 12 },
  { id: 'crown', label: 'Crown', level: 15 },
  { id: 'party', label: 'Party hat', streak: 7 },
  { id: 'star', label: 'Star clip', streak: 14 },
  { id: 'halo', label: 'Halo', streak: 30 },
]

export const DEFAULT_AVATAR: AvatarConfig = { animal: 'fox', color: 'sky', accessory: 'none' }

export function colorHex(id: string) {
  return COLORS.find((c) => c.id === id)?.hex ?? COLORS[0].hex
}

export function isUnlocked(a: Accessory, level: number, bestStreak: number) {
  if (a.level !== undefined) return level >= a.level
  if (a.streak !== undefined) return bestStreak >= a.streak
  return true
}

export function unlockLabel(a: Accessory) {
  return a.level !== undefined ? `Lv ${a.level}` : `${a.streak}-day streak`
}

/** Level-gated accessories that unlock when going from `from` to `to` (exclusive → inclusive). */
export function unlocksBetween(from: number, to: number): Accessory[] {
  return ACCESSORIES.filter((a) => a.level !== undefined && a.level > from && a.level <= to)
}

/** Streak-gated accessories that unlock when the best streak goes from `from` to `to`. */
export function streakUnlocksBetween(from: number, to: number): Accessory[] {
  return ACCESSORIES.filter((a) => a.streak !== undefined && a.streak > from && a.streak <= to)
}
