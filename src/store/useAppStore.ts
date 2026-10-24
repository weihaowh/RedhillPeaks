import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FeatureSpec } from '../types/design'
import type { SunSettings } from '../lib/sun'

export type ViewMode = 'plan' | 'orbit' | 'walk'
export type Theme = 'light' | 'dark'
export type LeftTab = 'rooms' | 'library' | 'layouts' | 'presets' | 'electrical'
export type WallMode = 'full' | 'cutaway'
export type Quality = 'draft' | 'high' | 'ultra'
export type LightsMode = 'auto' | 'on' | 'off'
export type ReportTab = 'budget' | 'list' | 'electrical' | 'hdb' | 'boards'

interface AppState {
  mode: ViewMode
  theme: Theme
  leftTab: LeftTab
  leftOpen: boolean
  selectedRoomId: string | null
  selectedWallId: string | null
  /** Selected door/window, with the wall it sits in. */
  selectedOpening: { wallId: string; openingId: string } | null
  selectedItemId: string | null
  selectedFixtureId: string | null
  /** Show electrical symbols on the 2D plan and points in 3D. */
  showElectrical: boolean
  /** True while a furniture item is being dragged, so the camera stays put. */
  draggingItem: boolean
  hoveredRoomId: string | null
  /** While set, clicking a wall face in 3D applies this feature finish to it. */
  featurePick: FeatureSpec | null
  showStructural: boolean
  showLabels: boolean
  wallMode: WallMode
  quality: Quality
  underlayOpacity: number
  /** Bumped to ask the active view to re-frame the whole flat. */
  viewResetNonce: number
  sun: SunSettings
  /** Ceiling lights: 'auto' switches them on around sunset. */
  lights: LightsMode
  /** Walkthrough: a plan point to walk to (set by clicking the floor). */
  walkTarget: { point: [number, number]; nonce: number } | null
  /** Renovation budget in SGD. */
  budget: number
  /** Open tab of the project report overlay, if showing. */
  report: ReportTab | null

  setMode: (mode: ViewMode) => void
  toggleTheme: () => void
  setLeftTab: (tab: LeftTab) => void
  setLeftOpen: (open: boolean) => void
  selectRoom: (id: string | null) => void
  selectWall: (id: string | null) => void
  selectOpening: (sel: { wallId: string; openingId: string } | null) => void
  selectItem: (id: string | null) => void
  selectFixture: (id: string | null) => void
  toggleElectrical: () => void
  setDraggingItem: (dragging: boolean) => void
  clearSelection: () => void
  setHoveredRoom: (id: string | null) => void
  setFeaturePick: (spec: FeatureSpec | null) => void
  toggleStructural: () => void
  toggleLabels: () => void
  setWallMode: (mode: WallMode) => void
  setQuality: (quality: Quality) => void
  setUnderlayOpacity: (value: number) => void
  resetView: () => void
  setSun: (patch: Partial<SunSettings>) => void
  setLights: (mode: LightsMode) => void
  walkTo: (point: [number, number]) => void
  setBudget: (sgd: number) => void
  openReport: (tab: ReportTab | null) => void
}

const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
// Phones and low-core machines start on Draft; everyone can change it.
const lowEnd =
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4)

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'orbit',
      theme: prefersDark ? 'dark' : 'light',
      leftTab: 'rooms',
      leftOpen: typeof window === 'undefined' || window.innerWidth >= 768,
      selectedRoomId: null,
      selectedWallId: null,
      selectedOpening: null,
      selectedItemId: null,
      selectedFixtureId: null,
      showElectrical: true,
      draggingItem: false,
      hoveredRoomId: null,
      featurePick: null,
      showStructural: false,
      showLabels: true,
      wallMode: 'full',
      quality: lowEnd ? 'draft' : 'high',
      underlayOpacity: 0.55,
      viewResetNonce: 0,
      sun: { hour: 15, date: 'today', north: 0 },
      lights: 'auto',
      walkTarget: null,
      budget: 60000,
      report: null,

      setMode: (mode) => set({ mode, featurePick: null }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setLeftTab: (leftTab) => set({ leftTab, leftOpen: true }),
      setLeftOpen: (leftOpen) => set({ leftOpen }),
      selectRoom: (selectedRoomId) => set({ selectedRoomId, selectedWallId: null, selectedOpening: null, selectedItemId: null, selectedFixtureId: null }),
      selectWall: (selectedWallId) => set({ selectedWallId, selectedRoomId: null, selectedOpening: null, selectedItemId: null, selectedFixtureId: null }),
      selectOpening: (selectedOpening) => set({ selectedOpening, selectedRoomId: null, selectedWallId: null, selectedItemId: null, selectedFixtureId: null }),
      selectItem: (selectedItemId) => set({ selectedItemId, selectedRoomId: null, selectedWallId: null, selectedOpening: null, selectedFixtureId: null }),
      selectFixture: (selectedFixtureId) => set({ selectedFixtureId, selectedRoomId: null, selectedWallId: null, selectedOpening: null, selectedItemId: null }),
      toggleElectrical: () => set((s) => ({ showElectrical: !s.showElectrical })),
      setDraggingItem: (draggingItem) => set({ draggingItem }),
      clearSelection: () => set({ selectedRoomId: null, selectedWallId: null, selectedOpening: null, selectedItemId: null, selectedFixtureId: null }),
      setHoveredRoom: (hoveredRoomId) => set({ hoveredRoomId }),
      setFeaturePick: (featurePick) => set({ featurePick }),
      toggleStructural: () => set((s) => ({ showStructural: !s.showStructural })),
      toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
      setWallMode: (wallMode) => set({ wallMode }),
      setQuality: (quality) => set({ quality }),
      setUnderlayOpacity: (underlayOpacity) => set({ underlayOpacity }),
      setSun: (patch) => set((s) => ({ sun: { ...s.sun, ...patch } })),
      setLights: (lights) => set({ lights }),
      setBudget: (budget) => set({ budget }),
      openReport: (report) => set({ report }),
      walkTo: (point) => set((s) => ({ walkTarget: { point, nonce: (s.walkTarget?.nonce ?? 0) + 1 } })),
      resetView: () => set((s) => ({ selectedRoomId: null, selectedWallId: null, selectedOpening: null, selectedItemId: null, selectedFixtureId: null, viewResetNonce: s.viewResetNonce + 1 })),
    }),
    {
      name: 'redhill-peaks-studio',
      partialize: (s) => ({
        theme: s.theme,
        showLabels: s.showLabels,
        wallMode: s.wallMode,
        quality: s.quality,
        underlayOpacity: s.underlayOpacity,
        sun: s.sun,
        lights: s.lights,
        budget: s.budget,
        showElectrical: s.showElectrical,
      }),
    },
  ),
)
