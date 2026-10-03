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
    expect(parsed).toMatchObject({ app: 'burn-book', version: 1 })
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
