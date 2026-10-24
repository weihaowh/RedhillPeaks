import { create } from 'zustand'
import type { Vec2 } from '../types/plan'

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'room' | 'calibrate' | 'electrical'

interface EditorState {
  tool: Tool
  /** Points placed so far by the wall, room or calibrate tool. */
  draft: Vec2[]
  wallThickness: number
  doorWidth: number
  windowWidth: number
  /** Fixture placed by the electrical tool. */
  fixtureType: string
  setTool: (tool: Tool) => void
  setDraft: (draft: Vec2[]) => void
  setWallThickness: (v: number) => void
  setDoorWidth: (v: number) => void
  setWindowWidth: (v: number) => void
  /** Picks a fixture and switches to the electrical tool. */
  placeFixture: (type: string) => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  tool: 'select',
  draft: [],
  wallThickness: 0.1,
  doorWidth: 0.9,
  windowWidth: 1.2,
  fixtureType: 'socket-twin',
  setTool: (tool) => set({ tool, draft: [] }),
  setDraft: (draft) => set({ draft }),
  setWallThickness: (wallThickness) => set({ wallThickness }),
  setDoorWidth: (doorWidth) => set({ doorWidth }),
  setWindowWidth: (windowWidth) => set({ windowWidth }),
  placeFixture: (fixtureType) => set({ fixtureType, tool: 'electrical', draft: [] }),
}))
