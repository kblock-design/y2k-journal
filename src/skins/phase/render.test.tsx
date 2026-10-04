import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { formatDay, formatLongDate } from '../../core/format'
import { SKINS } from '../../core/skin'
import { addDays, diffDays } from '../../logic/dates'
import type { DayLog, Flow, ISODate, MoodKey, Rating, Settings } from '../../types'
import { MOOD_ITEMS } from '../../types'
import { CalendarScreen } from './CalendarScreen'
import { CheckinSheet } from './CheckinSheet'
import { HomeScreen } from './HomeScreen'
import { Nav } from './Nav'
import { COLOURWAYS, DEFAULT_COLOURWAY, colourwayPref } from './prefs'
import { SettingsScreen } from './SettingsScreen'
import { StatsScreen } from './StatsScreen'
import type { StatsView } from './StatsScreen'

const SETTINGS: Settings = { reminderTime: '20:00', defaultCycleLength: 28, defaultPeriodLength: 5, startedOn: '2026-01-01', moodTracking: 'advanced' }
const TODAY = '2026-10-03'
const NOW = new Date(2026, 9, 3, 21, 15)
const MOODS = Object.fromEntries(MOOD_ITEMS.map((m) => [m.key, 2 as Rating])) as Record<MoodKey, Rating>

function day(date: ISODate, flow: Flow = 'none'): DayLog {
  return { date, flow, moods: { ...MOODS }, physical: [], sleep: 'ok', energy: 'ok', cravings: 'none', loggedAt: 0, backfilled: false }
}

/** 25 Sept – 3 Oct with a 4-day period from 28 Sept. */
function fewLogs(): DayLog[] {
  const logs: DayLog[] = []
  for (let d = '2026-09-25'; d <= TODAY; d = addDays(d, 1)) {
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
    if (offsets.some((o) => o === 2)) l.sleep = 'poor'
    logs.push(l)
  }
  return logs
}

const noop = () => {}
const asyncNoop = async () => {}

/** Visible text plus attribute values, tags stripped. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

function expectNoJunk(html: string) {
  expect(html).not.toMatch(/NaN|undefined|Infinity|\[object/)
}

function home(logs: DayLog[], today = TODAY, now = NOW) {
  const logged = logs.some((l) => l.date === today)
  return renderToStaticMarkup(
    <HomeScreen
      logs={logs}
      settings={SETTINGS}
      today={today}
      now={now}
      todayLogged={logged}
      noLogsYet={logs.length === 0}
      onCheckin={noop}
      onOpenSettings={noop}
    />,
  )
}

const calendar = (logs: DayLog[], today = TODAY, now = NOW) =>
  renderToStaticMarkup(<CalendarScreen logs={logs} settings={SETTINGS} today={today} now={now} onOpenDay={noop} />)

/** Stats sub-views are switched with buttons; static rendering picks one through `initialView`. */
const STATS_VIEWS: StatsView[] = ['overview', 'moods', 'body', 'habits']
const stats = (logs: DayLog[], today = TODAY, view: StatsView = 'overview') =>
  renderToStaticMarkup(
    <StatsScreen logs={logs} settings={SETTINGS} today={today} onOpenSettings={noop} initialView={view} />,
  )

describe('Phase home', () => {
  it('no logs: welcome, empty ring, big check-in button, daily cards', () => {
    const html = home([])
    const t = text(html)
    expectNoJunk(html)
    expect(t).toContain('Phase')
    expect(t).toContain('Welcome to Phase')
    expect(t).toContain('Import a backup in Settings')
    expect(t).toContain('No period logged yet')
    expect(t).toContain('Check in')
    expect(t).toContain('Did you know?')
    expect(t).not.toContain('Your rhythm')
    expect(t).toContain('Good evening')
  })

  it('a few logs: cycle day, phase, estimate, next period, done state and streak', () => {
    const html = home(fewLogs())
    const t = text(html)
    expectNoJunk(html)
    expect(html).toContain('class="ph-ring__num">6<')
    expect(t).toContain('Follicular')
    expect(t).toContain('estimate')
    expect(t).toContain('Next period in 23 days')
    expect(t).toContain('Today’s check-in is done')
    expect(t).toContain('Edit today')
    expect(t).toContain('Current streak: 9 days')
    expect(t).toContain('9 days in a row, your best run yet.')
    expect(t).not.toContain('Welcome to Phase')
    // Ring: four phase arcs plus the today marker.
    expect(html.match(/ph-arc--solid/g)?.length).toBe(4)
    expect(html).toContain('ph-ring__knob')
  })

  it('several months of logs, then a late period', () => {
    const logs = monthsOfLogs('2026-09-10')
    const html = home(logs, '2026-09-10', new Date(2026, 8, 10, 9))
    expectNoJunk(html)
    const t = text(html)
    expect(t).toContain('Good morning')
    expect(t).not.toContain('estimate')
    expect(t).toMatch(/Day\s+18/)

    const late = home(logs, '2026-09-25', new Date(2026, 8, 25, 13))
    expectNoJunk(late)
    expect(text(late)).toContain('Period 4 days late')
    expect(late).toContain('class="ph-ring__num">33<')
  })
})

describe('Phase calendar', () => {
  it('no logs: month, key control, pinned bar with nothing logged', () => {
    const html = calendar([])
    const t = text(html)
    expectNoJunk(html)
    expect(t).toContain('October 2026')
    expect(html).toMatch(/aria-expanded="false"[^>]*>.*Key/)
    expect(t).toContain('Nothing logged')
    expect(t).toContain('Add entry')
    // Every day of October, future days disabled.
    expect(html.match(/class="ph-day[ "]/g)?.length).toBe(31 + 4)
    expect(html).toContain(`aria-label="${formatDay('2026-10-04')}" aria-pressed="false" disabled=""`)
  })

  it('logged days: phases, bleeding marks, selection, highlights in the pinned bar', () => {
    const html = calendar(fewLogs())
    const t = text(html)
    expectNoJunk(html)
    expect(html).toContain('ph-tone--pink')
    expect(html).toContain('is-predicted')
    expect(html).toContain('ph-day__drop')
    expect(html).toContain('aria-current="date"')
    expect(t).toContain('Mood swings: minimal')
    expect(t).toContain('Edit')
    expect(t).toContain('Follicular phase')
  })

  it('several months: no junk', () => {
    expectNoJunk(calendar(monthsOfLogs('2026-09-10'), '2026-09-10', new Date(2026, 8, 10, 12)))
  })
})

describe('Phase stats', () => {
  it('no logs: one friendly empty state on every view, no view switch', () => {
    for (const v of STATS_VIEWS) {
      const html = stats([], TODAY, v)
      expectNoJunk(html)
      expect(text(html)).toContain('Nothing to count yet')
      expect(html).not.toContain('ph-heat')
      expect(html).not.toContain('ph-stats-switch')
    }
  })

  it('view switch: four buttons, the chosen one pressed, footer on every view', () => {
    for (const v of STATS_VIEWS) {
      const html = stats(fewLogs(), TODAY, v)
      const t = text(html)
      for (const label of ['Overview', 'Moods', 'Cycle & body', 'Habits']) expect(t).toContain(label)
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
      expect(html.match(/aria-pressed="false"/g)).toHaveLength(3)
      expect(t).toContain('not a diagnosis')
    }
  })

  it('a few logs: every view renders and says what is missing', () => {
    const logs = fewLogs()
    for (const v of STATS_VIEWS) expectNoJunk(stats(logs, TODAY, v))

    const o = text(stats(logs, TODAY, 'overview'))
    expect(o).toContain('No big finding yet · 1 of 5 unlocked')
    expect(o).toContain('You’re on a 9-day check-in streak, your best yet.')
    expect(o).toContain('after 1 full cycle')

    const mHtml = stats(logs, TODAY, 'moods')
    const m = text(mHtml)
    expect(m).toContain('days 4–10 are underway')
    expect(m).toContain('A pattern needs 2 compared cycles')
    expect(mHtml).toContain('<table class="ph-heat"')
    expect(m).toContain('not enough days yet')

    const bHtml = stats(logs, TODAY, 'body')
    const b = text(bHtml)
    expect(b).toContain('your next one completes your first full cycle')
    expect(b).toContain('No body symptoms logged yet.')
    expect(bHtml).toMatch(/aria-label="Sleep, Menstrual: Poor 0%, OK 100%, Good 0% of \d+ days/)

    const h = text(stats(logs, TODAY, 'habits'))
    expect(h).toContain('Current streak')
    expect(h).toContain('8 of 8 days, through yesterday.')
  })

  it('two scattered logs: the unlock checklist', () => {
    const html = stats([day('2026-09-28', 'medium'), day('2026-10-01')])
    const t = text(html)
    expectNoJunk(html)
    expect(t).toContain('1 of 5 unlocked')
    expect(t).toMatch(/Done:\s+Log a period/)
    expect(t).toMatch(/To do:\s+Finish one full cycle/)
  })

  it('first check-in today: rate counts from tomorrow, no zeros', () => {
    const habits = stats([day(TODAY)], TODAY, 'habits')
    expectNoJunk(habits)
    expect(text(habits)).toContain('Counts from tomorrow.')
    const moods = stats([day(TODAY)], TODAY, 'moods')
    expectNoJunk(moods)
    expect(text(moods)).toContain('No period logged yet')
  })

  describe('several months', () => {
    const today = '2026-09-10'
    const logs = monthsOfLogs(today)

    it('every view renders cleanly', () => {
      for (const v of STATS_VIEWS) expectNoJunk(stats(logs, today, v))
    })

    it('overview: the rise as the headline, other highlights one line each, key numbers once', () => {
      const html = stats(logs, today, 'overview')
      const t = text(html)
      expect(html).toContain('ph-headline')
      expect(t).toContain('Irritable / angry tends to run higher the week before your period')
      expect(t).toContain('+3.0')
      expect(t).toContain('5.0 before vs 2.0 after it starts · held in 4 of 4 cycles')
      expect(t).toContain('See all moods')
      expect(t).toContain('Cramps on')
      expect(t).toContain('Checked in on')
      for (const label of ['Typical cycle', 'Typical period', 'Regularity']) expect(t).toContain(label)
      // Cycle / period / regularity highlights are on the tiles, not repeated as lines.
      expect(html.match(/class="ph-hl__item"/g)).toHaveLength(3)
    })

    it('moods: every mood plus the average as compact rows, then heat grid and period by period', () => {
      const html = stats(logs, today, 'moods')
      const t = text(html)
      expect(t).not.toContain('early look')
      expect(t).toContain('From 4 cycles, biggest rise first')
      const list = html.slice(html.indexOf('ph-db-list'), html.indexOf('<table'))
      // "All moods (avg)" + one row per mood.
      expect(list.match(/class="ph-db(?: ph-db--total)?"/g)).toHaveLength(MOOD_ITEMS.length + 1)
      for (const m of MOOD_ITEMS) expect(text(list)).toContain(m.label)
      const first = list.indexOf('Irritable / angry')
      for (const other of MOOD_ITEMS.filter((m) => m.key !== 'irritability')) {
        expect(list.indexOf(other.label)).toBeGreaterThan(first)
      }
      expect(t).toContain('5.0 → 2.0 · 4/4')
      expect(t).toContain('5.0 before, 2.0 after, higher before in 4 of 4 cycles')
      expect(html).toContain('<table class="ph-heat"')
      expect(t).toContain('Period by period (5)')
    })

    it('cycle & body: six numbers, a column per cycle, symptoms and levels by phase', () => {
      const html = stats(logs, today, 'body')
      const t = text(html)
      for (const label of ['Typical cycle', 'Shortest', 'Longest', 'Regularity', 'Typical period', 'Periods logged']) {
        expect(t).toContain(label)
      }
      expect(html.match(/class="ph-cchart__bar"/g)).toHaveLength(4)
      expect(t).toContain(`Cycle starting ${formatLongDate('2026-05-04')}: 28 days`)
      expect(t).toContain('Cramps')
      expect(html).toContain('ph-heat--body')
      expect(html.match(/role="img"/g)?.length).toBe(15)
    })

    it('habits: streaks, rate, days logged, filled in later', () => {
      const t = text(stats(logs, today, 'habits'))
      for (const label of ['Current streak', 'Check-in rate', 'Longest streak', 'Days logged', 'Filled in later']) {
        expect(t).toContain(label)
      }
    })
  })
})

describe('Phase check-in, nav and settings', () => {
  it('blocking check-in: no close control, explains why', () => {
    const html = renderToStaticMarkup(
      <CheckinSheet date={TODAY} today={TODAY} moodTracking="advanced" blocking onClose={noop} onSaved={asyncNoop} />,
    )
    const t = text(html)
    expectNoJunk(html)
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).not.toContain('aria-label="Close"')
    expect(t).toContain('Time for tonight’s check-in.')
    expect(t).toContain('Nothing to report? Just tap Save.')
    expect(t).toContain('Today — ')
    expect(t).toContain('Loading…')
  })

  it('voluntary backfill check-in: closable', () => {
    const html = renderToStaticMarkup(
      <CheckinSheet date="2026-10-01" today={TODAY} moodTracking="advanced" blocking={false} onClose={noop} onSaved={asyncNoop} />,
    )
    expectNoJunk(html)
    expect(html).toContain('aria-label="Close"')
    expect(text(html)).not.toContain('Time for tonight')
  })

  it('nav: four labelled destinations and the centre check-in', () => {
    const open = renderToStaticMarkup(<Nav tab="stats" onChange={noop} todayLogged={false} onCheckin={noop} />)
    for (const label of ['Home', 'Calendar', 'Stats', 'Settings']) expect(text(open)).toContain(label)
    expect(open).toContain('aria-current="page"')
    expect(open).toContain('aria-label="Check in for today"')
    const done = renderToStaticMarkup(<Nav tab="home" onChange={noop} todayLogged onCheckin={noop} />)
    expect(done).toContain('Edit today')
  })

  it('settings: every skin listed with one marked, privacy note, data actions', () => {
    const html = renderToStaticMarkup(<SettingsScreen settings={SETTINGS} pets={[]} today={TODAY} onChanged={asyncNoop} />)
    const t = text(html)
    expectNoJunk(html)
    for (const s of SKINS) {
      expect(t).toContain(s.label)
      expect(t).toContain(s.description)
    }
    const skins = html.match(/<button[^>]*class="ph-row ph-row--button ph-skin[^"]*"[^>]*>/g) ?? []
    expect(skins).toHaveLength(SKINS.length)
    expect(skins.filter((b) => b.includes('aria-pressed="true"'))).toHaveLength(1)
    expect(t).toContain('(in use)')
    expect(t).toContain('never sent anywhere')
    expect(t).toContain('Export backup')
    expect(t).toContain('Export spreadsheet')
    expect(t).toContain('Import backup…')
    expect(html).toContain('value="20:00"')
    expect(html).toContain('value="28"')
  })
})

describe('Phase colourways', () => {
  afterEach(() => colourwayPref.set(DEFAULT_COLOURWAY))

  const settings = () =>
    renderToStaticMarkup(<SettingsScreen settings={SETTINGS} pets={[]} today={TODAY} onChanged={asyncNoop} />)

  /** The picker's buttons: [key from the preview, pressed?, visible label]. */
  function picker(html: string): { key: string; pressed: boolean; label: string }[] {
    const re = /<button[^>]*class="ph-cw__opt[^"]*" aria-pressed="(true|false)"[^>]*>.*?data-ph-colour="([a-z]+)".*?class="ph-cw__label">([^<]+)</g
    return [...html.matchAll(re)].map((m) => ({ key: m[2], pressed: m[1] === 'true', label: m[3] }))
  }

  it('five distinct colourways, Cream first and the default', () => {
    expect(COLOURWAYS.map((c) => c.key)).toEqual(['cream', 'cobalt', 'hotpink', 'forest', 'noir'])
    expect(COLOURWAYS.map((c) => c.label)).toEqual(['Cream', 'Cobalt', 'Hot pink', 'Forest', 'Noir'])
    expect(new Set(COLOURWAYS.map((c) => c.themeColor)).size).toBe(5)
    expect(DEFAULT_COLOURWAY).toBe('cream')
    expect(colourwayPref.get()).toBe('cream')
    for (const c of COLOURWAYS) expect(c.themeColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('the picker lists all five with labels, Cream pressed by default', () => {
    const html = settings()
    expect(text(html)).toContain('Appearance')
    expect(text(html)).toContain('Colour')
    const opts = picker(html)
    expect(opts.map((o) => o.key)).toEqual(COLOURWAYS.map((c) => c.key))
    expect(opts.map((o) => o.label)).toEqual(COLOURWAYS.map((c) => c.label))
    expect(opts.filter((o) => o.pressed).map((o) => o.key)).toEqual(['cream'])
  })

  for (const c of COLOURWAYS) {
    it(`${c.key}: every screen renders and the picker marks it`, () => {
      colourwayPref.set(c.key)
      expect(colourwayPref.get()).toBe(c.key)
      const html = settings()
      expectNoJunk(html)
      expect(picker(html).filter((o) => o.pressed).map((o) => o.key)).toEqual([c.key])
      for (const out of [home(fewLogs()), calendar(fewLogs()), stats(fewLogs(), TODAY, 'moods'), stats(fewLogs(), TODAY, 'body')]) {
        expectNoJunk(out)
      }
      expect(renderToStaticMarkup(<Nav tab="home" onChange={noop} todayLogged={false} onCheckin={noop} />)).toContain('ph-nav')
    })
  }

  it('text laid over a phase shape carries that shape’s tone (for its own text colour)', () => {
    const html = home(fewLogs())
    for (const t of ['yellow', 'green', 'pink', 'blue']) expect(html).toMatch(new RegExp(`class="ph-shapes__item [^"]* ph-tone--${t}"`))
    expect(stats([], TODAY)).toMatch(/class="ph-steps__badge ph-tone--\w+"/)
    expect(stats(monthsOfLogs('2026-09-10'), '2026-09-10')).toMatch(/class="ph-headline__badge ph-tone--\w+"/)
  })

  it('heat cells mix the colourway’s ramp ends instead of fixed colours', () => {
    const html = stats(monthsOfLogs('2026-09-10'), '2026-09-10', 'moods')
    expect(html).toContain('color-mix(in srgb, var(--heat-1)')
    expect(html).not.toMatch(/background:rgb\(/)
  })
})
