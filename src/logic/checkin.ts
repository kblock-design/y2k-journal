import type { ISODate, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { addDays, toISODate } from './dates'

export interface CheckinDue {
  todayLogged: boolean
  /** True once the reminder time has passed and today isn't logged: show the blocking modal. */
  todayDue: boolean
  /** Yesterday's date if it was missed and can still be filled in, else null. */
  backfill: ISODate | null
}

/** Minutes after local midnight for an 'HH:MM' string; falls back to the default reminder time if malformed. */
export function parseReminderMinutes(time: string): number {
  return parseHHMM(time) ?? parseHHMM(DEFAULT_SETTINGS.reminderTime) ?? 20 * 60
}

function parseHHMM(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h <= 23 && min <= 59 ? h * 60 + min : null
}

/** Yesterday (local) if it is on or after the day the app was first used, else null. */
function backfillableYesterday(now: Date, settings: Settings): ISODate | null {
  const yesterday = addDays(toISODate(now), -1)
  return yesterday >= settings.startedOn ? yesterday : null
}

export function checkinDue(loggedDates: Set<ISODate>, now: Date, settings: Settings): CheckinDue {
  const today = toISODate(now)
  const todayLogged = loggedDates.has(today)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayDue = !todayLogged && nowMinutes >= parseReminderMinutes(settings.reminderTime)

  const yesterday = backfillableYesterday(now, settings)
  const backfill = yesterday && !loggedDates.has(yesterday) ? yesterday : null

  return { todayLogged, todayDue, backfill }
}

/** Whether `date` may be created or edited at `now`: any day up to and including today. */
export function canLog(date: ISODate, now: Date, _settings: Settings): boolean {
  return date <= toISODate(now)
}
