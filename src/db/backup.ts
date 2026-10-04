import {
  DEFAULT_SETTINGS,
  MOOD_ITEMS,
  MOOD_TRACKING_LEVELS,
  PHYSICAL_SYMPTOMS,
  type Cravings,
  type DayLog,
  type Energy,
  type Flow,
  type ISODate,
  type MoodKey,
  type Pet,
  type PhysicalKey,
  type Rating,
  type Settings,
  type Sleep,
} from '../types'

// Pure (no IndexedDB) helpers for the JSON backup format and CSV export.

export const BACKUP_APP = 'burn-book'
/**
 * Bump when the backup shape changes; parseBackup must keep reading older versions.
 * 1: every log has all eight mood ratings that existed then (V1_MOOD_KEYS); settings without
 *    moodTracking. Moods added later (selfCriticism) are optional there.
 * 2: a log's `moods` holds only the moods that were rated (any subset of MOOD_ITEMS);
 *    settings.moodTracking ('off' | 'basic' | 'advanced').
 */
export const BACKUP_VERSION = 2

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  /** ISO timestamp. */
  exportedAt: string
  settings: Settings
  logs: DayLog[]
  pets: Pet[]
}

// ---------- validation ----------

const FLOWS: readonly Flow[] = ['none', 'spotting', 'light', 'medium', 'heavy']
const SLEEPS: readonly Sleep[] = ['poor', 'ok', 'good']
const ENERGIES: readonly Energy[] = ['low', 'ok', 'high']
const CRAVINGS: readonly Cravings[] = ['none', 'some', 'strong']
const MOOD_KEYS: readonly MoodKey[] = MOOD_ITEMS.map((m) => m.key)
/** The moods that existed when version-1 backups were written; those files must contain all of them. */
const V1_MOOD_KEYS: readonly MoodKey[] = [
  'moodSwings',
  'irritability',
  'sadness',
  'anxiety',
  'overwhelmed',
  'sensitivity',
  'lowInterest',
  'concentration',
]
const PHYSICAL_KEYS: readonly PhysicalKey[] = PHYSICAL_SYMPTOMS.map((p) => p.key)

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function fail(where: string, msg: string): never {
  throw new Error(`Invalid backup: ${where} ${msg}`)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isISODate(v: unknown): v is ISODate {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], where: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    fail(where, `must be one of ${allowed.join(', ')}`)
  }
  return v as T
}

function isoDate(v: unknown, where: string): ISODate {
  if (!isISODate(v)) fail(where, 'must be a YYYY-MM-DD date')
  return v
}

function positiveInt(v: unknown, where: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) fail(where, 'must be a positive integer')
  return v
}

export function validateSettings(v: unknown, where = 'settings'): Settings {
  if (!isRecord(v)) fail(where, 'must be an object')
  if (typeof v.reminderTime !== 'string' || !TIME_RE.test(v.reminderTime)) {
    fail(`${where}.reminderTime`, 'must be HH:MM')
  }
  // Absent in version-1 backups (made before the setting existed): today's behaviour.
  const moodTracking =
    v.moodTracking === undefined
      ? DEFAULT_SETTINGS.moodTracking
      : oneOf(v.moodTracking, MOOD_TRACKING_LEVELS, `${where}.moodTracking`)
  return {
    reminderTime: v.reminderTime,
    defaultCycleLength: positiveInt(v.defaultCycleLength, `${where}.defaultCycleLength`),
    defaultPeriodLength: positiveInt(v.defaultPeriodLength, `${where}.defaultPeriodLength`),
    startedOn: isoDate(v.startedOn, `${where}.startedOn`),
    moodTracking,
  }
}

export interface ValidateLogOptions {
  /**
   * Version-1 backups: `moods` must be an object with all eight V1_MOOD_KEYS ratings (as that
   * format always had); moods added since are optional. Otherwise any subset of the known
   * moods is fine and a missing `moods` object means nothing was rated.
   */
  requireAllMoods?: boolean
}

/** Returns a clean DayLog (unknown extra fields dropped) or throws. */
export function validateLog(v: unknown, where = 'log', options: ValidateLogOptions = {}): DayLog {
  if (!isRecord(v)) fail(where, 'must be an object')
  const date = isoDate(v.date, `${where}.date`)
  const at = `${where} (${date})`

  const requireAll = options.requireAllMoods === true
  if (!isRecord(v.moods) && (requireAll || v.moods !== undefined)) fail(`${at}.moods`, 'must be an object')
  const rawMoods: Record<string, unknown> = isRecord(v.moods) ? v.moods : {}
  // Only rated moods are kept; a mood that wasn't rated stays absent ("not recorded").
  const moods: Partial<Record<MoodKey, Rating>> = {}
  for (const key of MOOD_KEYS) {
    const r = rawMoods[key]
    if (r === undefined && !(requireAll && V1_MOOD_KEYS.includes(key))) continue
    if (typeof r !== 'number' || !Number.isInteger(r) || r < 1 || r > 6) {
      fail(`${at}.moods.${key}`, 'must be an integer rating 1-6')
    }
    moods[key] = r as Rating
  }

  if (!Array.isArray(v.physical)) fail(`${at}.physical`, 'must be an array')
  const physical: PhysicalKey[] = []
  for (const p of v.physical) {
    const key = oneOf(p, PHYSICAL_KEYS, `${at}.physical[]`)
    if (!physical.includes(key)) physical.push(key)
  }

  if (typeof v.loggedAt !== 'number' || !Number.isFinite(v.loggedAt)) {
    fail(`${at}.loggedAt`, 'must be a timestamp in ms')
  }
  if (typeof v.backfilled !== 'boolean') fail(`${at}.backfilled`, 'must be true or false')

  return {
    date,
    flow: oneOf(v.flow, FLOWS, `${at}.flow`),
    moods,
    physical,
    sleep: oneOf(v.sleep, SLEEPS, `${at}.sleep`),
    energy: oneOf(v.energy, ENERGIES, `${at}.energy`),
    cravings: oneOf(v.cravings, CRAVINGS, `${at}.cravings`),
    loggedAt: v.loggedAt,
    backfilled: v.backfilled,
  }
}

export function validatePet(v: unknown, where = 'pet'): Pet {
  if (!isRecord(v)) fail(where, 'must be an object')
  if (typeof v.name !== 'string') fail(`${where}.name`, 'must be a string')
  const bornOn = isoDate(v.bornOn, `${where}.bornOn`)
  const diedOn = v.diedOn === null ? null : isoDate(v.diedOn, `${where}.diedOn`)
  return { id: positiveInt(v.id, `${where}.id`), name: v.name, bornOn, diedOn }
}

/** Parses and validates exportJSON output. Throws an Error with a readable message on garbage. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Invalid backup: not a JSON file')
  }
  if (!isRecord(raw)) throw new Error('Invalid backup: expected a JSON object')
  if (raw.app !== BACKUP_APP) throw new Error('Invalid backup: not a Burn Book backup file')
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    throw new Error('Invalid backup: missing or bad version')
  }
  if (raw.version > BACKUP_VERSION) {
    throw new Error(
      `Backup is from a newer version of the app (format ${raw.version}); update the app first`,
    )
  }
  if (!Array.isArray(raw.logs)) fail('logs', 'must be an array')
  if (!Array.isArray(raw.pets)) fail('pets', 'must be an array')

  const settings = validateSettings(raw.settings)
  const requireAllMoods = raw.version === 1
  const logs = raw.logs.map((l, i) => validateLog(l, `logs[${i}]`, { requireAllMoods }))
  const pets = raw.pets.map((p, i) => validatePet(p, `pets[${i}]`))

  const seenDates = new Set<string>()
  for (const l of logs) {
    if (seenDates.has(l.date)) fail('logs', `contain ${l.date} twice`)
    seenDates.add(l.date)
  }
  const seenIds = new Set<number>()
  for (const p of pets) {
    if (seenIds.has(p.id)) fail('pets', `contain id ${p.id} twice`)
    seenIds.add(p.id)
  }
  if (pets.filter((p) => p.diedOn === null).length > 1) fail('pets', 'have more than one living pet')

  return {
    app: BACKUP_APP,
    version: raw.version,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    settings,
    logs,
    pets,
  }
}

// ---------- CSV ----------

/** RFC 4180 field escaping. */
export function csvField(value: string | number | boolean): string {
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function csvRow(values: readonly (string | number | boolean)[]): string {
  return values.map(csvField).join(',')
}

export const CSV_COLUMNS: readonly string[] = [
  'date',
  'flow',
  ...MOOD_KEYS,
  ...PHYSICAL_KEYS,
  'sleep',
  'energy',
  'cravings',
  'backfilled',
  'loggedAt',
]

/** Logs → CSV text (header + one row per log, sorted oldest first, CRLF line endings). */
export function logsToCSV(logs: readonly DayLog[]): string {
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const lines = [csvRow(CSV_COLUMNS)]
  for (const log of sorted) {
    lines.push(
      csvRow([
        log.date,
        log.flow,
        ...MOOD_KEYS.map((k) => log.moods[k] ?? ''),
        ...PHYSICAL_KEYS.map((k) => (log.physical.includes(k) ? 1 : 0)),
        log.sleep,
        log.energy,
        log.cravings,
        log.backfilled ? 1 : 0,
        new Date(log.loggedAt).toISOString(),
      ]),
    )
  }
  return lines.join('\r\n') + '\r\n'
}
