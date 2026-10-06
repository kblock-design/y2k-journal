import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { hatchPet as dbHatchPet, markPetDead } from '../db'
import { checkinDue } from '../logic/checkin'
import type { CheckinDue } from '../logic/checkin'
import { toISODate } from '../logic/dates'
import { petStatus as computePetStatus } from '../logic/pet'
import type { PetStatus } from '../logic/pet'
import type { DayLog, ISODate, Pet, Settings } from '../types'
import { alarmPromptReducer, alarmShortcutPref, openedOutsideHomeScreen, useAlarmShortcut, visibleAlarmPrompt } from './reminders'
import type { AlarmPrompt } from './reminders'
import { activeSkin } from './skin'
import type { AppData } from './useAppData'

/** The four top-level screens. Every skin has all four, however it navigates between them. */
export type Tab = 'home' | 'calendar' | 'stats' | 'settings'

/** Tabs in navigation order, with their plain names. */
export const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'stats', label: 'Stats' },
  { id: 'settings', label: 'Settings' },
]

export const TAB_LABELS: Record<Tab, string> = { home: 'Home', calendar: 'Calendar', stats: 'Stats', settings: 'Settings' }

/** The check-in that should be on screen right now. */
export interface OpenCheckin {
  date: ISODate
  /**
   * True when the check-in is required (missed yesterday, or today after the reminder time):
   * the skin must offer no way to close it except saving, and keep the rest of the app inert.
   */
  blocking: boolean
}

export interface AppControllerOptions {
  /**
   * Whether the skin shows the virtual pet. Defaults to the active skin's registry flag
   * (`usesPet` in src/skins/index.ts); only pass it to override (tests, galleries).
   */
  usesPet?: boolean
}

export interface AppController {
  // ---- Data (from useAppData; refreshed by reload) ----
  settings: Settings
  /** Every log, oldest first. */
  logs: DayLog[]
  /** Every pet ever hatched, oldest first. */
  pets: Pet[]
  /** The living pet, if any. */
  currentPet: Pet | undefined
  /** Re-reads everything from the database; resolves once the new data is in state. */
  reload: () => Promise<void>

  // ---- Time ----
  /** Ticks every minute and when the app returns to the foreground. */
  now: Date
  /** `now` as a local ISO date. */
  today: ISODate

  // ---- Derived ----
  /** Dates that have a log. */
  loggedDates: ReadonlySet<ISODate>
  /** Raw due state (today logged / today due / backfill date). */
  due: CheckinDue
  todayLogged: boolean
  /** True when no log exists yet (a brand-new journal): a good moment for a welcome or import hint. */
  noLogsYet: boolean
  /** True when the app is open in an iOS Safari tab instead of from the Home Screen: show the warning banner. */
  outsideHomeScreen: boolean

  // ---- Pet (pet skins only; no-pet skins ignore these) ----
  /** Whether this skin uses the pet (see AppControllerOptions.usesPet). */
  usesPet: boolean
  /** Pet skin with no pet ever hatched: show the hatch flow instead of home content. Always false without the pet. */
  needsFirstPet: boolean
  /** Status of the living pet (null when none). Computed for every skin so a neglected pet still dies on schedule. */
  petStatus: PetStatus | null
  /** The most recently hatched pet when none is alive (show a memorial + "hatch a new one"), else null. */
  memorialPet: Pet | null
  /** Hatches a pet born today and reloads. Rejects with a readable Error on failure. */
  hatchPet: (name: string) => Promise<void>

  // ---- Navigation ----
  tab: Tab
  /** Switches screen (and dismisses the alarm prompt). */
  setTab: (tab: Tab) => void

  // ---- Check-in ----
  /** The check-in to show now, or null. Render its form keyed by `date`. */
  checkin: OpenCheckin | null
  /** Opens a voluntary check-in for `date` (closable unless a blocking one takes over). Dismisses the alarm prompt. */
  openCheckin: (date: ISODate) => void
  /** Closes a voluntary check-in. Does nothing to a blocking one. */
  closeCheckin: () => void
  /**
   * Pass to `useCheckinForm` as `onSaved`. Reloads data and recomputes what's due, so a
   * blocking backfill moves straight on to today's check-in if that is due too.
   */
  onCheckinSaved: () => Promise<void>

  // ---- Phone reminders (see src/core/reminders.ts) ----
  /**
   * Set right after a check-in for today or yesterday is saved, while the per-device switch
   * "Tell your phone when you've checked in" is on and no check-in is open (after a backfill
   * followed by today's check-in, only once the last one is saved). Show a small, non-blocking
   * prompt (`ALARM_COPY.prompt`): `ALARM_COPY.confirm` → `runDoneShortcut(alarmPrompt.date)`
   * then `dismissAlarmPrompt()`; `ALARM_COPY.notNow` → `dismissAlarmPrompt()`. Cleared by
   * `setTab` and `openCheckin`.
   */
  alarmPrompt: AlarmPrompt | null
  dismissAlarmPrompt: () => void
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

/**
 * Everything app-wide that isn't presentation: time, what's due, the pet, tabs and which
 * check-in is open. Call it once, in the component a skin renders after `useAppData()` is
 * ready, and pass pieces down.
 *
 * Rules it implements:
 * - Blocking check-in: missed yesterday first (backfill), then today once the reminder time
 *   has passed. Pet skins never block before the first pet is hatched (so first run is
 *   always hatching or importing a backup); no-pet skins block from first launch. Days
 *   before `settings.startedOn` (first use) are never asked about.
 * - `?checkin=1` (the reminder's deep link) opens today's check-in once if today isn't logged,
 *   then is stripped from the URL.
 * - A pet death detected by the logic is written to the database, whatever the skin.
 */
export function useAppController(data: AppData, reload: () => Promise<void>, options: AppControllerOptions = {}): AppController {
  const { settings, logs, pets, currentPet } = data
  const usesPet = options.usesPet ?? activeSkin().usesPet

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
    () => (currentPet ? computePetStatus(currentPet, loggedDates, today) : null),
    [currentPet, loggedDates, today],
  )

  // Persist a death the logic has detected (in every skin, so the pet's state stays true).
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
  // Pet skins: not on first run, so the very first thing is always hatching (or importing a backup).
  const needsFirstPet = usesPet && pets.length === 0
  const blockingDate = needsFirstPet ? null : (due.backfill ?? (due.todayDue ? today : null))
  const checkinDate = blockingDate ?? manualCheckin
  const checkin = useMemo<OpenCheckin | null>(
    () => (checkinDate ? { date: checkinDate, blocking: blockingDate !== null } : null),
    [checkinDate, blockingDate],
  )

  // After a save, maybe offer to tell the phone (run "Phase Done"). Only offered once no
  // check-in is open, so a backfill followed by today's blocking check-in prompts once, after
  // the last save, for the last date saved.
  const alarmShortcut = useAlarmShortcut()
  const [alarmPending, dispatchAlarm] = useReducer(alarmPromptReducer, null)
  const dismissAlarmPrompt = useCallback(() => dispatchAlarm({ type: 'dismiss' }), [])

  // The form stays in its "saving" state until fresh data is loaded, so the due state is
  // recomputed from the new logs before it closes (or moves on to today's check-in).
  // `checkinDate` is the date of the form that called this (forms are keyed by date).
  const onCheckinSaved = useCallback(async () => {
    const savedDate = checkinDate
    await reload()
    const savedAt = new Date()
    setManualCheckin(null)
    setNow(savedAt)
    if (savedDate) {
      dispatchAlarm({ type: 'saved', date: savedDate, today: toISODate(savedAt), enabled: alarmShortcutPref.get() === 'on' })
    }
  }, [reload, checkinDate])

  const alarmPrompt = useMemo(
    () => visibleAlarmPrompt(alarmPending, { checkinOpen: checkin !== null, enabled: alarmShortcut === 'on', today }),
    [alarmPending, checkin, alarmShortcut, today],
  )

  const hatchPet = useCallback(
    async (name: string) => {
      await dbHatchPet(name, today)
      await reload()
    },
    [today, reload],
  )

  const closeCheckin = useCallback(() => setManualCheckin(null), [])
  // Going anywhere else retires the prompt.
  const changeTab = useCallback((next: Tab) => {
    setTab(next)
    dispatchAlarm({ type: 'dismiss' })
  }, [])
  const openCheckin = useCallback((date: ISODate) => {
    setManualCheckin(date)
    dispatchAlarm({ type: 'dismiss' })
  }, [])
  const [outsideHomeScreen] = useState(openedOutsideHomeScreen)

  return {
    settings,
    logs,
    pets,
    currentPet,
    reload,
    now,
    today,
    loggedDates,
    due,
    todayLogged: due.todayLogged,
    noLogsYet: logs.length === 0,
    outsideHomeScreen,
    usesPet,
    needsFirstPet,
    petStatus: pet,
    memorialPet: !currentPet && pets.length > 0 ? pets[pets.length - 1] : null,
    hatchPet,
    tab,
    setTab: changeTab,
    checkin,
    openCheckin,
    closeCheckin,
    onCheckinSaved,
    alarmPrompt,
    dismissAlarmPrompt,
  }
}
