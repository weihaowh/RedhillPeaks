import { lazy, Suspense, useEffect } from 'react'
import { redhillPeaks } from './data/redhillPeaks'
import { useAppStore } from './store/useAppStore'
import { TopBar } from './components/TopBar'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { ViewControls } from './components/ViewControls'
import { PlanView } from './features/floorplan/PlanView'

const Scene3D = lazy(() => import('./features/scene/Scene3D'))

export default function App() {
  const mode = useAppStore((s) => s.mode)
  const theme = useAppStore((s) => s.theme)
  const plan = redhillPeaks

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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
