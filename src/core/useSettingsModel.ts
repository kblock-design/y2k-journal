import { useState } from 'react'
import { exportCSV, exportJSON, importJSON, saveFile, updateSettings } from '../db'
import { diffDays } from '../logic/dates'
import { stageForAge } from '../logic/pet'
import type { PetStage } from '../logic/pet'
import type { ISODate, MoodTracking, Pet, Settings } from '../types'
import { MOOD_ITEMS, MOOD_TRACKING_LEVELS } from '../types'
import { errorMessage, plural } from './format'

export const MIN_CYCLE = 15
export const MAX_CYCLE = 60

/** The mood-tracking choices in display order, with a one-line explanation of each. */
export const MOOD_TRACKING_OPTIONS: readonly { value: MoodTracking; label: string; description: string }[] =
  MOOD_TRACKING_LEVELS.map((value) => ({
    value,
    label: { off: 'Off', basic: 'Basic', advanced: 'Advanced' }[value],
    description: {
      off: 'No mood questions in your check-in.',
      basic: 'Four moods: not at all, somewhat or a lot.',
      advanced: `All ${MOOD_ITEMS.length} moods, rated 1 to 6.`,
    }[value],
  }))

/** Ask the user to confirm this (in the skin's own words or verbatim) before importing. */
export const IMPORT_WARNING =
  'Importing adds the backup’s days to this phone and replaces your pet and settings with the backup’s. Continue?'

/** A one-line outcome to show near the controls it's about (use role="status"). */
export type SettingsStatus = { kind: 'ok' | 'error'; text: string } | null

/** A pet that died, with what a graveyard row needs. */
export interface GraveyardEntry {
  pet: Pet
  /** Born → died. */
  days: number
  /** Stage it reached (for a dead sprite). */
  stage: PetStage
}

export interface SettingsModel {
  /** Reminder time input value ('HH:MM'). */
  reminder: string
  /** Set from the time input's onChange; saves as soon as it's a complete, changed time. */
  setReminder: (value: string) => void

  /** Cycle length input value (a string while typing). */
  cycleLength: string
  setCycleLength: (value: string) => void
  /** Call on blur: saves a valid MIN_CYCLE–MAX_CYCLE integer, otherwise reverts and reports an error. */
  commitCycleLength: () => void
  /** Mood detail the check-in asks for (shows the new choice straight away). */
  moodTracking: MoodTracking
  /** Saves the mood-tracking level. Older entries keep whatever they recorded. */
  setMoodTracking: (level: MoodTracking) => void

  /** Outcome of the last reminder / cycle-length / mood-tracking save. */
  prefsStatus: SettingsStatus

  /** True while an export or import runs (disable the data buttons). */
  busy: boolean
  /** Outcome of the last export / import. */
  dataStatus: SettingsStatus
  /** Saves `burn-book-backup-<today>.json` (share sheet on iOS). Cancelling the sheet is not an error. */
  exportBackup: () => Promise<void>
  /** Saves `burn-book-<today>.csv`. */
  exportSpreadsheet: () => Promise<void>

  /**
   * Imports a backup file right away (no confirmation). Use it after your own confirmation,
   * e.g. `if (window.confirm(IMPORT_WARNING)) void importBackup(file)`.
   */
  importBackup: (file: File) => Promise<void>
  /**
   * For an in-app confirmation instead: `chooseImportFile(file)` from the file input, then
   * render a confirm UI (with IMPORT_WARNING) while `pendingImport` is set, wired to
   * `confirmImport` / `cancelImport`.
   */
  pendingImport: File | null
  chooseImportFile: (file: File | null | undefined) => void
  confirmImport: () => Promise<void>
  cancelImport: () => void

  /** Dead pets, oldest first (pet skins only). */
  graveyard: GraveyardEntry[]
}

/**
 * State and actions for Settings: reminder time, cycle length, export, import and the pet
 * graveyard. `onChanged` is `app.reload`. Picks up settings changed elsewhere (e.g. by an import).
 *
 * File input tip: reset `input.value = ''` after reading `files[0]` so picking the same file
 * again still fires onChange; use `accept="application/json,.json"`.
 */
export function useSettingsModel(args: {
  settings: Settings
  pets: Pet[]
  today: ISODate
  onChanged: () => Promise<void>
}): SettingsModel {
  const { settings, pets, today, onChanged } = args
  const [reminder, setReminderValue] = useState(settings.reminderTime)
  const [cycleLength, setCycleLength] = useState(String(settings.defaultCycleLength))
  const [moodTracking, setMoodTrackingValue] = useState<MoodTracking>(settings.moodTracking)
  const [prefsStatus, setPrefsStatus] = useState<SettingsStatus>(null)
  const [dataStatus, setDataStatus] = useState<SettingsStatus>(null)
  const [busy, setBusy] = useState(false)
  const [pendingImport, setPendingImport] = useState<File | null>(null)

  // Pick up settings changed elsewhere (e.g. by an import).
  const [syncedSettings, setSyncedSettings] = useState(settings)
  if (syncedSettings !== settings) {
    setSyncedSettings(settings)
    setReminderValue(settings.reminderTime)
    setCycleLength(String(settings.defaultCycleLength))
    setMoodTrackingValue(settings.moodTracking)
  }

  const savePatch = async (patch: Partial<Settings>): Promise<boolean> => {
    try {
      await updateSettings(patch)
      await onChanged()
      setPrefsStatus({ kind: 'ok', text: 'Saved' })
      return true
    } catch (err) {
      setPrefsStatus({ kind: 'error', text: `Couldn't save: ${errorMessage(err)}` })
      return false
    }
  }

  const setMoodTracking = (level: MoodTracking) => {
    if (level === moodTracking) return
    const before = moodTracking
    setMoodTrackingValue(level)
    void savePatch({ moodTracking: level }).then((ok) => {
      if (!ok) setMoodTrackingValue(before)
    })
  }

  const setReminder = (value: string) => {
    setReminderValue(value)
    if (/^\d{2}:\d{2}$/.test(value) && value !== settings.reminderTime) void savePatch({ reminderTime: value })
  }

  const commitCycleLength = () => {
    const n = Number(cycleLength)
    if (!Number.isInteger(n) || n < MIN_CYCLE || n > MAX_CYCLE) {
      setPrefsStatus({ kind: 'error', text: `Cycle length must be ${MIN_CYCLE}–${MAX_CYCLE} days` })
      setCycleLength(String(settings.defaultCycleLength))
      return
    }
    if (n !== settings.defaultCycleLength) void savePatch({ defaultCycleLength: n })
  }

  const runExport = async (kind: 'json' | 'csv') => {
    setBusy(true)
    setDataStatus(null)
    try {
      if (kind === 'json') {
        await saveFile(`burn-book-backup-${today}.json`, await exportJSON(), 'application/json')
      } else {
        await saveFile(`burn-book-${today}.csv`, await exportCSV(), 'text/csv')
      }
      setDataStatus({ kind: 'ok', text: kind === 'json' ? 'Backup exported.' : 'Spreadsheet exported.' })
    } catch (err) {
      // Dismissing the iOS share sheet rejects with AbortError; that's not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return
      setDataStatus({ kind: 'error', text: `Export failed: ${errorMessage(err)}` })
    } finally {
      setBusy(false)
    }
  }

  const importBackup = async (file: File) => {
    setBusy(true)
    setDataStatus(null)
    try {
      const count = await importJSON(await file.text())
      await onChanged()
      setDataStatus({ kind: 'ok', text: `Imported ${plural(count, 'day')}.` })
    } catch (err) {
      setDataStatus({ kind: 'error', text: `Import failed: ${errorMessage(err)}` })
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = async () => {
    const file = pendingImport
    setPendingImport(null)
    if (file) await importBackup(file)
  }

  const graveyard = pets
    .filter((p): p is Pet & { diedOn: ISODate } => !!p.diedOn)
    .map((pet) => {
      const days = diffDays(pet.bornOn, pet.diedOn)
      return { pet, days, stage: stageForAge(days) }
    })

  return {
    reminder,
    setReminder,
    cycleLength,
    setCycleLength,
    commitCycleLength,
    moodTracking,
    setMoodTracking,
    prefsStatus,
    busy,
    dataStatus,
    exportBackup: () => runExport('json'),
    exportSpreadsheet: () => runExport('csv'),
    importBackup,
    pendingImport,
    chooseImportFile: (file) => setPendingImport(file ?? null),
    confirmImport,
    cancelImport: () => setPendingImport(null),
    graveyard,
  }
}
