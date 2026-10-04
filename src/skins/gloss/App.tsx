import { useEffect } from 'react'
import { ErrorBoundary } from '../../core/ErrorBoundary'
import { errorMessage } from '../../core/format'
import { TAB_LABELS, useAppController } from '../../core/useAppController'
import type { AppController } from '../../core/useAppController'
import { useAppData } from '../../core/useAppData'
import type { AppData } from '../../core/useAppData'
import { CalendarScreen } from './CalendarScreen'
import { CheckinSheet, SheetFrame } from './CheckinSheet'
import { HomeScreen } from './HomeScreen'
import { Icon } from './icons'
import { Nav } from './Nav'
import { SettingsScreen } from './SettingsScreen'
import { StatsScreen } from './StatsScreen'
import { PageMessage, SectionError, Wordmark } from './ui'

/** Root of the Gloss skin. */
export function GlossApp() {
  return (
    <ErrorBoundary
      label="Gloss"
      fallback={(e, retry) => (
        <PageMessage title="Something went wrong" message={errorMessage(e)}>
          <button type="button" className="gl-gel" onClick={retry}>
            Try again
          </button>
          <button type="button" className="gl-btn gl-btn--chrome" onClick={() => window.location.reload()}>
            Reload
          </button>
        </PageMessage>
      )}
    >
      <Loader />
    </ErrorBoundary>
  )
}

function Loader() {
  const { state, reload } = useAppData()
  if (state.status === 'loading') {
    return (
      <div className="gl-loading" role="status" aria-live="polite">
        <Wordmark />
        <span className="gl-loading__bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        <span className="gl-kicker">Loading…</span>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <PageMessage title="Couldn’t open your data" message={errorMessage(state.error)}>
        <button type="button" className="gl-gel" onClick={() => void reload()}>
          Try again
        </button>
      </PageMessage>
    )
  }
  return <Ready data={state.data} reload={reload} />
}

function Ready({ data, reload }: { data: AppData; reload: () => Promise<void> }) {
  const app = useAppController(data, reload)
  const { tab, setTab, checkin, today } = app

  // A new tab starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  return (
    <>
      <div className={`gl-app gl-app--${tab}`} inert={checkin !== null}>
        <main className="gl-main">
          {app.outsideHomeScreen && <SafariBanner />}
          <ErrorBoundary
            key={tab}
            label={TAB_LABELS[tab]}
            fallback={(e, retry) => <SectionError title={`${TAB_LABELS[tab]} didn’t load`} error={e} onRetry={retry} />}
          >
            <Screen app={app} />
          </ErrorBoundary>
        </main>
        <Nav tab={tab} onChange={setTab} todayLogged={app.todayLogged} onCheckin={() => app.openCheckin(today)} />
      </div>
      {checkin && (
        <ErrorBoundary
          key={checkin.date}
          label="Check-in"
          fallback={(e, retry) => (
            <SheetFrame title="Check-in didn’t load" onClose={checkin.blocking ? undefined : app.closeCheckin}>
              <div className="gl-inline-error" role="alert">
                <p>{errorMessage(e)}</p>
                <button type="button" className="gl-btn gl-btn--chrome gl-btn--sm" onClick={retry}>
                  Try again
                </button>
              </div>
            </SheetFrame>
          )}
        >
          <CheckinSheet
            key={checkin.date}
            date={checkin.date}
            today={today}
            blocking={checkin.blocking}
            moodTracking={app.settings.moodTracking}
            onClose={app.closeCheckin}
            onSaved={app.onCheckinSaved}
          />
        </ErrorBoundary>
      )}
    </>
  )
}

function Screen({ app }: { app: AppController }) {
  const { settings, logs, today, now } = app
  switch (app.tab) {
    case 'home':
      return (
        <HomeScreen
          logs={logs}
          settings={settings}
          today={today}
          todayLogged={app.todayLogged}
          noLogsYet={app.noLogsYet}
          onCheckin={() => app.openCheckin(today)}
          onOpenSettings={() => app.setTab('settings')}
        />
      )
    case 'calendar':
      return <CalendarScreen logs={logs} settings={settings} today={today} now={now} onOpenDay={app.openCheckin} />
    case 'stats':
      return <StatsScreen logs={logs} settings={settings} today={today} onOpenSettings={() => app.setTab('settings')} />
    case 'settings':
      return <SettingsScreen settings={settings} pets={app.pets} today={today} onChanged={app.reload} />
  }
}

function SafariBanner() {
  return (
    <p className="gl-banner" role="alert">
      <Icon name="alert" size={20} />
      <span>
        You’re in Safari. Anything logged here is kept apart from the Home Screen app, so open Gloss from its Home Screen
        icon instead.
      </span>
    </p>
  )
}
