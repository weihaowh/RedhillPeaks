import { lazy, Suspense, useEffect } from 'react'
import { useDesignStore } from './store/useDesignStore'
import { duplicateItem, removeItem, rotateItem } from './features/furniture/itemActions'
import { usePresetStore } from './store/usePresetStore'
import { usePresetUi } from './features/presets/presetUi'
import { SavePresetDialog } from './features/presets/SavePresetDialog'
import { usePlanStore } from './store/usePlanStore'
import { useAppStore } from './store/useAppStore'
import { TopBar } from './components/TopBar'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { ViewControls } from './components/ViewControls'
import { PlanView } from './features/floorplan/PlanView'

const Scene3D = lazy(() => import('./features/scene/Scene3D'))
const CompareView = lazy(() => import('./features/presets/CompareView').then((m) => ({ default: m.CompareView })))

export default function App() {
  const mode = useAppStore((s) => s.mode)
  const theme = useAppStore((s) => s.theme)
  const plan = usePlanStore((s) => s.plan)

  const compare = usePresetUi((s) => s.compare)
  const closeCompare = usePresetUi((s) => s.closeCompare)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    usePresetStore.getState().load()
    // Ctrl+S saves a preset from anywhere instead of the browser's "save page".
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        usePresetUi.getState().openSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Design shortcuts in the 3D views; the plan editor handles its own while in 2D.
  useEffect(() => {
    if (mode === 'plan') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return
      const design = useDesignStore.getState()
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) design.redo()
        else design.undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        design.redo()
      } else if (e.key === 'Escape') {
        const app = useAppStore.getState()
        if (app.featurePick) app.setFeaturePick(null)
        else if (app.mode === 'walk') app.setMode('orbit')
        else app.selectItem(null)
      } else if (useAppStore.getState().mode !== 'walk') {
        // Furniture shortcuts; in the walkthrough these letters steer instead.
        const id = useAppStore.getState().selectedItemId
        if (!id) return
        if (e.key === 'Delete' || e.key === 'Backspace') removeItem(id)
        else if (mod && e.key.toLowerCase() === 'd') duplicateItem(id)
        else if (!mod && e.key.toLowerCase() === 'q') rotateItem(id, -15)
        else if (!mod && e.key.toLowerCase() === 'e') rotateItem(id, 15)
        else return
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <main className="absolute inset-0">
        {mode === 'plan' ? (
          <PlanView plan={plan} />
        ) : (
          <Suspense fallback={<Loading />}>
            <Scene3D plan={plan} />
          </Suspense>
        )}
      </main>

      <TopBar plan={plan} />
      <LeftPanel plan={plan} />
      <RightPanel plan={plan} />
      <ViewControls />
      <SavePresetDialog />
      {compare && (
        <Suspense fallback={null}>
          <CompareView sides={compare} onClose={closeCompare} />
        </Suspense>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      <span className="animate-pulse">Preparing 3D view…</span>
    </div>
  )
}
