import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MOOD_ITEMS, PHYSICAL_SYMPTOMS, type DayLog, type MoodKey, type Rating } from '../types'
import { toISODate } from '../logic/dates'
import { csvField, csvRow, CSV_COLUMNS } from './backup'
import {
  db,
  exportCSV,
  exportJSON,
  getAllLogs,
  getAllPets,
  getCurrentPet,
  getLog,
  getSettings,
  hatchPet,
  importJSON,
  markPetDead,
  saveLog,
  updateSettings,
} from './index'

function makeLog(date: string, overrides: Partial<DayLog> = {}): DayLog {
  const moods = Object.fromEntries(MOOD_ITEMS.map((m, i) => [m.key, ((i % 6) + 1) as Rating])) as Record<
    MoodKey,
    Rating
  >
  return {
    date,
    flow: 'light',
    moods,
    physical: ['cramps', 'headache'],
    sleep: 'ok',
    energy: 'low',
    cravings: 'some',
    loggedAt: Date.UTC(2026, 9, 1, 21, 30),
    backfilled: false,
    ...overrides,
  }
}

async function wipe() {
  await Promise.all(db.tables.map((t) => t.clear()))
}

beforeEach(wipe)

describe('settings', () => {
  it('creates and persists defaults with startedOn = today', async () => {
    const s = await getSettings()
    expect(s).toEqual({ ...DEFAULT_SETTINGS, startedOn: toISODate(new Date()) })
    expect(s).not.toHaveProperty('id')
    expect(await db.settings.count()).toBe(1)
    expect(await getSettings()).toEqual(s)
  })

  it('updates a subset of fields', async () => {
    const before = await getSettings()
    await updateSettings({ reminderTime: '21:15', defaultCycleLength: 30 })
    expect(await getSettings()).toEqual({ ...before, reminderTime: '21:15', defaultCycleLength: 30 })
    expect(await db.settings.count()).toBe(1)
  })
})

describe('day logs', () => {
  it('saves, gets and overwrites by date', async () => {
    expect(await getLog('2026-10-01')).toBeUndefined()
    await saveLog(makeLog('2026-10-01'))
    expect(await getLog('2026-10-01')).toEqual(makeLog('2026-10-01'))
    await saveLog(makeLog('2026-10-01', { flow: 'heavy', backfilled: true }))
    expect((await getLog('2026-10-01'))?.flow).toBe('heavy')
    expect(await db.logs.count()).toBe(1)
  })

  it('returns all logs oldest first', async () => {
    for (const d of ['2026-10-03', '2025-12-31', '2026-01-02', '2026-10-01']) await saveLog(makeLog(d))
    expect((await getAllLogs()).map((l) => l.date)).toEqual([
      '2025-12-31',
      '2026-01-02',
      '2026-10-01',
      '2026-10-03',
    ])
  })
})

describe('pets', () => {
  it('hatch, die, hatch again', async () => {
    expect(await getCurrentPet()).toBeUndefined()
    const a = await hatchPet('Mochi', '2026-09-01')
    expect(a).toEqual({ id: a.id, name: 'Mochi', bornOn: '2026-09-01', diedOn: null })
    expect(await getCurrentPet()).toEqual(a)

    await expect(hatchPet('Second', '2026-09-02')).rejects.toThrow(/still alive/)

    await markPetDead(a.id, '2026-09-20')
    expect(await getCurrentPet()).toBeUndefined()

    const b = await hatchPet('Bean', '2026-09-21')
    expect(b.id).toBeGreaterThan(a.id)
    expect(await getCurrentPet()).toEqual(b)
    expect(await getAllPets()).toEqual([{ ...a, diedOn: '2026-09-20' }, b])
  })

  it('rejects marking an unknown pet dead', async () => {
    await expect(markPetDead(999, '2026-09-20')).rejects.toThrow(/No pet/)
  })
})

describe('JSON backup', () => {
  it('round-trips export -> wipe -> import', async () => {
    await updateSettings({ reminderTime: '22:00', startedOn: '2026-08-15' })
    await saveLog(makeLog('2026-09-30'))
    await saveLog(makeLog('2026-10-01', { physical: [], flow: 'none' }))
    const dead = await hatchPet('Mochi', '2026-08-15')
    await markPetDead(dead.id, '2026-09-01')
    await hatchPet('Bean', '2026-09-02')

    const before = {
      settings: await getSettings(),
      logs: await getAllLogs(),
      pets: await getAllPets(),
    }
    const json = await exportJSON()
    const parsed = JSON.parse(json)
    expect(parsed).toMatchObject({ app: 'burn-book', version: 2 })
    expect(typeof parsed.exportedAt).toBe('string')
    expect(json).toContain('\n  ') // pretty-printed

    await wipe()
    expect(await getAllLogs()).toEqual([])

    expect(await importJSON(json)).toBe(2)
    expect(await getSettings()).toEqual(before.settings)
    expect(await getAllLogs()).toEqual(before.logs)
    expect(await getAllPets()).toEqual(before.pets)
    expect((await getCurrentPet())?.name).toBe('Bean')

    // ids keep auto-incrementing after a restore
    await markPetDead((await getCurrentPet())!.id, '2026-10-01')
    const next = await hatchPet('Pip', '2026-10-02')
    expect(next.id).toBeGreaterThan(Math.max(...before.pets.map((p) => p.id)))
  })

  it('upserts logs by date and keeps logs not in the backup', async () => {
    await saveLog(makeLog('2026-10-01'))
    const json = await exportJSON()
    await wipe()
    await saveLog(makeLog('2026-10-01', { flow: 'heavy' }))
    await saveLog(makeLog('2026-10-02'))
    expect(await importJSON(json)).toBe(1)
    expect((await getLog('2026-10-01'))?.flow).toBe('light')
    expect(await getLog('2026-10-02')).toBeDefined()
  })

  it('rejects invalid input without writing anything', async () => {
    await saveLog(makeLog('2026-10-01'))
    const good = JSON.parse(await exportJSON())

    await expect(importJSON('not json')).rejects.toThrow(/not a JSON file/)
    await expect(importJSON('[]')).rejects.toThrow(/Invalid backup/)
    await expect(importJSON('null')).rejects.toThrow(/Invalid backup/)
    await expect(importJSON(JSON.stringify({ ...good, app: 'other' }))).rejects.toThrow(/not a Burn Book/)
    await expect(importJSON(JSON.stringify({ ...good, version: 99 }))).rejects.toThrow(/newer version/)
    await expect(importJSON(JSON.stringify({ ...good, logs: 'x' }))).rejects.toThrow(/logs/)
    await expect(importJSON(JSON.stringify({ ...good, settings: {} }))).rejects.toThrow(/settings/)

    const badLog = { ...good.logs[0], flow: 'gushing' }
    await expect(importJSON(JSON.stringify({ ...good, logs: [badLog] }))).rejects.toThrow(/flow/)
    const badMood = { ...good.logs[0], moods: { ...good.logs[0].moods, sadness: 9 } }
    await expect(importJSON(JSON.stringify({ ...good, logs: [badMood] }))).rejects.toThrow(/sadness/)
    const badDate = { ...good.logs[0], date: '2026-02-30' }
    await expect(importJSON(JSON.stringify({ ...good, logs: [badDate] }))).rejects.toThrow(/date/)
    const twoAlive = [
      { id: 1, name: 'A', bornOn: '2026-01-01', diedOn: null },
      { id: 2, name: 'B', bornOn: '2026-01-02', diedOn: null },
    ]
    await expect(importJSON(JSON.stringify({ ...good, pets: twoAlive }))).rejects.toThrow(/living/)

    // A valid log followed by a bad one: nothing is written.
    await expect(
      importJSON(JSON.stringify({ ...good, logs: [{ ...good.logs[0], date: '2026-10-05' }, badLog] })),
    ).rejects.toThrow()
    expect(await getLog('2026-10-05')).toBeUndefined()
  })
})

describe('CSV export', () => {
  it('has a header derived from the constants', async () => {
    const [header] = (await exportCSV()).split('\r\n')
    expect(header.split(',')).toEqual([
      'date',
      'flow',
      ...MOOD_ITEMS.map((m) => m.key),
      ...PHYSICAL_SYMPTOMS.map((p) => p.key),
      'sleep',
      'energy',
      'cravings',
      'backfilled',
      'loggedAt',
    ])
    expect(CSV_COLUMNS).toHaveLength(2 + MOOD_ITEMS.length + PHYSICAL_SYMPTOMS.length + 5)
  })

  it('writes one row per day, oldest first', async () => {
    await saveLog(makeLog('2026-10-02', { backfilled: true }))
    await saveLog(makeLog('2026-10-01'))
    const lines = (await exportCSV()).split('\r\n')
    expect(lines).toHaveLength(4) // header, 2 rows, trailing empty
    expect(lines[3]).toBe('')

    const row = Object.fromEntries(CSV_COLUMNS.map((c, i) => [c, lines[1].split(',')[i]]))
    expect(row.date).toBe('2026-10-01')
    expect(row.flow).toBe('light')
    expect(row.moodSwings).toBe('1')
    expect(row.irritability).toBe('2')
    expect(row.cramps).toBe('1')
    expect(row.headache).toBe('1')
    expect(row.bloating).toBe('0')
    expect(row.backfilled).toBe('0')
    expect(row.loggedAt).toBe('2026-10-01T21:30:00.000Z')
    expect(lines[2].startsWith('2026-10-02,')).toBe(true)
    expect(lines[2].split(',')[CSV_COLUMNS.indexOf('backfilled')]).toBe('1')
  })

  it('escapes fields per RFC 4180', () => {
    expect(csvField('plain')).toBe('plain')
    expect(csvField(3)).toBe('3')
    expect(csvField('a,b')).toBe('"a,b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('line1\nline2')).toBe('"line1\nline2"')
    expect(csvRow(['x', 'y,z', 'q"'])).toBe('x,"y,z","q"""')
  })
})

// ---------------------------------------------------------------------------
// Mood tracking levels
// ---------------------------------------------------------------------------

/** A version-1 backup as the app exported it before mood levels: all eight moods, no moodTracking. */
const V1_BACKUP = {
  app: 'burn-book',
  version: 1,
  exportedAt: '2026-09-01T20:00:00.000Z',
  settings: { reminderTime: '21:00', defaultCycleLength: 30, defaultPeriodLength: 5, startedOn: '2026-06-01' },
  logs: [
    {
      date: '2026-08-31',
      flow: 'medium',
      moods: {
        moodSwings: 2,
        irritability: 5,
        sadness: 1,
        anxiety: 3,
        overwhelmed: 4,
        sensitivity: 1,
        lowInterest: 6,
        concentration: 2,
      },
      physical: ['cramps'],
      sleep: 'poor',
      energy: 'low',
      cravings: 'some',
      loggedAt: Date.UTC(2026, 7, 31, 20),
      backfilled: false,
    },
  ],
  pets: [],
}

describe('mood tracking setting', () => {
  it('a settings row written before the setting existed reads as advanced', async () => {
    await db.settings.put({
      id: 'settings',
      reminderTime: '21:00',
      defaultCycleLength: 30,
      defaultPeriodLength: 5,
      startedOn: '2026-06-01',
    } as never)
    expect(await getSettings()).toEqual({
      reminderTime: '21:00',
      defaultCycleLength: 30,
      defaultPeriodLength: 5,
      startedOn: '2026-06-01',
      moodTracking: 'advanced',
    })
  })

  it('defaults to advanced on a fresh install and saves a new level', async () => {
    expect((await getSettings()).moodTracking).toBe('advanced')
    await updateSettings({ moodTracking: 'basic' })
    expect((await getSettings()).moodTracking).toBe('basic')
    await updateSettings({ reminderTime: '22:00' })
    expect((await getSettings()).moodTracking).toBe('basic')
    await updateSettings({ moodTracking: 'off' })
    expect(await getSettings()).toMatchObject({ moodTracking: 'off', reminderTime: '22:00' })
  })
})

describe('backups with mood levels', () => {
  it('imports a version-1 backup unchanged (all eight moods, setting defaults to advanced)', async () => {
    expect(await importJSON(JSON.stringify(V1_BACKUP))).toBe(1)
    expect(await getLog('2026-08-31')).toEqual(V1_BACKUP.logs[0])
    expect(await getSettings()).toEqual({ ...V1_BACKUP.settings, moodTracking: 'advanced' })
  })

  it('version 1 still requires every mood, as that format always had them', async () => {
    const { lowInterest: _x, ...seven } = V1_BACKUP.logs[0].moods
    void _x
    const bad = { ...V1_BACKUP, logs: [{ ...V1_BACKUP.logs[0], moods: seven }] }
    await expect(importJSON(JSON.stringify(bad))).rejects.toThrow(/lowInterest/)
  })

  it('round-trips partial moods and the level (version 2)', async () => {
    await updateSettings({ moodTracking: 'basic', startedOn: '2026-08-01' })
    await saveLog(makeLog('2026-09-28')) // advanced: every mood
    await saveLog(makeLog('2026-09-29', { moods: { moodSwings: 1, irritability: 3, sadness: 5, anxiety: 1 } }))
    await saveLog(makeLog('2026-09-30', { moods: {} })) // off
    const before = { settings: await getSettings(), logs: await getAllLogs() }
    const json = await exportJSON()
    expect(JSON.parse(json).version).toBe(2)
    expect(JSON.parse(json).logs[2].moods).toEqual({})
    await wipe()
    expect(await importJSON(json)).toBe(3)
    expect(await getSettings()).toEqual(before.settings)
    expect(await getAllLogs()).toEqual(before.logs)
    expect((await getLog('2026-09-30'))!.moods).toEqual({})
    expect(Object.keys((await getLog('2026-09-29'))!.moods)).toHaveLength(4)
  })

  it('version 2: any subset of known moods, unknown keys dropped, missing moods object = none rated', async () => {
    const base = JSON.parse(await exportJSON())
    const logs = [
      { ...makeLog('2026-10-01'), moods: { sadness: 2, mystery: 4 } },
      (() => {
        const { moods: _m, ...rest } = makeLog('2026-10-02')
        void _m
        return rest
      })(),
    ]
    expect(await importJSON(JSON.stringify({ ...base, logs }))).toBe(2)
    expect((await getLog('2026-10-01'))!.moods).toEqual({ sadness: 2 })
    expect((await getLog('2026-10-02'))!.moods).toEqual({})
  })

  it('version 2 still rejects bad ratings and bad levels', async () => {
    const base = JSON.parse(await exportJSON())
    const badRating = { ...makeLog('2026-10-01'), moods: { anxiety: 0 } }
    await expect(importJSON(JSON.stringify({ ...base, logs: [badRating] }))).rejects.toThrow(/anxiety/)
    const notObject = { ...makeLog('2026-10-01'), moods: 'none' }
    await expect(importJSON(JSON.stringify({ ...base, logs: [notObject] }))).rejects.toThrow(/moods/)
    const badLevel = { ...base, settings: { ...base.settings, moodTracking: 'some' } }
    await expect(importJSON(JSON.stringify(badLevel))).rejects.toThrow(/moodTracking/)
    expect(await getLog('2026-10-01')).toBeUndefined()
  })

  it('CSV: an empty cell for each mood that was not rated', async () => {
    await saveLog(makeLog('2026-10-01', { moods: { irritability: 5 } }))
    await saveLog(makeLog('2026-10-02', { moods: {} }))
    const lines = (await exportCSV()).split('\r\n')
    const cells = (i: number) => Object.fromEntries(CSV_COLUMNS.map((c, j) => [c, lines[i].split(',')[j]]))
    const basic = cells(1)
    expect(basic.irritability).toBe('5')
    for (const m of MOOD_ITEMS.filter((x) => x.key !== 'irritability')) expect(basic[m.key]).toBe('')
    const off = cells(2)
    for (const m of MOOD_ITEMS) expect(off[m.key]).toBe('')
    expect(off.flow).toBe('light')
    expect(lines[2].split(',')).toHaveLength(CSV_COLUMNS.length)
  })
})

// ---------------------------------------------------------------------------
// The ninth mood (selfCriticism), added after version-1 backups and old entries
// ---------------------------------------------------------------------------

/** The moods every version-1 backup (and every entry saved before the ninth mood) has. */
const ORIGINAL_EIGHT = Object.keys(V1_BACKUP.logs[0].moods)

describe('the ninth mood in backups and CSV', () => {
  it('is a known mood that version-1 files never had', () => {
    expect(MOOD_ITEMS.map((m) => m.key)).toContain('selfCriticism')
    expect(ORIGINAL_EIGHT).toHaveLength(8)
    expect(ORIGINAL_EIGHT).not.toContain('selfCriticism')
  })

  it('a version-1 backup with only the original eight moods imports; the ninth stays absent', async () => {
    expect(await importJSON(JSON.stringify(V1_BACKUP))).toBe(1)
    const moods = (await getLog('2026-08-31'))!.moods
    expect(Object.keys(moods).sort()).toEqual([...ORIGINAL_EIGHT].sort())
    expect('selfCriticism' in moods).toBe(false)
  })

  it('version 1 still requires each of the original eight (only the ninth is optional)', async () => {
    for (const key of ORIGINAL_EIGHT) {
      const moods: Record<string, number> = { ...V1_BACKUP.logs[0].moods }
      delete moods[key]
      const bad = { ...V1_BACKUP, logs: [{ ...V1_BACKUP.logs[0], moods }] }
      await expect(importJSON(JSON.stringify(bad))).rejects.toThrow(new RegExp(`moods\\.${key}`))
    }
    expect(await getAllLogs()).toEqual([])
  })

  it('version 1 accepts the ninth mood when present, and still validates it', async () => {
    const withNinth = { ...V1_BACKUP, logs: [{ ...V1_BACKUP.logs[0], moods: { ...V1_BACKUP.logs[0].moods, selfCriticism: 4 } }] }
    expect(await importJSON(JSON.stringify(withNinth))).toBe(1)
    expect((await getLog('2026-08-31'))!.moods.selfCriticism).toBe(4)
    await wipe()
    const bad = { ...V1_BACKUP, logs: [{ ...V1_BACKUP.logs[0], moods: { ...V1_BACKUP.logs[0].moods, selfCriticism: 7 } }] }
    await expect(importJSON(JSON.stringify(bad))).rejects.toThrow(/selfCriticism/)
    expect(await getAllLogs()).toEqual([])
  })

  it('version 2 round-trips the ninth mood next to an old eight-mood entry', async () => {
    await saveLog(makeLog('2026-09-30', { moods: { ...V1_BACKUP.logs[0].moods } as DayLog['moods'] })) // old entry
    await saveLog(makeLog('2026-10-01')) // every mood, ninth included
    await saveLog(makeLog('2026-10-02', { moods: { selfCriticism: 6 } })) // only the ninth
    const before = await getAllLogs()
    expect(before[1].moods.selfCriticism).toBeDefined()
    const json = await exportJSON()
    expect(JSON.parse(json).version).toBe(2)
    await wipe()
    expect(await importJSON(json)).toBe(3)
    const after = await getAllLogs()
    expect(after).toEqual(before)
    expect('selfCriticism' in after[0].moods).toBe(false)
    expect(Object.keys(after[1].moods)).toHaveLength(MOOD_ITEMS.length)
    expect(after[1].moods.selfCriticism).toBe(before[1].moods.selfCriticism)
    expect(after[2].moods).toEqual({ selfCriticism: 6 })
  })

  it('CSV has a selfCriticism column in MOOD_ITEMS order, blank for entries saved before it existed', async () => {
    const keys = MOOD_ITEMS.map((m) => m.key)
    const col = CSV_COLUMNS.indexOf('selfCriticism')
    expect(col).toBe(2 + keys.indexOf('selfCriticism'))
    expect(CSV_COLUMNS[col - 1]).toBe('sensitivity')
    expect(CSV_COLUMNS[col + 1]).toBe('lowInterest')

    await saveLog(makeLog('2026-09-30', { moods: { ...V1_BACKUP.logs[0].moods } as DayLog['moods'] })) // old entry
    await saveLog(makeLog('2026-10-01', { moods: { ...V1_BACKUP.logs[0].moods, selfCriticism: 5 } as DayLog['moods'] }))
    const lines = (await exportCSV()).split('\r\n')
    expect(lines[0].split(',')[col]).toBe('selfCriticism')
    const cells = (i: number) => Object.fromEntries(CSV_COLUMNS.map((c, j) => [c, lines[i].split(',')[j]]))
    const old = cells(1)
    expect(old.selfCriticism).toBe('')
    for (const key of ORIGINAL_EIGHT) expect(old[key]).toBe(String((V1_BACKUP.logs[0].moods as Record<string, number>)[key]))
    expect(cells(2).selfCriticism).toBe('5')
    for (const i of [1, 2]) expect(lines[i].split(',')).toHaveLength(CSV_COLUMNS.length)
  })
})
