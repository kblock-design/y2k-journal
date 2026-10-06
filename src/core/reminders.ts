import type { ISODate } from '../types'
import { createPref, usePref } from './prefs'

/**
 * True on an iPhone/iPad when running in a Safari tab rather than from the Home Screen icon.
 * The two have separate storage, so logging in Safari would look like lost data.
 */
export function openedOutsideHomeScreen(): boolean {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return isIOS && !standalone
}

// ---------------------------------------------------------------------------
// Phone reminders ("Phase Done")
//
// A Home Screen web app can't schedule notifications on iOS, so the nudging is done by the
// phone: a Shortcuts automation ("Phase Nudge") runs when the user opens apps they use in the
// evening and, unless tonight's check-in is recorded, shows an alert. The app's only job is to
// tell the phone once a check-in has been saved, by running the "Phase Done" shortcut with the
// check-in's date as input (the shortcut saves it to a file the nudge checks).
//
// Opening a shortcuts:// URL must come straight from a tap (iOS ignores custom-scheme
// navigation without a user gesture) and must never happen before the database write has
// finished, so it is never done automatically: the controller exposes `alarmPrompt` after a
// successful save and the skin's button calls `runDoneShortcut(date)`.
// ---------------------------------------------------------------------------

/** The Shortcut the app runs once a check-in is saved. The user creates it with exactly this name. */
export const DONE_SHORTCUT_NAME = 'Phase Done'

/**
 * URL that runs the "Phase Done" shortcut, passing the check-in's date as its text input:
 * `shortcuts://run-shortcut?name=Phase%20Done&input=text&text=2026-10-06`.
 */
export function doneShortcutUrl(date: ISODate): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(DONE_SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(date)}`
}

/** Opens Shortcuts and runs "Phase Done". Call it only from a tap handler (iOS needs the gesture). */
export function runDoneShortcut(date: ISODate): void {
  window.location.href = doneShortcutUrl(date)
}

export type AlarmShortcut = 'on' | 'off'

/**
 * Per-device switch "Tell your phone when you've checked in" (`localStorage['burn-book:alarm-shortcut']`).
 * Default off. The key keeps its original name; never rename it.
 */
export const alarmShortcutPref = createPref<AlarmShortcut>('burn-book:alarm-shortcut', [{ key: 'on' }, { key: 'off' }], 'off')

/** The Phase Done switch ('on' | 'off'); re-renders when it changes. Set it with `alarmShortcutPref.set`. */
export const useAlarmShortcut = (): AlarmShortcut => usePref(alarmShortcutPref)

/** Copy every skin uses for the Reminders group and the after-save prompt (same words everywhere). */
export const ALARM_COPY = {
  title: 'Reminders',
  intro:
    'Your iPhone can nudge you when you open other apps in the evening until tonight’s check-in is done. The app tells your phone once you’ve checked in.',
  switchLabel: 'Tell your phone when you’ve checked in (runs the Phase Done shortcut)',
  switchHint: 'After you save, one tap tells your phone.',
  test: 'Test the shortcut',
  testHint: 'Opens Shortcuts and runs Phase Done with today’s date',
  setup: 'How to set up',
  prompt: 'Saved. Tell your phone you’ve checked in?',
  confirm: 'Yes, run shortcut',
  notNow: 'Not now',
} as const

/** Phone setup, in order. Render as a numbered list (the numbers aren't in the text), above the switch. */
export const REMINDER_SETUP_STEPS: readonly string[] = [
  `In the Shortcuts app, create a shortcut named exactly “${DONE_SHORTCUT_NAME}” with three actions: “Date” (current date), “Format Date” with the custom format yyyy-MM-dd, and “Save File”, which saves that formatted date to iCloud Drive › Shortcuts as “phase-done.txt” with “Overwrite If File Exists” on and “Ask Where to Save” off.`,
  'Create a shortcut “Phase Nudge”: a “Get File” action for Shortcuts/phase-done.txt (“Error If Not Found” off), then an “If” that compares the file’s text with the current date formatted as yyyy-MM-dd. If they differ: “Show Alert” (“Check in with Phase first”) followed by “Go to Home Screen”. If they match: nothing.',
  'In Shortcuts › Automation, add one automation per app you tend to open in the evening (e.g. Instagram, TikTok, Messages): “When [app] is opened”, Run Immediately, run Phase Nudge. Optionally use a Time of Day trigger to switch the automations on at your reminder time.',
  `Turn on the switch below, then tap “${ALARM_COPY.test}” to confirm it opens Shortcuts and saves the file.`,
]

/** The after-save prompt: offer to run "Phase Done" for this check-in date. */
export interface AlarmPrompt {
  date: ISODate
}

/** True when telling the phone makes sense for a check-in on `date`: today's or yesterday's (a late or backfilled entry). */
export function alarmDateEligible(date: ISODate, today: ISODate): boolean {
  return date === today
}

/**
 * The date waiting to be offered in the prompt (null = nothing to offer). Pure state machine,
 * used by `useAppController` through `useReducer`.
 * - `saved`: a check-in for `date` was just saved. Remembers it when the switch is on and the
 *   date is today, otherwise clears it (so only the last save of a sequence counts).
 * - `dismiss`: "Not now", the shortcut was run, the user navigated or opened another check-in.
 */
export type AlarmPromptEvent =
  | { type: 'saved'; date: ISODate; today: ISODate; enabled: boolean }
  | { type: 'dismiss' }

export function alarmPromptReducer(_pending: ISODate | null, event: AlarmPromptEvent): ISODate | null {
  switch (event.type) {
    case 'saved':
      return event.enabled && alarmDateEligible(event.date, event.today) ? event.date : null
    case 'dismiss':
      return null
  }
}

/**
 * What the skin should show. Nothing while any check-in is open (a backfill save followed by
 * today's blocking check-in prompts only after the last save), when the switch is off, or once
 * the pending date is no longer today or yesterday.
 */
export function visibleAlarmPrompt(
  pending: ISODate | null,
  state: { checkinOpen: boolean; enabled: boolean; today: ISODate },
): AlarmPrompt | null {
  if (!pending || state.checkinOpen || !state.enabled || !alarmDateEligible(pending, state.today)) return null
  return { date: pending }
}
