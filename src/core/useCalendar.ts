import { useMemo, useState } from 'react'
import { canLog } from '../logic/checkin'
import { phaseOn } from '../logic/cycle'
import type { Phase } from '../logic/cycle'
import { fromISODate, toISODate } from '../logic/dates'
import type { DayLog, Flow, ISODate, MoodKey, Rating, Settings } from '../types'
import { MOOD_ITEMS, PHYSICAL_SYMPTOMS, RATING_LABELS } from '../types'
import { capitalize, formatDay, formatMonth, PHASE_LABELS } from './format'

/** Single-letter weekday headers, Sunday first (the grid starts on Sunday). */
export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
/** Phases in cycle order, for legends. */
export const PHASES: readonly Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']

/** One day of the visible month. */
export interface CalendarCell {
  date: ISODate
  /** Day of month, 1–31. */
  day: number
  /** Cycle phase (estimated for past days, predicted for future ones), null before any period is logged. */
  phase: Phase | null
  log: DayLog | undefined
  /** After today: the phase is a prediction. */
  predicted: boolean
  isToday: boolean
  isSelected: boolean
  /** Logged flow, 'none' when not logged. */
  flow: Flow
  /** Light, medium or heavy flow logged. */
  bleeding: boolean
  spotting: boolean
  /** Whether the day can be selected and logged (any day up to today). */
  canLog: boolean
  /** Full accessible label, e.g. "Fri 2 Oct, Menstrual, Medium flow, logged". */
  label: string
}

export interface CalendarModel {
  year: number
  /** 0–11 */
  month: number
  /** "October 2026" */
  monthTitle: string
  /** Number of blank cells before day 1 (Sunday-first grid). */
  leading: number
  cells: CalendarCell[]
  prevMonth: () => void
  nextMonth: () => void
  /** Selected day (starts as today). */
  selected: ISODate
  select: (date: ISODate) => void
  selectedLog: DayLog | undefined
}

/**
 * Month grid with phases, logs and selection. Pair with `app.openCheckin(selected)` for the
 * day detail's "Add entry" / "Edit" button, and `describeLog(selectedLog)` for its summary.
 */
export function useCalendar(args: { logs: DayLog[]; settings: Settings; today: ISODate; now: Date }): CalendarModel {
  const { logs, settings, today, now } = args
  const [month, setMonth] = useState(() => {
    const d = fromISODate(today)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState<ISODate>(today)

  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs])

  // Phases are the expensive part: computed per month, not per selection or clock tick.
  const { leading, days } = useMemo(() => {
    const first = new Date(month.year, month.month, 1, 12)
    const count = new Date(month.year, month.month + 1, 0, 12).getDate()
    const out: { date: ISODate; day: number; phase: Phase | null; log: DayLog | undefined }[] = []
    for (let day = 1; day <= count; day++) {
      const date = toISODate(new Date(month.year, month.month, day, 12))
      out.push({ date, day, phase: phaseOn(logs, date, settings, today), log: byDate.get(date) })
    }
    return { leading: first.getDay(), days: out }
  }, [month, logs, settings, today, byDate])

  const cells = useMemo(
    () =>
      days.map(({ date, day, phase, log }): CalendarCell => {
        const predicted = date > today
        const flow = log?.flow ?? 'none'
        const label = [
          formatDay(date),
          phase ? `${PHASE_LABELS[phase]}${predicted ? ' (predicted)' : ''}` : null,
          flow !== 'none' ? `${capitalize(flow)} flow` : null,
          log ? 'logged' : null,
        ]
          .filter(Boolean)
          .join(', ')
        return {
          date,
          day,
          phase,
          log,
          predicted,
          isToday: date === today,
          isSelected: date === selected,
          flow,
          bleeding: flow === 'light' || flow === 'medium' || flow === 'heavy',
          spotting: flow === 'spotting',
          canLog: canLog(date, now, settings),
          label,
        }
      }),
    [days, today, selected, now, settings],
  )

  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1, 12)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  return {
    year: month.year,
    month: month.month,
    monthTitle: formatMonth(month.year, month.month),
    leading,
    cells,
    prevMonth: () => shift(-1),
    nextMonth: () => shift(1),
    selected,
    select: setSelected,
    selectedLog: byDate.get(selected),
  }
}

/** A saved day as display rows, in check-in order. */
export interface LogSummary {
  rows: {
    key: string
    label: string
    value: string
    /** Set on mood rows: the 1–6 rating behind `value`. */
    rating?: Rating
  }[]
  /** "2 Oct 2026, 21:04" (locale formatted). */
  savedAt: string
  /** Filled in on a later day. */
  backfilled: boolean
}

/** Rated moods in MOOD_ITEMS order (a mood that wasn't rated is not recorded, so it's left out). */
function ratedMoods(log: DayLog): { key: MoodKey; label: string; rating: Rating }[] {
  const out: { key: MoodKey; label: string; rating: Rating }[] = []
  for (const m of MOOD_ITEMS) {
    const rating = log.moods?.[m.key]
    if (rating !== undefined && RATING_LABELS[rating] !== undefined) out.push({ key: m.key, label: m.label, rating })
  }
  return out
}

/**
 * Bleeding, each rated mood, body, sleep, energy, cravings: readable values for a day-detail
 * view. Moods that weren't rated that day (mood tracking off or at a lower level) have no row.
 */
export function describeLog(log: DayLog): LogSummary {
  const physical = PHYSICAL_SYMPTOMS.filter((s) => log.physical.includes(s.key)).map((s) => s.label)
  return {
    rows: [
      { key: 'flow', label: 'Bleeding', value: capitalize(log.flow) },
      ...ratedMoods(log).map((m) => ({ key: m.key, label: m.label, value: RATING_LABELS[m.rating], rating: m.rating })),
      { key: 'physical', label: 'Body', value: physical.length ? physical.join(', ') : 'Nothing' },
      { key: 'sleep', label: 'Sleep', value: capitalize(log.sleep) },
      { key: 'energy', label: 'Energy', value: capitalize(log.energy) },
      { key: 'cravings', label: 'Cravings', value: capitalize(log.cravings) },
    ],
    savedAt: new Date(log.loggedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    backfilled: log.backfilled,
  }
}

/**
 * Only what was logged as something other than the default, most notable first: the day at a
 * glance for a compact summary. Empty when the day was logged with nothing to report.
 */
export function logHighlights(log: DayLog): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = []
  if (log.flow !== 'none') out.push({ key: 'flow', text: log.flow === 'spotting' ? 'Spotting' : `${capitalize(log.flow)} flow` })
  // Only rated moods above "not at all"; unrated ones are not recorded, so never shown.
  const moods = ratedMoods(log).filter((m) => m.rating > 1).sort((a, b) => b.rating - a.rating)
  for (const m of moods) out.push({ key: m.key, text: `${m.label}: ${RATING_LABELS[m.rating].toLowerCase()}` })
  for (const s of PHYSICAL_SYMPTOMS) if (log.physical.includes(s.key)) out.push({ key: s.key, text: s.label })
  if (log.sleep !== 'ok') out.push({ key: 'sleep', text: `${capitalize(log.sleep)} sleep` })
  if (log.energy !== 'ok') out.push({ key: 'energy', text: `${capitalize(log.energy)} energy` })
  if (log.cravings !== 'none') out.push({ key: 'cravings', text: `${capitalize(log.cravings)} cravings` })
  return out
}
