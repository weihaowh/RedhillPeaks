import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'plan' | 'orbit' | 'walk'
export type Theme = 'light' | 'dark'
export type LeftTab = 'rooms' | 'library' | 'presets'
export type WallMode = 'full' | 'cutaway'
export type Quality = 'draft' | 'high'

interface AppState {
  mode: ViewMode
  theme: Theme
  leftTab: LeftTab
  leftOpen: boolean
  selectedRoomId: string | null
  hoveredRoomId: string | null
  /** Per-room floor finish overrides; rooms without one use their kind's default. */
  floorFinish: Record<string, string>
  wallPaint: string
  showStructural: boolean
  showLabels: boolean
  wallMode: WallMode
  quality: Quality
  underlayOpacity: number
  /** Bumped to ask the active view to re-frame the whole flat. */
  viewResetNonce: number

  setMode: (mode: ViewMode) => void
  toggleTheme: () => void
  setLeftTab: (tab: LeftTab) => void
  setLeftOpen: (open: boolean) => void
  selectRoom: (id: string | null) => void
  setHoveredRoom: (id: string | null) => void
  setFloorFinish: (roomId: string, finishId: string) => void
  setWallPaint: (hex: string) => void
  toggleStructural: () => void
  toggleLabels: () => void
  setWallMode: (mode: WallMode) => void
  setQuality: (quality: Quality) => void
  setUnderlayOpacity: (value: number) => void
  resetView: () => void
}

const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'orbit',
      theme: prefersDark ? 'dark' : 'light',
      leftTab: 'rooms',
      leftOpen: typeof window === 'undefined' || window.innerWidth >= 768,
      selectedRoomId: null,
      hoveredRoomId: null,
      floorFinish: {},
      wallPaint: '#f4f1ea',
      showStructural: false,
      showLabels: true,
      wallMode: 'full',
      quality: 'high',
      underlayOpacity: 0.55,
      viewResetNonce: 0,

      setMode: (mode) => set({ mode }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setLeftTab: (leftTab) => set({ leftTab, leftOpen: true }),
      setLeftOpen: (leftOpen) => set({ leftOpen }),
      selectRoom: (selectedRoomId) => set({ selectedRoomId }),
      setHoveredRoom: (hoveredRoomId) => set({ hoveredRoomId }),
      setFloorFinish: (roomId, finishId) => set((s) => ({ floorFinish: { ...s.floorFinish, [roomId]: finishId } })),
      setWallPaint: (wallPaint) => set({ wallPaint }),
      toggleStructural: () => set((s) => ({ showStructural: !s.showStructural })),
      toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
      setWallMode: (wallMode) => set({ wallMode }),
      setQuality: (quality) => set({ quality }),
      setUnderlayOpacity: (underlayOpacity) => set({ underlayOpacity }),
      resetView: () => set((s) => ({ selectedRoomId: null, viewResetNonce: s.viewResetNonce + 1 })),
    }),
    {
      name: 'redhill-peaks-studio',
      partialize: (s) => ({
        theme: s.theme,
        floorFinish: s.floorFinish,
        wallPaint: s.wallPaint,
        showLabels: s.showLabels,
        wallMode: s.wallMode,
        quality: s.quality,
        underlayOpacity: s.underlayOpacity,
      }),
    },
  ),
)
