import { create } from 'zustand'

/** Small cross-page UI state: the mobile "More" sheet, focus mode, and the money add sheet. */
interface UiState {
  moreOpen: boolean
  setMoreOpen: (v: boolean) => void
  /** Focus mode hides the header and bottom nav (e.g. during a review session). */
  focus: boolean
  setFocus: (v: boolean) => void
  addMoneyOpen: boolean
  setAddMoneyOpen: (v: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  moreOpen: false,
  setMoreOpen: (moreOpen) => set({ moreOpen }),
  focus: false,
  setFocus: (focus) => set({ focus }),
  addMoneyOpen: false,
  setAddMoneyOpen: (addMoneyOpen) => set({ addMoneyOpen }),
}))
