import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import { navItems } from './data/account'

// Route-level code splitting. Each page becomes its own chunk, fetched
// on first visit and cached by the browser after that. Only the shell
// (Header, Sidebar, ProtectedRoute, nav data) ships in the entry bundle.
const AccountPage   = lazy(() => import('./pages/AccountPage'))
const EditAccountPage = lazy(() => import('./pages/EditAccountPage'))
const SectionPage   = lazy(() => import('./pages/SectionPage'))
const LoginPage     = lazy(() => import('./pages/LoginPage'))
const AuthorizePage = lazy(() => import('./pages/AuthorizePage'))

function RouteFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

function AccountLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const active = location.pathname.split('/')[2] || 'account'
  const current = navItems.find((item) => item.id === active)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header onMenu={() => setMenuOpen(true)} />
      <div className="mx-auto flex max-w-360">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-6xl">
            {/*
              Inner Suspense boundary: keeps Header/Sidebar/chrome mounted
              while the account section chunk loads. Without this the outer
              boundary would blank the whole page on every section switch.
            */}
            <Suspense fallback={<RouteFallback />}>
              <div key={location.pathname} className="page-transition">
                {active === 'account' ? <AccountPage /> : active === 'edit' ? <EditAccountPage /> : <SectionPage type={active} />}
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

function NotFound() {
  return <Navigate to="/account/" replace />
}

export default function App() {
  return (
    // Outer boundary covers the top-level routes (login, oauth authorize)
    // that aren't wrapped by AccountLayout's inner boundary.
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/account/login" element={<LoginPage />} />
        <Route path="/signin" element={<Navigate to="/account/login" replace />} />
        <Route
          path="/oauth/authorize"
          element={
            <ProtectedRoute>
              <AuthorizePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/*"
          element={
            <ProtectedRoute>
              <AccountLayout />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/account/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}