import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyLog } from '../../core/format'
import { MOODS_OFF_COPY } from '../../core/stats'
import { FULL_SCALE } from '../../core/useCheckinForm'
import type { CheckinForm } from '../../core/useCheckinForm'
import { addDays, diffDays } from '../../logic/dates'
import { BASIC_MOOD_KEYS, MOOD_ITEMS } from '../../types'
import type { DayLog, Flow, ISODate, MoodKey, MoodTracking, Rating, Settings } from '../../types'
import { CalendarScreen } from './CalendarScreen'
import { CheckinModal } from './CheckinModal'
import { SettingsScreen } from './SettingsScreen'
import { StatsScreen } from './StatsScreen'
import type { StatsView } from './StatsScreen'

// Mood tracking levels in the Y2K skin: Settings control, check-in at each level, day bar and
// stats for untracked moods. The check-in form loads in an effect (which static rendering
// doesn't run), so the hook is swapped for one that returns a loaded form built with the real
// mood logic (moodItemsFor).

const form = vi.hoisted(() => ({ log: null as DayLog | null }))

vi.mock('../../core/useCheckinForm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/useCheckinForm')>()
  return {
    ...actual,
    useCheckinForm: (_date: string, _onSaved: unknown, level: MoodTracking): CheckinForm => ({
      log: form.log,
      previous: null,
      isEdit: false,
      loadError: null,
      retryLoad: () => {},
      update: () => {},
      moodTracking: level,
      moodItems: actual.moodItemsFor(form.log, level, () => {}),
      setMood: () => {},
      togglePhysical: () => {},
      copyPrevious: () => {},
      saving: false,
      saveError: null,
      canSave: true,
      save: async () => {},
    }),
  }
})

// Prefs read through useSyncExternalStore need a server snapshot when rendered to a string.
vi.mock('./prefs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./prefs')>()),
  useStickerTheme: () => 'girly',
  useTitleStyle: () => 'cutout',
  useBackground: () => 'chrome',
}))

const TODAY = '2026-10-03'
const NOW = new Date(2026, 9, 3, 21, 15)
const settings = (moodTracking: MoodTracking): Settings => ({
  reminderTime: '20:00',
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  startedOn: '2026-01-01',
  moodTracking,
})
const ALL = (r: Rating) => Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, r])) as Record<MoodKey, Rating>
/** Moods asked only at the Advanced level. */
const ADVANCED_ONLY = MOOD_ITEMS.length - BASIC_MOOD_KEYS.length

function day(date: ISODate, moods: DayLog['moods'], flow: Flow = 'none'): DayLog {
  return { date, flow, moods, physical: [], sleep: 'ok', energy: 'ok', cravings: 'none', loggedAt: 0, backfilled: false }
}

/** May – 10 Sept, five periods 28 days apart; moods per `level(date)`. */
function history(today: ISODate, level: (d: ISODate) => MoodTracking): DayLog[] {
  const starts = ['2026-05-04', '2026-06-01', '2026-06-29', '2026-07-27', '2026-08-24']
  const logs: DayLog[] = []
  for (let d = '2026-05-04'; d <= today; d = addDays(d, 1)) {
    const offsets = starts.map((s) => diffDays(s, d))
    const pre = offsets.some((o) => o >= -7 && o <= -1)
    const lv = level(d)
    const moods: DayLog['moods'] =
      lv === 'off'
        ? {}
        : lv === 'basic'
          ? { moodSwings: 1, irritability: pre ? 5 : 1, sadness: 3, anxiety: 1 }
          : { ...ALL(2), irritability: pre ? 5 : 2 }
    logs.push(day(d, moods, offsets.some((o) => o >= 0 && o < 5) ? 'medium' : 'none'))
  }
  return logs
}

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
const noJunk = (html: string) => expect(html).not.toMatch(/NaN|undefined|Infinity|\[object/)
const pressed = (html: string, labels: string[]) =>
  [...html.matchAll(/aria-pressed="true">([^<]+)</g)].map((m) => m[1]).filter((l) => labels.includes(l))

const checkin = (level: MoodTracking) =>
  renderToStaticMarkup(
    <CheckinModal date={TODAY} today={TODAY} blocking={false} moodTracking={level} onClose={() => {}} onSaved={async () => {}} />,
  )

describe('Y2K settings: mood tracking', () => {
  for (const level of ['off', 'basic', 'advanced'] as const) {
    it(`${level}: three real buttons in the Check-in window, the current one pressed, one-line explanation`, () => {
      const html = renderToStaticMarkup(<SettingsScreen settings={settings(level)} pets={[]} today={TODAY} onChanged={async () => {}} />)
      noJunk(html)
      const t = text(html)
      expect(t).toContain('Mood tracking')
      expect(t.indexOf('Mood tracking')).toBeLessThan(t.indexOf('Your data')) // inside the Check-in window
      for (const l of ['Off', 'Basic', 'Advanced']) expect(html).toMatch(new RegExp(`<button type="button" class="segment[^"]*" aria-pressed="(true|false)">${l}</button>`))
      expect(pressed(html, ['Off', 'Basic', 'Advanced'])).toEqual([{ off: 'Off', basic: 'Basic', advanced: 'Advanced' }[level]])
      const hint = { off: 'No mood questions', basic: 'Four moods', advanced: `All ${MOOD_ITEMS.length} moods` }[level]
      expect(t).toContain(hint)
      expect(t).not.toMatch(/All eight moods/)
    })
  }
})

describe('Y2K check-in per level', () => {
  beforeEach(() => {
    form.log = null
  })

  it('advanced (default): every mood on the 1–6 scale, one row each', () => {
    form.log = day(TODAY, ALL(1))
    const html = checkin('advanced')
    noJunk(html)
    for (const m of MOOD_ITEMS) expect(text(html)).toContain(m.label)
    expect(html.match(/class="rating rating--(?:\d|none)"/g)).toHaveLength(MOOD_ITEMS.length)
    expect(html.match(/class="rating__dot/g)).toHaveLength(MOOD_ITEMS.length * FULL_SCALE.length)
    expect(html).not.toContain('Somewhat')
  })

  it('advanced, new entry: the ninth mood is a row like the others, "not at all" by default', () => {
    form.log = emptyLog(TODAY, 'advanced')
    const html = checkin('advanced')
    noJunk(html)
    const t = text(html)
    expect(html.match(/class="rating rating--1"/g)).toHaveLength(MOOD_ITEMS.length)
    expect(html.match(/rating__dot is-selected/g)).toHaveLength(MOOD_ITEMS.length)
    expect(t).not.toContain('Not rated')
    // In MOOD_ITEMS order: after "Sensitive to rejection", before "Lost interest in things".
    expect(t.indexOf('Negative self-talk')).toBeGreaterThan(t.indexOf('Sensitive to rejection'))
    expect(t.indexOf('Negative self-talk')).toBeLessThan(t.indexOf('Lost interest in things'))
  })

  it('basic: only the four moods, each Not at all / Somewhat / A lot, nearest answer shown', () => {
    form.log = day(TODAY, { moodSwings: 2, irritability: 4, sadness: 6, anxiety: 1, overwhelmed: 5 })
    const html = checkin('basic')
    noJunk(html)
    const t = text(html)
    for (const k of BASIC_MOOD_KEYS) expect(t).toContain(MOOD_ITEMS.find((m) => m.key === k)!.label)
    for (const m of MOOD_ITEMS.filter((x) => !BASIC_MOOD_KEYS.includes(x.key))) expect(t).not.toContain(m.label)
    expect(html).not.toContain('rating__dot')
    expect(t).not.toContain('Negative self-talk')
    expect(html.match(/>Somewhat</g)).toHaveLength(BASIC_MOOD_KEYS.length)
    expect(pressed(html, ['Not at all', 'Somewhat', 'A lot']).sort()).toEqual(['A lot', 'Not at all', 'Not at all', 'Somewhat'])
  })

  it('off: no mood section at all, the rest of the form as usual', () => {
    form.log = day(TODAY, {})
    const html = checkin('off')
    noJunk(html)
    const t = text(html)
    expect(html).not.toContain('checkin__section--moods')
    for (const m of MOOD_ITEMS) expect(t).not.toContain(m.label)
    for (const s of ['Bleeding', 'Body', 'Sleep', 'Energy', 'Cravings', 'Save']) expect(t).toContain(s)
  })

  it('advanced, editing an entry logged at a lower level: unrated moods show nothing selected', () => {
    form.log = day(TODAY, { irritability: 5 })
    const html = checkin('advanced')
    expect(text(html).match(/Not rated/g)).toHaveLength(MOOD_ITEMS.length - 1)
    expect(html.match(/rating__dot is-selected/g)).toHaveLength(1)
  })

  it('advanced, editing an entry saved before the ninth mood: only that one shows nothing selected', () => {
    const { selfCriticism: _n, ...originalEight } = ALL(3)
    void _n
    form.log = day(TODAY, originalEight)
    const html = checkin('advanced')
    noJunk(html)
    expect(text(html).match(/Not rated/g)).toHaveLength(1)
    expect(html.match(/rating__dot is-selected/g)).toHaveLength(MOOD_ITEMS.length - 1)
    // The unrated row is the ninth mood's.
    expect(html).toMatch(/class="rating rating--none">(?:(?!class="rating rating--).)*?id="rating-selfCriticism"/s)
  })
})

describe('Y2K calendar day bar: only rated moods', () => {
  it('a Basic day lists its rated moods; an Off day lists none', () => {
    const basic = renderToStaticMarkup(
      <CalendarScreen logs={[day(TODAY, { irritability: 5, sadness: 1 })]} settings={settings('basic')} today={TODAY} now={NOW} onEdit={() => {}} />,
    )
    noJunk(basic)
    expect(text(basic)).toContain('Irritable / angry: severe')
    expect(text(basic)).not.toContain('Overwhelmed')
    const off = renderToStaticMarkup(
      <CalendarScreen logs={[day(TODAY, {})]} settings={settings('off')} today={TODAY} now={NOW} onEdit={() => {}} />,
    )
    noJunk(off)
    expect(text(off)).toContain('Nothing to report')
  })
})

describe('Y2K stats with mood levels', () => {
  const today = '2026-09-10'
  const stats = (logs: DayLog[], level: MoodTracking, view: StatsView) =>
    renderToStaticMarkup(<StatsScreen logs={logs} settings={settings(level)} today={today} onOpenSettings={() => {}} initialView={view} />)

  it('off with no mood history: one friendly line on Overview and Moods, pointing to Settings', () => {
    const logs = history(today, () => 'off')
    for (const view of ['overview', 'moods', 'body', 'habits'] as const) noJunk(stats(logs, 'off', view))
    const o = text(stats(logs, 'off', 'overview'))
    expect(o).toContain(MOODS_OFF_COPY)
    expect(o).toContain('Turn it on in Settings')
    expect(o).not.toContain('Mood patterns unlock')
    expect(o).not.toContain('for mood patterns')
    const mHtml = stats(logs, 'off', 'moods')
    expect(text(mHtml)).toContain(MOODS_OFF_COPY)
    expect(mHtml).not.toContain('stats-heat')
    expect(text(mHtml)).not.toContain('Before vs after')
  })

  it('off with mood history: the mood stats keep working', () => {
    const logs = history(today, (d) => (d < '2026-08-01' ? 'advanced' : 'off'))
    const html = stats(logs, 'off', 'moods')
    noJunk(html)
    expect(text(html)).not.toContain(MOODS_OFF_COPY)
    expect(html).toContain('stats-heat')
    expect(text(html)).toContain('Irritable / angry')
  })

  it('basic only: the advanced-only moods say "not tracked" instead of a number', () => {
    const logs = history(today, () => 'basic')
    const html = stats(logs, 'basic', 'moods')
    noJunk(html)
    const t = text(html)
    // One before/after row + one heat row per advanced-only mood.
    expect(t.match(/not tracked/g)).toHaveLength(2 * ADVANCED_ONLY)
    expect(html.match(/stats-heat__untracked/g)).toHaveLength(ADVANCED_ONLY)
    expect(t).not.toContain('not enough ratings yet')
  })

  it('advanced history from before the ninth mood: it says "not tracked"; once rated it gets numbers', () => {
    const old = history(today, () => 'advanced').map((l) => {
      const { selfCriticism: _n, ...moods } = l.moods
      void _n
      return { ...l, moods }
    })
    const before = stats(old, 'advanced', 'moods')
    noJunk(before)
    expect(text(before).match(/not tracked/g)).toHaveLength(2)
    expect(before.match(/stats-heat__untracked/g)).toHaveLength(1)
    expect(before).toMatch(/Negative self-talk\s*<\/th><td[^>]*stats-heat__untracked/)

    const later = old.map((l) => (l.date >= '2026-07-01' ? { ...l, moods: { ...l.moods, selfCriticism: 2 as Rating } } : l))
    const after = stats(later, 'advanced', 'moods')
    noJunk(after)
    expect(text(after)).not.toContain('not tracked')
    expect(after).not.toContain('stats-heat__untracked')
    expect(text(after)).toContain('Negative self-talk')
  })
})
