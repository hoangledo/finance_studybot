import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { db } from './db/db'
import { ensureSeeded } from './db/seed'
import { Layout } from './app/Layout'
import { HomePage } from './features/home/HomePage'
import { PathPage } from './features/path/PathPage'
import { ReviewPage } from './features/review/ReviewPage'
import { LibraryPage } from './features/library/LibraryPage'
import { ConceptPage } from './features/library/ConceptPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { ProfilePage } from './features/profile/ProfilePage'

const LessonPlayer = lazy(() => import('./features/path/LessonPlayer').then((m) => ({ default: m.LessonPlayer })))
const MapPage = lazy(() => import('./features/map/MapPage').then((m) => ({ default: m.MapPage })))
const StatsPage = lazy(() => import('./features/stats/StatsPage').then((m) => ({ default: m.StatsPage })))
const ToolsPage = lazy(() => import('./features/widgets/ToolsPage').then((m) => ({ default: m.ToolsPage })))
const Spinner = () => (
  <div className="grid h-full min-h-60 place-items-center">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
  </div>
)
const page = (el: ReactNode) => <Suspense fallback={<Spinner />}>{el}</Suspense>

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/path', element: <PathPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/map', element: page(<MapPage />) },
      { path: '/library', element: <LibraryPage /> },
      { path: '/concept/:id', element: <ConceptPage /> },
      { path: '/tools', element: page(<ToolsPage />) },
      { path: '/stats', element: page(<StatsPage />) },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },
  { path: '/lesson/:id', element: page(<LessonPlayer />) },
])

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded(db)
      .then(() => setReady(true))
      .catch((e) => setError(String(e)))
  }, [])

  if (error)
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="font-display text-xl font-semibold">Couldn't open local storage</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
        </div>
      </div>
    )
  if (!ready)
    return (
      <div className="grid h-full place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    )
  return <RouterProvider router={router} />
}
