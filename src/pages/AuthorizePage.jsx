import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, ChevronRight, ShieldCheck, X } from 'lucide-react'
import Logo from '../components/Logo'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'

const scopeLabels = {
  openid: ['Verify your identity', 'Use your Sytacle Account to sign you in'],
  profile: ['Basic profile information', 'Name, profile photo, and username'],
  email: ['Email address', 'View the email address associated with your account'],
  account: ['Account information', 'Access account preferences and account status'],
}

function randomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function AuthorizePage() {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState('') // 'allow' | 'cancel'

  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const clientName = params.get('client_name') || 'Sytacle Application'
  const clientId = params.get('client_id') || 'sytacle-demo-client'
  const redirectUri = params.get('redirect_uri') || 'https://example.com/oauth/callback'
  const responseType = params.get('response_type') || 'code'
  const state = params.get('state') || ''
  const requestedScopes = (params.get('scope') || 'openid profile email').split(/\s+/).filter(Boolean)
  const scopes = requestedScopes.filter((scope) => scopeLabels[scope])

  async function handleChange() {
    await signOutUser()
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
    navigate(`/account/login?returnTo=${returnTo}`, { replace: true })
  }

  function handleAllow() {
    setBusy('allow')
    // No authorization server sits behind this UI, so this can't issue a
    // real, verifiable code — but it does perform the actual redirect a
    // browser-only demo can: an authorization code (or token, since we
    // don't have a backend to exchange a code for one) plus the original
    // state, sent back to the requesting app.
    const url = new URL(redirectUri)
    if (responseType === 'token') {
      url.hash = `access_token=${randomCode()}&token_type=bearer&state=${encodeURIComponent(state)}`
    } else {
      url.searchParams.set('code', randomCode())
      if (state) url.searchParams.set('state', state)
    }
    window.location.assign(url.toString())
  }

  function handleCancel() {
    setBusy('cancel')
    const url = new URL(redirectUri)
    url.searchParams.set('error', 'access_denied')
    if (state) url.searchParams.set('state', state)
    window.location.assign(url.toString())
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck size={16} /> Secure authorization</div>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[560px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-6 py-7 dark:border-slate-800 sm:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-semibold text-white">S</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">OAuth 2.0</p>
                  <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Authorize {clientName}</h1>
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">This application wants to use your Sytacle Account.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-blue-600 dark:text-blue-400"><ShieldCheck size={20} /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Signed in as {user?.displayName || user?.email}
                    </p>
                    {user?.displayName && (
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                    )}
                  </div>
                  <button type="button" onClick={handleChange} className="ml-auto shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    Change
                  </button>
                </div>
              </div>

              <h2 className="mt-7 text-sm font-semibold text-slate-900 dark:text-slate-100">This application will be able to:</h2>
              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {scopes.length ? scopes.map((scope) => (
                  <div key={scope} className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Check size={17} /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{scopeLabels[scope][0]}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{scopeLabels[scope][1]}</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto shrink-0 text-slate-300 dark:text-slate-600" />
                  </div>
                )) : (
                  <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No additional permissions were requested.</div>
                )}
              </div>

              <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-500/10">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">Only authorize applications you trust. Sytacle will never share your password with this application.</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={Boolean(busy)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {busy === 'cancel' ? <Spinner size={16} /> : <><X size={17} /> Cancel</>}
                </button>
                <button
                  type="button"
                  onClick={handleAllow}
                  disabled={Boolean(busy)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy === 'allow' ? <Spinner size={16} /> : <><Check size={17} /> Allow</>}
                </button>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                <p>Requesting application ID</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">{clientId}</p>
                <p className="mt-3">Redirect URI</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">{redirectUri}</p>
                <p className="mt-3">Response type: <span className="font-mono">{responseType}</span></p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-400 dark:text-slate-600">Sytacle OAuth authorization · Review permissions before continuing</p>
        </div>
      </main>
    </div>
  )
}
