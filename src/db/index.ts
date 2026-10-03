import type { DayLog, ISODate, Pet, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { toISODate } from '../logic/dates'
import { BACKUP_APP, BACKUP_VERSION, logsToCSV, parseBackup, type Backup } from './backup'
import { db, SETTINGS_KEY, type SettingsRow } from './schema'

// All data lives in IndexedDB on the device. Nothing here may touch the network.

export { db } from './schema'
export { BACKUP_APP, BACKUP_VERSION, CSV_COLUMNS, type Backup } from './backup'

function stripId(row: SettingsRow): Settings {
  const { id: _id, ...settings } = row
  void _id
  return settings
}

export async function getSettings(): Promise<Settings> {
  // rw transaction so two concurrent first calls can't both create defaults.
  return db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(SETTINGS_KEY)
    if (row) {
      // Fill any fields added to Settings after this row was written.
      return { ...DEFAULT_SETTINGS, ...stripId(row) }
    }
    const fresh: SettingsRow = {
      id: SETTINGS_KEY,
      ...DEFAULT_SETTINGS,
      startedOn: toISODate(new Date()),
    }
    await db.settings.put(fresh)
    return stripId(fresh)
  })
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings()
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    ) as Partial<Settings>
    await db.settings.put({ ...current, ...defined, id: SETTINGS_KEY })
  })
}

export async function getLog(date: ISODate): Promise<DayLog | undefined> {
  return db.logs.get(date)
}

/** All logs, oldest first. */
export async function getAllLogs(): Promise<DayLog[]> {
  // Primary key order; 'YYYY-MM-DD' sorts chronologically as a string.
  return db.logs.toArray()
}

/** Inserts or overwrites the log for `log.date`. */
export async function saveLog(log: DayLog): Promise<void> {
  await db.logs.put(log)
}

/** The living pet, if any. */
export async function getCurrentPet(): Promise<Pet | undefined> {
  return db.pets.filter((p) => p.diedOn === null).first()
}

/** Every pet ever hatched, oldest first (dead ones form the graveyard). */
export async function getAllPets(): Promise<Pet[]> {
  return db.pets.toArray() // auto-increment id order == hatch order
}

/** Throws if a pet is already alive (only one living pet at a time). */
export async function hatchPet(name: string, bornOn: ISODate): Promise<Pet> {
  return db.transaction('rw', db.pets, async () => {
    const alive = await getCurrentPet()
    if (alive) throw new Error(`Cannot hatch: ${alive.name} is still alive`)
    const id = await db.pets.add({ name, bornOn, diedOn: null })
    return { id, name, bornOn, diedOn: null }
  })
}

/** Throws if no pet has this id. */
export async function markPetDead(id: number, diedOn: ISODate): Promise<void> {
  const updated = await db.pets.update(id, { diedOn })
  if (updated === 0 && !(await db.pets.get(id))) throw new Error(`No pet with id ${id}`)
}

/** Full backup: settings, logs and pets. */
export async function exportJSON(): Promise<string> {
  const [settings, logs, pets] = await Promise.all([getSettings(), getAllLogs(), getAllPets()])
  const backup: Backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    logs,
    pets,
  }
  return JSON.stringify(backup, null, 2)
}

/** One row per day, for spreadsheets or a doctor. */
export async function exportCSV(): Promise<string> {
  return logsToCSV(await getAllLogs())
}

/**
 * Restores a backup made by exportJSON; returns the number of day logs imported.
 * Validates everything before writing anything. Logs are upserted by date (logs
 * not in the backup are kept); pets and settings are replaced by the backup's.
 */
export async function importJSON(text: string): Promise<number> {
  const backup = parseBackup(text)
  await db.transaction('rw', db.logs, db.pets, db.settings, async () => {
    await db.logs.bulkPut(backup.logs)
    await db.pets.clear()
    if (backup.pets.length) await db.pets.bulkAdd(backup.pets)
    await db.settings.put({ ...backup.settings, id: SETTINGS_KEY })
  })
  return backup.logs.length
}

function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError'
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser time to start reading the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Hands a file to the user (share sheet on iPhone, download elsewhere). */
export async function saveFile(filename: string, text: string, mime: string): Promise<void> {
  const file = new File([text], filename, { type: mime })
  const nav: Partial<Navigator> | undefined = typeof navigator === 'undefined' ? undefined : navigator
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] })
      return
    } catch (e) {
      if (isAbortError(e)) return // user closed the share sheet
      // e.g. NotAllowedError when the tap's user activation has expired: fall back to download.
    }
  }
  downloadFile(file)
}
