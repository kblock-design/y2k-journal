import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { describeLog } from '../core/useCalendar'
import { moodItemsFor } from '../core/useCheckinForm'
import { cycleStats } from '../logic/stats'
import { DEFAULT_SETTINGS } from '../types'
import type { DayLog } from '../types'
import { BACKUP_APP, BACKUP_VERSION } from './backup'
import { db, getAllLogs, getLog, getSettings, importJSON } from './index'
import { DB_NAME, SETTINGS_KEY } from './schema'

// DATA-SAFETY PINS. Everything a user has logged lives on their phone under the names and
// shapes below. Changing any of them by accident (a refactor, a rename, a UI update) would
// orphan or corrupt that data: the app would open an empty database, miss the settings row,
// or fail to read old rows and backups. If one of these tests fails, do NOT just update the
// expected value: add a migration (a new Dexie version with an upgrade, a backup version
// that parseBackup still reads, a pref that reads the old key) and test it first.

/** Reads a whole object store with the raw IndexedDB API (no Dexie in between). */
function rawAll(store: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const conn = open.result
      const req = conn.transaction(store, 'readonly').objectStore(store).getAll()
      req.onsuccess = () => {
        resolve(req.result)
        conn.close()
      }
      req.onerror = () => reject(req.error)
    }
  })
}

/** Writes rows with the raw IndexedDB API, exactly as an older build of the app left them. */
function rawPut(store: string, rows: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const conn = open.result
      const tx = conn.transaction(store, 'readwrite')
      for (const r of rows) tx.objectStore(store).put(r)
      tx.oncomplete = () => {
        conn.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/** Name, version and stores of the database as IndexedDB itself sees it. */
function rawShape(): Promise<{ version: number; stores: Record<string, { keyPath: unknown; autoIncrement: boolean }> }> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const conn = open.result
      const names = [...conn.objectStoreNames]
      const tx = conn.transaction(names, 'readonly')
      const stores = Object.fromEntries(
        names.map((n) => {
          const s = tx.objectStore(n)
          return [n, { keyPath: s.keyPath, autoIncrement: s.autoIncrement }]
        }),
      )
      resolve({ version: conn.version, stores })
      conn.close()
    }
  })
}

beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('database identity (renaming orphans every entry)', () => {
  it('the IndexedDB database is called "burn-book"', () => {
    // The browser keys stored data by this name: a new name = an empty journal.
    expect(DB_NAME).toBe('burn-book')
    expect(db.name).toBe('burn-book')
  })

  it('the single settings row has primary key "settings"', () => {
    // getSettings() looks the row up by this key; changing it loses reminder, cycle length, mood level.
    expect(SETTINGS_KEY).toBe('settings')
  })
})

describe('schema (changing stores or keys needs a new Dexie version with an upgrade)', () => {
  it('Dexie schema version is still 1', () => {
    // Mood tracking levels needed no index change, so the version was deliberately not bumped.
    // Bumping it without an upgrade path, or lowering it, makes existing installs fail to open.
    expect(db.verno).toBe(1)
  })

  it('stores and primary keys, as Dexie declares them', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(['logs', 'pets', 'settings'])
    expect(db.logs.schema.primKey.keyPath).toBe('date') // one row per local day
    expect(db.pets.schema.primKey.keyPath).toBe('id')
    expect(db.pets.schema.primKey.auto).toBe(true) // hatch order
    expect(db.settings.schema.primKey.keyPath).toBe('id')
    // No secondary indexes: every other field is stored as-is.
    for (const t of db.tables) expect(t.schema.indexes).toEqual([])
  })

  it('stores and primary keys, as IndexedDB actually has them on disk', async () => {
    const shape = await rawShape()
    // Dexie stores version n as IndexedDB version n × 10.
    expect(shape.version).toBe(10)
    expect(shape.stores).toEqual({
      logs: { keyPath: 'date', autoIncrement: false },
      pets: { keyPath: 'id', autoIncrement: true },
      settings: { keyPath: 'id', autoIncrement: false },
    })
  })
})

describe('rows written by older builds still read correctly', () => {
  /**
   * A day log as every build before mood tracking levels wrote it: all eight moods that existed
   * then (no selfCriticism, which was added later).
   */
  const OLD_LOG = {
    date: '2026-09-14',
    flow: 'heavy',
    moods: {
      moodSwings: 3,
      irritability: 6,
      sadness: 2,
      anxiety: 4,
      overwhelmed: 5,
      sensitivity: 1,
      lowInterest: 2,
      concentration: 3,
    },
    physical: ['cramps', 'backache'],
    sleep: 'poor',
    energy: 'low',
    cravings: 'strong',
    loggedAt: Date.UTC(2026, 8, 14, 19, 45),
    backfilled: true,
  }
  /** The settings row before the moodTracking field existed. */
  const OLD_SETTINGS = { id: 'settings', reminderTime: '21:30', defaultCycleLength: 31, defaultPeriodLength: 6, startedOn: '2026-03-01' }

  it('an old full-moods log is read back unchanged and every mood it recorded still counts', async () => {
    await rawPut('logs', [OLD_LOG])
    expect(await getLog('2026-09-14')).toEqual(OLD_LOG)
    expect(await getAllLogs()).toEqual([OLD_LOG])
    const read = (await getLog('2026-09-14'))!
    // Exactly the original eight keys: the mood added later is absent, not defaulted.
    expect(Object.keys(read.moods).sort()).toEqual(Object.keys(OLD_LOG.moods).sort())
    expect('selfCriticism' in read.moods).toBe(false)
    const log = OLD_LOG as DayLog
    // The eight recorded moods still show (Advanced) with their values; the newer mood shows
    // as not rated (null), never as a 1.
    const items = moodItemsFor(log, 'advanced', () => {})
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.value]))
    expect(byKey).toEqual({ ...OLD_LOG.moods, selfCriticism: null })
    // A day summary lists the eight recorded moods only.
    const moodRows = describeLog(log).rows.filter((r) => r.rating !== undefined)
    expect(moodRows.map((r) => r.key).sort()).toEqual(Object.keys(OLD_LOG.moods).sort())
    // ...and in the statistics: the eight count, the newer mood is "not tracked".
    const s = cycleStats([log], '2026-09-20', { ...DEFAULT_SETTINGS, startedOn: '2026-03-01' })
    expect(s.moodTotals.daysRated).toBe(1)
    for (const i of s.moodTotals.items) {
      if (i.key === 'selfCriticism') expect(i).toMatchObject({ days: 0, mean: null })
      else expect(i).toMatchObject({ days: 1, mean: (OLD_LOG.moods as Record<string, number>)[i.key] })
    }
  })

  it('a settings row without moodTracking reads as advanced, and is not rewritten by reading', async () => {
    await rawPut('settings', [OLD_SETTINGS])
    const { id: _id, ...fields } = OLD_SETTINGS
    void _id
    expect(await getSettings()).toEqual({ ...fields, moodTracking: 'advanced' })
    expect(await rawAll('settings')).toEqual([OLD_SETTINGS])
  })
})

describe('backups', () => {
  /** A version-1 backup exactly as the app exported it before mood tracking levels. */
  const V1 = {
    app: 'burn-book',
    version: 1,
    exportedAt: '2026-09-20T18:00:00.000Z',
    settings: { reminderTime: '20:00', defaultCycleLength: 28, defaultPeriodLength: 5, startedOn: '2026-05-01' },
    logs: [
      {
        date: '2026-09-19',
        flow: 'none',
        moods: { moodSwings: 1, irritability: 2, sadness: 3, anxiety: 4, overwhelmed: 5, sensitivity: 6, lowInterest: 1, concentration: 2 },
        physical: [],
        sleep: 'ok',
        energy: 'ok',
        cravings: 'none',
        loggedAt: Date.UTC(2026, 8, 19, 20),
        backfilled: false,
      },
    ],
    pets: [{ id: 1, name: 'Mochi', bornOn: '2026-05-01', diedOn: null }],
  }

  it('the backup format id and version (old files must keep importing)', () => {
    expect(BACKUP_APP).toBe('burn-book')
    expect(BACKUP_VERSION).toBe(2)
  })

  it('a version-1 backup still imports, field for field', async () => {
    expect(await importJSON(JSON.stringify(V1))).toBe(1)
    expect(await getAllLogs()).toEqual(V1.logs)
    expect(await getSettings()).toEqual({ ...V1.settings, moodTracking: 'advanced' })
    expect(await rawAll('pets')).toEqual(V1.pets)
  })
})

describe('per-device preference keys (renaming resets the user’s look)', () => {
  const read: string[] = []

  beforeEach(() => {
    read.length = 0
    vi.resetModules()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => {
        read.push(key)
        return null
      },
      setItem: () => {},
      removeItem: () => {},
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('the skin choice lives in "burn-book:skin"', async () => {
    await import('../core/skin')
    expect(read).toEqual(['burn-book:skin'])
  })

  it('Y2K: title style, sticker theme, background', async () => {
    await import('../skins/y2k/prefs')
    expect(read.sort()).toEqual(['burn-book:background-v2', 'burn-book:sticker-theme-v2', 'burn-book:title-style'])
  })

  it('Phase: colourway', async () => {
    await import('../skins/phase/prefs')
    expect(read).toEqual(['burn-book:phase-colourway'])
  })

  it('Reminders: the "Phase Done" switch lives in "burn-book:alarm-shortcut"', async () => {
    await import('../core/reminders')
    expect(read).toEqual(['burn-book:alarm-shortcut'])
  })

  it('Gloss: pixel labels, colourway', async () => {
    await import('../skins/gloss/prefs')
    expect(read.sort()).toEqual(['burn-book:gloss-colourway', 'burn-book:gloss-pixel-labels'])
  })
})
