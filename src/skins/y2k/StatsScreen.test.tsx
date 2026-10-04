import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { addDays, diffDays } from '../../logic/dates'
import { MOOD_ITEMS } from '../../types'
import type { DayLog, Flow, ISODate, MoodKey, Rating, Settings } from '../../types'
import { StatsScreen } from './StatsScreen'
import type { StatsView } from './StatsScreen'

// Window reads the sticker theme through useSyncExternalStore, which needs a server snapshot
// when rendered to a string; pin the default theme instead.
vi.mock('./prefs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./prefs')>()),
  useStickerTheme: () => 'girly',
}))

const SETTINGS: Settings = {
  reminderTime: '20:00',
  defaultCycleLength: 28,
  defaultPeriodLength: 5,
  startedOn: '2026-01-01',
  moodTracking: 'advanced',
}

const VIEWS: StatsView[] = ['overview', 'moods', 'body', 'habits']

const MOODS = Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, 2 as Rating])) as Record<MoodKey, Rating>

function day(date: ISODate, flow: Flow = 'none'): DayLog {
  return {
    date,
    flow,
    moods: { ...MOODS },
    physical: [],
    sleep: 'ok',
    energy: 'ok',
    cravings: 'none',
    loggedAt: 0,
    backfilled: false,
  }
}

/** 25 Sept..3 Oct, a 4-day period from 28 Sept. */
function fewLogs(): DayLog[] {
  const logs: DayLog[] = []
  for (let d = '2026-09-25'; d <= '2026-10-03'; d = addDays(d, 1)) {
    const off = diffDays('2026-09-28', d)
    logs.push(day(d, off >= 0 && off < 4 ? 'medium' : 'none'))
  }
  return logs
}

/** May – 10 Sept: five periods 28 days apart, irritability planted higher in the week before each. */
function monthsOfLogs(today: ISODate): DayLog[] {
  const starts = ['2026-05-04', '2026-06-01', '2026-06-29', '2026-07-27', '2026-08-24']
  const logs: DayLog[] = []
  for (let d = '2026-05-04'; d <= today; d = addDays(d, 1)) {
    const offsets = starts.map((s) => diffDays(s, d))
    const bleeding = offsets.some((o) => o >= 0 && o < 5)
    const pre = offsets.some((o) => o >= -7 && o <= -1)
    const post = offsets.some((o) => o >= 3 && o <= 9)
    const l = day(d, bleeding ? 'medium' : 'none')
    l.moods.irritability = pre ? 5 : post ? 2 : 3
    if (offsets.some((o) => o === 0 || o === 1)) l.physical = ['cramps']
    logs.push(l)
  }
  return logs
}

/** Sub-views are switched with buttons; static rendering picks one through `initialView`. */
function render(logs: DayLog[], today: ISODate, view: StatsView = 'overview'): string {
  return renderToStaticMarkup(
    <StatsScreen logs={logs} settings={SETTINGS} today={today} onOpenSettings={() => {}} initialView={view} />,
  )
}

/** Visible (and visually hidden) text, tags stripped. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
}

function expectNoJunk(html: string) {
  expect(html).not.toMatch(/NaN|undefined|Infinity|\[object/)
}

describe('StatsScreen', () => {
  it('no logs: one encouraging empty state on every view, no view switch', () => {
    for (const v of VIEWS) {
      const html = render([], '2026-10-03', v)
      expectNoJunk(html)
      expect(text(html)).toContain('Nothing to crunch yet')
      expect(html).not.toContain('stats-switch')
      expect(html).not.toContain('stats-heat')
    }
  })

  it('the view switch: four pressed-state buttons, the chosen one pressed', () => {
    for (const v of VIEWS) {
      const html = render(fewLogs(), '2026-10-03', v)
      const t = text(html)
      for (const label of ['Overview', 'Moods', 'Cycle & body', 'Habits']) expect(t).toContain(label)
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
      expect(html.match(/aria-pressed="false"/g)).toHaveLength(3)
      expect(t).toContain('not a diagnosis')
    }
  })

  it('a few logs: every view renders and says what is missing', () => {
    const logs = fewLogs()
    const today = '2026-10-03'
    for (const v of VIEWS) expectNoJunk(render(logs, today, v))

    // Overview: no big finding yet, so the unlock list, the streak line and the key numbers.
    const o = text(render(logs, today, 'overview'))
    expect(o).toContain('No big finding yet. 1 of 5 unlocked')
    expect(o).toContain("You're on a 9-day check-in streak, your best yet")
    expect(o).toContain('Typical cycle')
    expect(o).toContain('after 1 full cycle')

    // Moods: the period's days 4–10 are only just underway; mood by phase with thin phases.
    const mHtml = render(logs, today, 'moods')
    const m = text(mHtml)
    expect(m).toContain('days 4–10 are underway')
    expect(m).toContain('A pattern needs 2 compared cycles')
    expect(mHtml).toContain('<table class="stats-heat"')
    expect(m).toContain('not enough days yet')

    // Cycle & body: needs a completed cycle; levels still shown.
    const bHtml = render(logs, today, 'body')
    const b = text(bHtml)
    expect(b).toContain('your next one completes your first full cycle')
    expect(b).toContain('No body symptoms logged yet.')
    expect(bHtml).toMatch(/aria-label="Sleep, Menstrual: Poor 0%, OK 100%, Good 0% of \d+ days/)

    // Habits
    const h = text(render(logs, today, 'habits'))
    expect(h).toContain('Check-in rate')
    expect(h).toContain('100%')
    expect(h).toContain('8 of 8 days, through yesterday')
  })

  it('two scattered logs: the unlock checklist', () => {
    const html = render([day('2026-09-28', 'medium'), day('2026-10-01')], '2026-10-03')
    const t = text(html)
    expectNoJunk(html)
    expect(t).toContain('1 of 5 unlocked')
    expect(t).toMatch(/Done:\s+Log a period/)
    expect(t).toMatch(/To do:\s+Finish one full cycle/)
  })

  it('first check-in today: rate counts from tomorrow', () => {
    const html = render([day('2026-10-03')], '2026-10-03', 'habits')
    expectNoJunk(html)
    expect(text(html)).toContain('Counts from tomorrow.')
  })

  describe('several months with a planted premenstrual rise', () => {
    const today = '2026-09-10'
    const logs = monthsOfLogs(today)

    it('every view renders cleanly', () => {
      for (const v of VIEWS) expectNoJunk(render(logs, today, v))
    })

    it('overview: the rise is the headline, other highlights are one line each, no duplicates', () => {
      const html = render(logs, today, 'overview')
      const t = text(html)
      expect(html).toContain('stats-head')
      expect(t).toContain('Irritable / angry runs higher the week before your period')
      expect(t).toContain('+3.0')
      expect(t).toContain('5.0 before vs 2.0 after it starts · higher in 4 of 4 cycles')
      expect(t).toContain('See all moods')
      // Cramps (phase symptom), streak and coverage as compact lines.
      expect(t).toContain('Cramps on')
      expect(t).toContain('Checked in on')
      // Typical cycle / period / regularity live on the tiles, not repeated as highlight lines.
      expect(t).toContain('Typical cycle')
      expect(t).toContain('Regularity')
      expect(t).toContain('Typical period')
      expect(html.match(/class="stats-hl__item"/g)).toHaveLength(3)
      expect(t).not.toContain('Mood patterns unlock')
    })

    it('moods: every mood plus the average as compact rows, then mood by phase', () => {
      const html = render(logs, today, 'moods')
      const t = text(html)
      expect(t).not.toContain('early look')
      expect(t).toContain('From 4 cycles, biggest rise first')
      const list = html.slice(html.indexOf('stats-db-list'), html.indexOf('stats-mood'))
      // "All moods (avg)" + one row per mood.
      expect(list.match(/class="stats-db(?: stats-db--total)?"/g)).toHaveLength(MOOD_ITEMS.length + 1)
      // Mood by phase: one heat row per mood, then the "All moods" total.
      const heatStart = html.indexOf('<table class="stats-heat"')
      const heatBody = html.slice(heatStart, html.indexOf('</tbody>', heatStart))
      expect(heatBody.match(/<tr><th scope="row"/g)).toHaveLength(MOOD_ITEMS.length)
      expect(heatBody.match(/<tr class="stats-heat__total">/g)).toHaveLength(1)
      for (const m of MOOD_ITEMS) expect(text(list)).toContain(m.label)
      // Irritability ranks first.
      const first = list.indexOf('Irritable / angry')
      for (const other of MOOD_ITEMS.filter((m) => m.key !== 'irritability')) {
        expect(list.indexOf(other.label)).toBeGreaterThan(first)
      }
      expect(t).toContain('5.0 → 2.0 · 4/4')
      expect(t).toContain('5.0 before, 2.0 after, higher before in 4 of 4 cycles')
      expect(html).toContain('<table class="stats-heat"')
      expect(t).toContain('Period by period (5)')
    })

    it('cycle & body: six numbers, a bar per cycle, symptoms and levels by phase', () => {
      const html = render(logs, today, 'body')
      const t = text(html)
      for (const label of ['Typical cycle', 'Shortest', 'Longest', 'Regularity', 'Typical period', 'Periods logged']) {
        expect(t).toContain(label)
      }
      expect(html.match(/class="stats-chart__bar"/g)).toHaveLength(4)
      expect(t).toContain('Cycle starting')
      expect(t).toContain('Cramps')
      expect(html).toContain('stats-heat--body')
      expect(html.match(/role="img"/g)?.length).toBe(15)
    })

    it('habits: rate, streaks, days logged, filled in later', () => {
      const t = text(render(logs, today, 'habits'))
      for (const label of ['Check-in rate', 'Current streak', 'Longest streak', 'Days logged', 'Filled in later']) {
        expect(t).toContain(label)
      }
    })
  })
})
