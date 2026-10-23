import type { FurnitureItem } from '../../types/design'
import { useDesignStore } from '../../store/useDesignStore'
import { useAppStore } from '../../store/useAppStore'
import { createItem } from './catalog'

// Furniture edits, all through the design store so they undo with Ctrl+Z.

const edit = useDesignStore.getState().edit

export function addItem(type: string, x: number, y: number) {
  const item = createItem(type, x, y)
  edit((d) => ({ ...d, items: [...d.items, item] }))
  useAppStore.getState().selectItem(item.id)
  return item
}

export function updateItem(id: string, patch: Partial<FurnitureItem>, history = true) {
  useDesignStore.getState().edit((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }), { history })
}

export function removeItem(id: string) {
  edit((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }))
  if (useAppStore.getState().selectedItemId === id) useAppStore.getState().selectItem(null)
}

export function duplicateItem(id: string) {
  const source = useDesignStore.getState().design.items.find((it) => it.id === id)
  if (!source) return
  const copy = { ...createItem(source.type, source.x + 0.3, source.y + 0.3), ...source, id: createItem(source.type, 0, 0).id, x: source.x + 0.3, y: source.y + 0.3, locked: false }
  edit((d) => ({ ...d, items: [...d.items, copy] }))
  useAppStore.getState().selectItem(copy.id)
}

export function rotateItem(id: string, degrees: number) {
  const item = useDesignStore.getState().design.items.find((it) => it.id === id)
  if (!item || item.locked) return
  updateItem(id, { rotation: (((item.rotation + degrees) % 360) + 360) % 360 })
}

export const getItem = (id: string | null) => (id ? useDesignStore.getState().design.items.find((it) => it.id === id) : undefined)
