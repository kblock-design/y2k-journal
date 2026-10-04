import { lazy, Suspense, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ErrorBoundary } from './core/ErrorBoundary'
import { errorMessage } from './core/format'
import { activeSkin, resetSkin } from './core/skin'
import { DEFAULT_SKIN } from './skins'

// Skin host. Picks the skin stored in `burn-book:skin` once, at startup, and loads only that
// skin's chunk (its components, CSS and fonts). Switching skins reloads the page (setSkin),
// so two skins' global CSS never share a document. Nothing here may depend on skin CSS:
// the loading and failure states below use inline styles only.

const skin = activeSkin()
// Each look carries its own name, so the title follows the active one.
if (typeof document !== 'undefined') document.title = skin.appName ?? skin.label
// Start fetching the skin as soon as this module runs, not when React first renders.
const skinModule = skin.load()
skinModule.catch(() => {}) // Failure is reported by the error boundary below.
const Skin = lazy(() => skinModule)

export default function App() {
  return (
    <ErrorBoundary label={`skin:${skin.key}`} fallback={(error) => <SkinFailed error={error} />}>
      <Suspense fallback={<SkinLoading />}>
        <Skin />
      </Suspense>
    </ErrorBoundary>
  )
}

const screen: CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: 'max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))',
  boxSizing: 'border-box',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 16,
  color: '#444',
  textAlign: 'center',
}

const button: CSSProperties = {
  minHeight: 44,
  padding: '0 20px',
  font: 'inherit',
  color: '#222',
  background: '#fff',
  border: '1px solid #999',
  borderRadius: 8,
}

/** Shown while the skin chunk loads (normally a few frames, from the offline cache). Text only appears if it's slow. */
function SkinLoading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 400)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div style={screen} role="status" aria-live="polite">
      {slow ? 'Loading…' : null}
    </div>
  )
}

/** The skin failed to load or crashed outside its own error handling. */
function SkinFailed({ error }: { error: unknown }) {
  const actions: ReactNode[] = [
    <button key="retry" type="button" style={button} onClick={() => window.location.reload()}>
      Try again
    </button>,
  ]
  if (skin.key !== DEFAULT_SKIN) {
    actions.push(
      <button key="reset" type="button" style={button} onClick={resetSkin}>
        Use the default theme
      </button>,
    )
  }
  return (
    <div style={screen} role="alert">
      <p style={{ margin: 0, fontWeight: 600 }}>Couldn't open the app</p>
      <p style={{ margin: 0 }}>{errorMessage(error)}</p>
      <p style={{ margin: 0 }}>Your data is safe on this device.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>{actions}</div>
    </div>
  )
}
