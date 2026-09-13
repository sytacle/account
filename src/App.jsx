import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import AccountPage from './pages/AccountPage'
import SectionPage from './pages/SectionPage'
import LoginPage from './pages/LoginPage'
import AuthorizePage from './pages/AuthorizePage'
import { navItems } from './data/account'

function AccountLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const active = location.pathname.split('/')[2] || 'account'
  const current = navItems.find((item) => item.id === active)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header onMenu={() => setMenuOpen(true)} />
      <div className="mx-auto flex max-w-[1440px]">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Sytacle</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{active === 'account' ? 'Account' : current?.label || 'Account'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Manage your information, security, and preferences across Sytacle.</p>
            </div>
            {active === 'account' ? <AccountPage /> : <SectionPage type={active} />}
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
  )
}
