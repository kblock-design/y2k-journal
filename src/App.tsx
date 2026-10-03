import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hatchPet, markPetDead } from './db'
import { checkinDue } from './logic/checkin'
import { toISODate } from './logic/dates'
import { petStatus } from './logic/pet'
import type { ISODate } from './types'
import { CalendarScreen } from './ui/CalendarScreen'
import { CheckinModal } from './ui/CheckinModal'
import { ErrorBoundary, ErrorState } from './ui/ErrorBoundary'
import { errorMessage } from './ui/format'
import { HomeScreen } from './ui/HomeScreen'
import { openedOutsideHomeScreen } from './ui/reminders'
import { SettingsScreen } from './ui/SettingsScreen'
import { TabBar } from './ui/TabBar'
import type { Tab } from './ui/TabBar'
import { useAppData } from './ui/useAppData'
import type { AppData } from './ui/useAppData'

const TAB_LABELS: Record<Tab, string> = { home: 'Home', calendar: 'Calendar', settings: 'Settings' }

export default function App() {
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
        <p className="loading">Loading…</p>
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

function hasCheckinDeepLink(): boolean {
  return new URLSearchParams(window.location.search).get('checkin') === '1'
}

function stripCheckinDeepLink() {
  if (!hasCheckinDeepLink()) return
  const params = new URLSearchParams(window.location.search)
  params.delete('checkin')
  const query = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  )
}

interface ReadyProps {
  data: AppData
  reload: () => Promise<void>
}

function ReadyApp({ data, reload }: ReadyProps) {
  const { settings, logs, pets, currentPet } = data

  // `now` drives everything time-based. Re-evaluated every minute and whenever the app
  // comes back to the foreground (iOS freezes timers in the background).
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        tick()
        void reload()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  const today = toISODate(now)
  const loggedDates = useMemo(() => new Set(logs.map((l) => l.date)), [logs])
  const due = useMemo(() => checkinDue(loggedDates, now, settings), [loggedDates, now, settings])
  const pet = useMemo(
    () => (currentPet ? petStatus(currentPet, loggedDates, today) : null),
    [currentPet, loggedDates, today],
  )

  // Persist a death the logic has detected.
  const markingDead = useRef<number | null>(null)
  useEffect(() => {
    if (!currentPet || !pet || pet.health !== 'dead' || currentPet.diedOn) return
    if (markingDead.current === currentPet.id) return
    markingDead.current = currentPet.id
    markPetDead(currentPet.id, pet.diedOn ?? today)
      .then(reload)
      .catch((err: unknown) => {
        markingDead.current = null
        console.error('Failed to record pet death', err)
      })
  }, [currentPet, pet, today, reload])

  const [tab, setTab] = useState<Tab>('home')
  /**
   * A check-in the user opened themselves (dismissable unless it is also due).
   * Starts as today's when launched from a reminder deep link (?checkin=1) and today isn't logged.
   */
  const [manualCheckin, setManualCheckin] = useState<ISODate | null>(() =>
    hasCheckinDeepLink() && !loggedDates.has(today) ? today : null,
  )
  // The deep link is one-shot: strip it so a reload doesn't reopen the check-in.
  useEffect(stripCheckinDeepLink, [])

  // Blocking check-in: missed yesterday first, then today once the reminder time has passed.
  // Not on first run, so the very first thing is always hatching (or importing a backup).
  const firstRun = pets.length === 0
  const blockingDate = firstRun ? null : (due.backfill ?? (due.todayDue ? today : null))
  const checkinDate = blockingDate ?? manualCheckin
  const checkinBlocking = blockingDate !== null

  // The modal stays in its "saving" state until fresh data is loaded, so the due state is
  // recomputed from the new logs before it closes (or moves on to today's check-in).
  const onCheckinSaved = useCallback(async () => {
    await reload()
    setManualCheckin(null)
    setNow(new Date())
  }, [reload])

  const onHatch = useCallback(
    async (name: string) => {
      await hatchPet(name, today)
      await reload()
    },
    [today, reload],
  )

  const modalOpen = checkinDate !== null

  let screen
  switch (tab) {
    case 'home':
      screen = (
        <HomeScreen
          settings={settings}
          logs={logs}
          pets={pets}
          currentPet={currentPet}
          petStatus={pet}
          today={today}
          todayLogged={due.todayLogged}
          onCheckin={() => setManualCheckin(today)}
          onHatch={onHatch}
          onOpenSettings={() => setTab('settings')}
        />
      )
      break
    case 'calendar':
      screen = (
        <CalendarScreen logs={logs} settings={settings} today={today} now={now} onEdit={setManualCheckin} />
      )
      break
    case 'settings':
      screen = <SettingsScreen settings={settings} pets={pets} today={today} onChanged={reload} />
      break
  }

  return (
    <div className={`app app--${tab}`}>
      {/* Everything behind an open check-in is inert so it can't be tapped or focused. */}
      <div className="app__content" inert={modalOpen}>
        {openedOutsideHomeScreen() && (
          <p className="banner" role="alert">
            You’re in Safari. Anything logged here is kept separately from the Home Screen app, so
            open the tracker from its Home Screen icon instead.
          </p>
        )}
        <main className="app__main">
          <ErrorBoundary key={tab} label={TAB_LABELS[tab]}>
            {screen}
          </ErrorBoundary>
        </main>
        <TabBar tab={tab} onChange={setTab} />
      </div>
      {checkinDate && (
        <ErrorBoundary key={checkinDate} label="Check-in" layout="overlay">
          <CheckinModal
            date={checkinDate}
            today={today}
            blocking={checkinBlocking}
            onClose={() => setManualCheckin(null)}
            onSaved={onCheckinSaved}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}
