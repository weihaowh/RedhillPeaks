import { createContext, useContext } from 'react'
import type { Design } from '../../types/design'
import { useDesignStore } from '../../store/useDesignStore'

// Lets a 3D view show a design other than the live one (e.g. a preset in the compare view).
// Without a provider, components read the live, editable design from the store.

interface DesignOverride {
  design: Design
  /** Display only: no selecting, dragging or hover effects. */
  readOnly: boolean
}

const DesignContext = createContext<DesignOverride | null>(null)

export const DesignProvider = DesignContext.Provider

export function useDesign<T>(select: (d: Design) => T): T {
  const override = useContext(DesignContext)
  const live = useDesignStore((s) => select(s.design))
  return override ? select(override.design) : live
}

export const useReadOnly = () => useContext(DesignContext)?.readOnly ?? false
