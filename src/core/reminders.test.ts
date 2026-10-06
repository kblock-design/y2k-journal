import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkinDue } from '../logic/checkin'
import { toISODate } from '../logic/dates'
import type { ISODate, Settings } from '../types'
import {
  ALARM_COPY,
  alarmDateEligible,
  alarmPromptReducer,
  alarmShortcutPref,
  DONE_SHORTCUT_NAME,
  doneShortcutUrl,
  REMINDER_SETUP_STEPS,
  runDoneShortcut,
  visibleAlarmPrompt,
} from './reminders'
import type { AlarmPrompt } from './reminders'

// The "Phase Done" shortcut and the after-save prompt. useAppController keeps the pending date
// in `useReducer(alarmPromptReducer)` and exposes `visibleAlarmPrompt(...)`; the node test
// environment can't run the hook, so `Controller` below replays exactly that wiring (same
// reducer, same visibility rule, real `checkinDue` for which check-in is open) through the
// sequences the app goes through.

describe('Phase Done URL', () => {
  it('runs the shortcut by name, passing the date as text input', () => {
    expect(DONE_SHORTCUT_NAME).toBe('Phase Done')
    expect(doneShortcutUrl('2026-10-06')).toBe('shortcuts://run-shortcut?name=Phase%20Done&input=text&text=2026-10-06')
  })

  it('percent-encodes the name (space as %20, never +) and leaves the ISO date readable', () => {
    const url = doneShortcutUrl('2026-01-31')
    expect(url).not.toContain('+')
    expect(url).not.toContain('Phase Done')
    expect(new URL(url).searchParams.get('name')).toBe('Phase Done')
    expect(new URL(url).searchParams.get('input')).toBe('text')
    expect(new URL(url).searchParams.get('text')).toBe('2026-01-31')
  })

  it('runDoneShortcut navigates to that URL', () => {
    const location = { href: 'https://example.test/' }
    vi.stubGlobal('window', { location })
    try {
      runDoneShortcut('2026-10-06')
      expect(location.href).toBe(doneShortcutUrl('2026-10-06'))
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('Reminders copy', () => {
  it('four setup steps, naming the shortcut exactly, ending with the switch and the test button', () => {
    expect(REMINDER_SETUP_STEPS).toHaveLength(4)
    expect(REMINDER_SETUP_STEPS[0]).toContain('“Phase Done”')
    expect(REMINDER_SETUP_STEPS[0]).toContain('phase-done.txt')
    expect(REMINDER_SETUP_STEPS[1]).toContain('Phase Nudge')
    expect(REMINDER_SETUP_STEPS[1]).toContain('yyyy-MM-dd')
    expect(REMINDER_SETUP_STEPS[2]).toContain('Automation')
    expect(REMINDER_SETUP_STEPS[3]).toContain('switch below')
    expect(REMINDER_SETUP_STEPS[3]).toContain(`“${ALARM_COPY.test}”`)
  })

  it('never mentions alarms', () => {
    const all = [...Object.values(ALARM_COPY), ...REMINDER_SETUP_STEPS].join(' ')
    expect(all).not.toMatch(/alarm/i)
  })
})

describe('alarm-shortcut preference', () => {
  afterEach(() => alarmShortcutPref.set('off'))

  it('defaults to off and notifies subscribers on change', () => {
    expect(alarmShortcutPref.get()).toBe('off')
    const seen: string[] = []
    const unsubscribe = alarmShortcutPref.subscribe(() => seen.push(alarmShortcutPref.get()))
    alarmShortcutPref.set('on')
    alarmShortcutPref.set('off')
    unsubscribe()
    expect(seen).toEqual(['on', 'off'])
  })
})

describe('eligible dates', () => {
  it('today and yesterday only', () => {
    expect(alarmDateEligible('2026-10-06', '2026-10-06')).toBe(true)
    expect(alarmDateEligible('2026-10-05', '2026-10-06')).toBe(true)
    expect(alarmDateEligible('2026-10-04', '2026-10-06')).toBe(false)
    expect(alarmDateEligible('2026-10-07', '2026-10-06')).toBe(false)
    // Across a month boundary.
    expect(alarmDateEligible('2026-09-30', '2026-10-01')).toBe(true)
  })
})

const SETTINGS: Settings = { reminderTime: '20:00', defaultCycleLength: 28, defaultPeriodLength: 5, startedOn: '2026-01-01', moodTracking: 'advanced' }

/** The controller's check-in and prompt state, driven like the app drives it. */
class Controller {
  logged = new Set<ISODate>()
  manual: ISODate | null = null
  pending: ISODate | null = null
  enabled = false
  now: Date

  constructor(now: Date) {
    this.now = now
  }

  get today(): ISODate {
    return toISODate(this.now)
  }

  /** Same rule as useAppController: backfill first, then today once due, else the one the user opened. */
  get checkin(): { date: ISODate; blocking: boolean } | null {
    const due = checkinDue(this.logged, this.now, SETTINGS)
    const blocking = due.backfill ?? (due.todayDue ? this.today : null)
    const date = blocking ?? this.manual
    return date ? { date, blocking: blocking !== null } : null
  }

  get alarmPrompt(): AlarmPrompt | null {
    return visibleAlarmPrompt(this.pending, { checkinOpen: this.checkin !== null, enabled: this.enabled, today: this.today })
  }

  openCheckin(date: ISODate) {
    this.manual = date
    this.pending = alarmPromptReducer(this.pending, { type: 'dismiss' })
  }

  setTab() {
    this.pending = alarmPromptReducer(this.pending, { type: 'dismiss' })
  }

  dismiss() {
    this.pending = alarmPromptReducer(this.pending, { type: 'dismiss' })
  }

  /** The open form's Save: write, then onCheckinSaved (reload, close, recompute, maybe prompt). */
  save() {
    const date = this.checkin?.date
    if (!date) throw new Error('no check-in open')
    this.logged.add(date)
    this.manual = null
    this.pending = alarmPromptReducer(this.pending, { type: 'saved', date, today: this.today, enabled: this.enabled })
  }
}

describe('after-save prompt', () => {
  const evening = () => new Date(2026, 9, 6, 21, 15) // 6 Oct, after the 20:00 reminder
  const afternoon = () => new Date(2026, 9, 6, 15, 0)

  it('switch on: saving today’s check-in offers the prompt for today', () => {
    const c = new Controller(evening())
    c.logged.add('2026-10-05')
    c.enabled = true
    expect(c.checkin).toEqual({ date: '2026-10-06', blocking: true })
    expect(c.alarmPrompt).toBeNull()
    c.save()
    expect(c.checkin).toBeNull()
    expect(c.alarmPrompt).toEqual({ date: '2026-10-06' })
  })

  it('switch off: never', () => {
    const c = new Controller(evening())
    c.logged.add('2026-10-05')
    c.save()
    expect(c.alarmPrompt).toBeNull()
    // Turning the switch on afterwards doesn't resurrect it.
    c.enabled = true
    expect(c.alarmPrompt).toBeNull()
  })

  it('switch turned off while the prompt is up hides it', () => {
    const c = new Controller(evening())
    c.logged.add('2026-10-05')
    c.enabled = true
    c.save()
    expect(c.alarmPrompt).not.toBeNull()
    c.enabled = false
    expect(c.alarmPrompt).toBeNull()
  })

  it('yesterday counts (late or backfilled entry); older dates and edits don’t', () => {
    const c = new Controller(afternoon())
    c.logged.add('2026-10-05')
    c.enabled = true
    c.openCheckin('2026-10-05') // editing yesterday
    c.save()
    expect(c.alarmPrompt).toEqual({ date: '2026-10-05' })
    c.dismiss()
    c.openCheckin('2026-10-01')
    c.save()
    expect(c.alarmPrompt).toBeNull()
  })

  it('an older save after an eligible one clears it (only the last save counts)', () => {
    const c = new Controller(afternoon())
    c.logged.add('2026-10-05')
    c.enabled = true
    c.openCheckin('2026-10-06')
    c.save()
    expect(c.alarmPrompt).toEqual({ date: '2026-10-06' })
    c.openCheckin('2026-09-20')
    expect(c.alarmPrompt).toBeNull()
    c.save()
    expect(c.alarmPrompt).toBeNull()
  })

  it('backfill then today: nothing between the two saves, then one prompt for today', () => {
    const c = new Controller(evening())
    c.enabled = true
    expect(c.checkin).toEqual({ date: '2026-10-05', blocking: true })
    c.save()
    // Yesterday was eligible, but today's blocking check-in took the slot straight away.
    expect(c.checkin).toEqual({ date: '2026-10-06', blocking: true })
    expect(c.alarmPrompt).toBeNull()
    c.save()
    expect(c.checkin).toBeNull()
    expect(c.alarmPrompt).toEqual({ date: '2026-10-06' })
  })

  it('backfill alone (before the reminder time): one prompt, for yesterday', () => {
    const c = new Controller(afternoon())
    c.enabled = true
    expect(c.checkin).toEqual({ date: '2026-10-05', blocking: true })
    c.save()
    expect(c.checkin).toBeNull()
    expect(c.alarmPrompt).toEqual({ date: '2026-10-05' })
  })

  it('hidden while any check-in is open; navigating or opening a check-in dismisses it', () => {
    const c = new Controller(evening())
    c.logged.add('2026-10-05')
    c.enabled = true
    c.save()
    expect(c.alarmPrompt).not.toBeNull()
    c.setTab()
    expect(c.alarmPrompt).toBeNull()

    c.openCheckin('2026-10-06')
    c.save()
    expect(c.alarmPrompt).not.toBeNull()
    c.openCheckin('2026-10-03')
    expect(c.alarmPrompt).toBeNull()
    c.manual = null
    expect(c.alarmPrompt).toBeNull() // closing without saving doesn't bring it back
  })

  it('"Not now" dismisses; a stale prompt expires after a day', () => {
    const c = new Controller(evening())
    c.logged.add('2026-10-05')
    c.enabled = true
    c.save()
    c.dismiss()
    expect(c.alarmPrompt).toBeNull()

    const d = new Controller(afternoon())
    d.logged.add('2026-10-05')
    d.enabled = true
    d.openCheckin('2026-10-06')
    d.save()
    d.now = new Date(2026, 9, 7, 10, 0)
    expect(d.alarmPrompt).toEqual({ date: '2026-10-06' }) // yesterday's still fine
    d.now = new Date(2026, 9, 8, 10, 0)
    d.logged.add('2026-10-07') // nothing to backfill
    expect(d.alarmPrompt).toBeNull()
  })
})
