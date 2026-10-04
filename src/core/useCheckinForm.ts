import { useCallback, useEffect, useState } from 'react'
import { getLog, saveLog } from '../db'
import { addDays, toISODate } from '../logic/dates'
import { moodKeysFor, nearestBasic, pickMoods } from '../logic/moods'
import type { Cravings, DayLog, Energy, Flow, ISODate, MoodKey, MoodTracking, PhysicalKey, Rating, Sleep } from '../types'
import { BASIC_CHOICES, MOOD_ITEMS, PHYSICAL_SYMPTOMS, RATING_LABELS } from '../types'
import { emptyLog, errorMessage, formatDay } from './format'

// Option lists in display order. Mood items, ratings and physical symptoms come from
// src/types.ts (MOOD_ITEMS, RATING_LABELS, PHYSICAL_SYMPTOMS); which moods to show and on
// which scale comes from the form (`form.moodItems`).
export const FLOWS: readonly Flow[] = ['none', 'spotting', 'light', 'medium', 'heavy']
export const SLEEPS: readonly Sleep[] = ['poor', 'ok', 'good']
export const ENERGIES: readonly Energy[] = ['low', 'ok', 'high']
export const CRAVINGS: readonly Cravings[] = ['none', 'some', 'strong']
/** Mood ratings low to high (1 = not at all … 6 = extreme). */
export const RATINGS: readonly Rating[] = [1, 2, 3, 4, 5, 6]

/** One answer on a mood item's scale. */
export interface MoodOption {
  value: Rating
  label: string
}

/** The full 1–6 scale ('advanced'). */
export const FULL_SCALE: readonly MoodOption[] = RATINGS.map((r) => ({ value: r, label: RATING_LABELS[r] }))
/** The three basic answers ('basic'), stored as 1, 3 and 5. */
export const BASIC_SCALE: readonly MoodOption[] = BASIC_CHOICES

/** "Today — Fri 2 Oct", "Yesterday — Thu 1 Oct" or "Wed 30 Sept". */
export function checkinTitle(date: ISODate, today: ISODate): string {
  if (date === today) return `Today — ${formatDay(date)}`
  if (date === addDays(today, -1)) return `Yesterday — ${formatDay(date)}`
  return formatDay(date)
}

/** One mood question as the current mood-tracking level asks it. */
export interface CheckinMoodItem {
  key: MoodKey
  label: string
  /** 'full' = six steps, 1 = not at all … 6 = extreme; 'basic' = Not at all / Somewhat / A lot. */
  scale: 'full' | 'basic'
  /** The answers to offer, low to high (FULL_SCALE or BASIC_SCALE). */
  options: readonly MoodOption[]
  /**
   * The option to show as selected, or null when this mood isn't rated in this entry (show
   * nothing selected). On the basic scale a stored 2/4/6 shows as the nearest answer
   * (1–2 → Not at all, 3–4 → Somewhat, 5–6 → A lot); the stored value is only replaced
   * when the user taps an answer.
   */
  value: Rating | null
  /** Label of `value` ("Moderate", "Somewhat"), or null when not rated. */
  valueLabel: string | null
  /** Records an answer (one of `options[].value`). */
  set: (rating: Rating) => void
}

export interface CheckinForm {
  /** The entry being edited; null while loading (or if loading failed). */
  log: DayLog | null
  /** The day before, when this is a new entry and that day was logged: offer "Same as the day before". */
  previous: DayLog | null
  /** True when editing an existing entry ("Save changes" rather than "Save"). */
  isEdit: boolean
  /** Readable load failure; show it with a retry button wired to `retryLoad`. */
  loadError: string | null
  retryLoad: () => void
  /** Patch any fields (flow, sleep, energy, cravings, …). */
  update: (patch: Partial<DayLog>) => void
  /** The mood-tracking level this form asks at (from settings). */
  moodTracking: MoodTracking
  /**
   * The mood questions to render, in MOOD_ITEMS order: none when mood tracking is 'off'
   * (render no mood section at all), the four basic moods at 'basic', every MOOD_ITEMS entry
   * at 'advanced'. Ratings stored for moods not listed here are kept untouched on save.
   */
  moodItems: CheckinMoodItem[]
  setMood: (key: MoodKey, rating: Rating) => void
  /** Adds/removes a physical symptom, keeping PHYSICAL_SYMPTOMS order. */
  togglePhysical: (key: PhysicalKey) => void
  /**
   * Copies flow, body, sleep, energy, cravings and the moods asked at the current level
   * (those `previous` rated) from `previous`.
   */
  copyPrevious: () => void
  /** True from `save()` until the saved data has been reloaded (or the save failed). */
  saving: boolean
  /** Readable save failure ("Couldn't save: …" is the usual wording). */
  saveError: string | null
  canSave: boolean
  /** Saves (marking it backfilled unless it is today's) then awaits `onSaved`. Never throws. */
  save: () => Promise<void>
}

/**
 * The mood questions for `level` over `log` (pure; the hook's `moodItems`). Only the moods
 * asked at `level`, in MOOD_ITEMS order; `value` is the stored rating, or on the basic scale
 * its nearest answer; null when `log` has no rating for that mood.
 */
export function moodItemsFor(
  log: DayLog | null,
  level: MoodTracking,
  setMood: (key: MoodKey, rating: Rating) => void,
): CheckinMoodItem[] {
  const shown = moodKeysFor(level)
  const basic = level === 'basic'
  const options = basic ? BASIC_SCALE : FULL_SCALE
  return MOOD_ITEMS.filter((m) => shown.includes(m.key)).map((m) => {
    const stored = log?.moods?.[m.key]
    const value = stored === undefined ? null : basic ? nearestBasic(stored) : stored
    return {
      key: m.key,
      label: m.label,
      scale: basic ? 'basic' : 'full',
      options,
      value,
      valueLabel: value === null ? null : (options.find((o) => o.value === value)?.label ?? null),
      set: (rating: Rating) => setMood(m.key, rating),
    }
  })
}

/**
 * "Same as the day before" (pure): flow, body, sleep, energy and cravings from `previous`,
 * plus the moods asked at `level` that `previous` rated. Every other mood in `log` is kept.
 */
export function copyPreviousInto(log: DayLog, previous: DayLog, level: MoodTracking): DayLog {
  const { flow, moods, physical, sleep, energy, cravings } = previous
  const copied = pickMoods(moods ?? {}, moodKeysFor(level))
  return { ...log, flow, moods: { ...log.moods, ...copied }, physical: [...physical], sleep, energy, cravings }
}

/**
 * State and actions for one day's check-in form. Loads the existing entry (edit) or starts
 * from a symptom-free day (new). Render the form keyed by `date` (`key={date}`), so moving
 * from a backfill to today's check-in starts a fresh form.
 *
 * @param onSaved usually `app.onCheckinSaved`; the form stays `saving` until it resolves.
 * @param moodTracking `app.settings.moodTracking`: which moods to ask, and how.
 */
export function useCheckinForm(
  date: ISODate,
  onSaved: () => Promise<void>,
  moodTracking: MoodTracking,
): CheckinForm {
  const [log, setLog] = useState<DayLog | null>(null)
  const [previous, setPrevious] = useState<DayLog | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getLog(date), getLog(addDays(date, -1))]).then(
      ([existing, dayBefore]) => {
        if (cancelled) return
        setPrevious(existing ? null : (dayBefore ?? null))
        setIsEdit(!!existing)
        // An existing entry keeps every stored rating (also those not asked at this level).
        setLog(existing ? { ...existing, moods: { ...existing.moods } } : emptyLog(date, moodTracking))
        setLoadError(null)
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err))
      },
    )
    return () => {
      cancelled = true
    }
    // (Settings can't change while a check-in is open; if the level did change, the form reloads.)
  }, [date, attempt, moodTracking])

  const update = useCallback((patch: Partial<DayLog>) => setLog((l) => (l ? { ...l, ...patch } : l)), [])

  const setMood = useCallback(
    (key: MoodKey, rating: Rating) => setLog((l) => (l ? { ...l, moods: { ...l.moods, [key]: rating } } : l)),
    [],
  )

  const copyPrevious = () => {
    if (!previous) return
    setLog((l) => (l ? copyPreviousInto(l, previous, moodTracking) : l))
  }

  const togglePhysical = useCallback(
    (key: PhysicalKey) =>
      setLog((l) => {
        if (!l) return l
        const has = l.physical.includes(key)
        return {
          ...l,
          physical: has
            ? l.physical.filter((k) => k !== key)
            : PHYSICAL_SYMPTOMS.map((p) => p.key).filter((k) => k === key || l.physical.includes(k)),
        }
      }),
    [],
  )

  const moodItems = moodItemsFor(log, moodTracking, setMood)

  const save = async () => {
    if (!log || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const now = new Date()
      await saveLog({
        ...log,
        date,
        loggedAt: now.getTime(),
        backfilled: date !== toISODate(now),
      })
      await onSaved()
    } catch (err) {
      setSaveError(errorMessage(err))
      setSaving(false)
    }
  }

  return {
    log,
    previous,
    isEdit,
    loadError,
    retryLoad: () => setAttempt((n) => n + 1),
    update,
    moodTracking,
    moodItems,
    setMood,
    togglePhysical,
    copyPrevious,
    saving,
    saveError,
    canSave: !!log && !saving,
    save,
  }
}
