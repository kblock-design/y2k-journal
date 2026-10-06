import { ErrorBoundary as CoreErrorBoundary } from '../../core/ErrorBoundary'
import { errorMessage } from '../../core/format'
import { TAB_LABELS, useAppController } from '../../core/useAppController'
import { useAppData } from '../../core/useAppData'
import type { AppData } from '../../core/useAppData'
import { AlarmPrompt } from './AlarmPrompt'
import { CalendarScreen } from './CalendarScreen'
import { CheckinModal } from './CheckinModal'
import { Brand, Desktop } from './Desktop'
import { DevGallery } from './DevGallery'
import { PixelIcon } from './PixelIcon'
import { ErrorBoundary, ErrorState } from './ErrorBoundary'
import { HomeScreen } from './HomeScreen'
import { SettingsScreen } from './SettingsScreen'
import { StatsScreen } from './StatsScreen'
import { TabBar } from './TabBar'

/** The Y2K skin's root: a chrome desktop of Win95-style windows over a sticker collage. */
export function Y2kApp() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('gallery')) {
    return <DevGallery />
  }
  return (
    <ErrorBoundary layout="page">
      <AppLoader />
    </ErrorBoundary>
  )
}

function AppLoader() {
  const { state, reload } = useAppData()

  if (state.status === 'loading') {
    return (
      <div className="app app--loading">
        <div className="loading-dialog win win--pastel">
          <div className="win__titlebar">
            <span className="win__title" aria-hidden="true">
              burnbook.exe
            </span>
          </div>
          <div className="win__body">
            <p className="loading">Loading…</p>
            <div className="progress" aria-hidden="true">
              <span className="progress__fill" />
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="app app--error">
        <ErrorState
          title="Couldn't open your data"
          message={errorMessage(state.error)}
          onRetry={() => void reload()}
        />
      </div>
    )
  }
  return <ReadyApp data={state.data} reload={reload} />
}

interface ReadyProps {
  data: AppData
  reload: () => Promise<void>
}

function ReadyApp({ data, reload }: ReadyProps) {
  const app = useAppController(data, reload)
  const { settings, logs, pets, currentPet, today, now, tab, setTab, checkin, openCheckin } = app

  let screen
  switch (tab) {
    case 'home':
      screen = (
        <HomeScreen
          settings={settings}
          logs={logs}
          pets={pets}
          currentPet={currentPet}
          petStatus={app.petStatus}
          today={today}
          todayLogged={app.todayLogged}
          onCheckin={() => openCheckin(today)}
          onHatch={app.hatchPet}
          onOpenSettings={() => setTab('settings')}
        />
      )
      break
    case 'calendar':
      screen = <CalendarScreen logs={logs} settings={settings} today={today} now={now} onEdit={openCheckin} />
      break
    case 'stats':
      screen = (
        <StatsScreen logs={logs} settings={settings} today={today} onOpenSettings={() => setTab('settings')} />
      )
      break
    case 'settings':
      screen = <SettingsScreen settings={settings} pets={pets} today={today} onChanged={reload} />
      break
  }

  return (
    <div className={`app app--${tab}`}>
      {/* Everything behind an open check-in is inert so it can't be tapped or focused. */}
      <div className="app__content" inert={checkin !== null}>
        <Desktop scene={tab} />
        <Brand />
        {app.outsideHomeScreen && (
          <p className="banner" role="alert">
            <PixelIcon name="error" className="banner__icon" />
            <span>
              You’re in Safari. Anything logged here is kept separately from the Home Screen app, so
              open the tracker from its Home Screen icon instead.
            </span>
          </p>
        )}
        <main className="app__main">
          <ErrorBoundary key={tab} label={TAB_LABELS[tab]}>
            {screen}
          </ErrorBoundary>
        </main>
        <TabBar tab={tab} onChange={setTab} />
        {app.alarmPrompt && (
          // A broken prompt just disappears: it's optional and must never block the app.
          <CoreErrorBoundary label="Phone prompt" fallback={() => null}>
            <AlarmPrompt key={app.alarmPrompt.date} date={app.alarmPrompt.date} onDismiss={app.dismissAlarmPrompt} />
          </CoreErrorBoundary>
        )}
      </div>
      {checkin && (
        <ErrorBoundary key={checkin.date} label="Check-in" layout="overlay">
          <CheckinModal
            date={checkin.date}
            today={today}
            blocking={checkin.blocking}
            moodTracking={settings.moodTracking}
            onClose={app.closeCheckin}
            onSaved={app.onCheckinSaved}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}
