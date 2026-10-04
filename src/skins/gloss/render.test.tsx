import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDay } from '../../core/format'
import { createPref } from '../../core/prefs'
import { SKINS } from '../../core/skin'
import { addDays, diffDays } from '../../logic/dates'
import type { DayLog, Flow, ISODate, MoodKey, Rating, Settings } from '../../types'
import { MOOD_ITEMS } from '../../types'
import { CalendarScreen } from './CalendarScreen'
import { CheckinSheet } from './CheckinSheet'
import { HomeScreen } from './HomeScreen'
import { Nav } from './Nav'
import { applyColourway, colourwayPref, COLOURWAYS, DEFAULT_COLOURWAY, pixelLabelsPref, themeColorFor } from './prefs'
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

/** 4 May – `today`: five periods 28 days apart, irritability planted higher in the week before each. */
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
    if (offsets.some((o) => o === 12)) l.backfilled = true
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
  expect(html).not.toMatch(/NaN|undefined|Infinity|\[object|null/)
}

function home(logs: DayLog[], today = TODAY) {
  return renderToStaticMarkup(
    <HomeScreen
      logs={logs}
      settings={SETTINGS}
      today={today}
      todayLogged={logs.some((l) => l.date === today)}
      noLogsYet={logs.length === 0}
      onCheckin={noop}
      onOpenSettings={noop}
    />,
  )
}

const calendar = (logs: DayLog[], today = TODAY, now = NOW) =>
  renderToStaticMarkup(<CalendarScreen logs={logs} settings={SETTINGS} today={today} now={now} onOpenDay={noop} />)

const stats = (logs: DayLog[], view: StatsView, today = TODAY) =>
  renderToStaticMarkup(<StatsScreen logs={logs} settings={SETTINGS} today={today} onOpenSettings={noop} initialView={view} />)

const VIEWS: StatsView[] = ['overview', 'moods', 'body', 'habits']

describe('Gloss home', () => {
  it('no logs: welcome, preview disc with a blank LCD, big Check in, daily cards, no streak', () => {
    const html = home([])
    const t = text(html)
    expectNoJunk(html)
    expect(t).toContain('Gloss')
    expect(t).toContain('Welcome to Gloss')
    expect(t).toContain('Import a backup in Settings')
    expect(t).toContain('No period logged yet')
    expect(html).toContain('gl-disc--preview')
    expect(html).toContain('class="gl-lcd__value">--<')
    expect(html).not.toContain('gl-disc__bead')
    expect(t).toContain('Check in')
    expect(t).toContain('Today’s quote')
    expect(t).toContain('Did you know?')
    expect(t).not.toContain('Streak')
  })

  it('a few logs: LCD day, phase, estimate, next period, done state, streak and week strip', () => {
    const html = home(fewLogs())
    const t = text(html)
    expectNoJunk(html)
    expect(html).toContain('class="gl-lcd__value">06<')
    expect(t).toContain('Day 6 of an estimated 28')
    expect(t).toContain('Follicular phase')
    expect(t).toContain('estimate')
    expect(t).toContain('Next period in 23 days')
    expect(t).toContain('Today’s check-in is done')
    expect(t).toContain('Edit today')
    // The LOGGED stamp is the done card's heading, named for assistive tech.
    expect(html).toMatch(/<h2 id="gl-done-title" class="gl-done__head"><svg class="gl-stamp"[^>]*role="img" aria-label="Logged"/)
    expect(t).toContain('LOGGED')
    expect(t).not.toContain('Handled')
    // The daily quote on a sticky note, plain text.
    expect(html).toContain('class="gl-sticky"')
    expect(t).toContain('Today’s quote')
    expect(t).toContain('Current streak: 9 days')
    expect(t).toContain('9 days in a row, your best run yet.')
    expect(t).toContain('Best 9 days · 9 logged')
    expect(html.match(/gl-week__day is-logged/g)).toHaveLength(7)
    expect(t).not.toContain('Welcome to Gloss')
    // Four phase arcs (solid, clipped to today) plus the bead; four in the key.
    expect(html.match(/gl-arc--solid/g)?.length).toBe(4)
    expect(html).toContain('gl-disc__bead')
    expect(html.match(/gl-disc-key__item/g)).toHaveLength(4)
    expect(html).toContain('style="left:31%;right:31%;top:36.5%;bottom:36.5%"')
  })

  it('not checked in yet: the gel Check in button and a dashed pip for tonight', () => {
    const logs = fewLogs().filter((l) => l.date !== TODAY)
    const html = home(logs)
    const t = text(html)
    expectNoJunk(html)
    expect(html).toContain('gl-gel gl-gel--hero')
    expect(t).toContain('Check in tonight to make it 9 in a row.')
    expect(html).toContain('gl-week__day is-today')
  })

  it('several months, then a late period', () => {
    const logs = monthsOfLogs('2026-09-10')
    const html = home(logs, '2026-09-10')
    expectNoJunk(html)
    expect(text(html)).not.toContain('estimate')
    expect(html).toContain('class="gl-lcd__value">18<')

    const late = home(logs, '2026-09-25')
    expectNoJunk(late)
    expect(text(late)).toContain('Period 4 days late')
    expect(late).toContain('class="gl-lcd__value">33<')
  })
})

describe('Gloss calendar', () => {
  it('no logs: month, key control, pinned bar with nothing logged', () => {
    const html = calendar([])
    const t = text(html)
    expectNoJunk(html)
    expect(t).toContain('October 2026')
    expect(html).toMatch(/aria-expanded="false"[^>]*>.*Key/)
    expect(t).toContain('Nothing logged')
    expect(t).toContain('Add entry')
    expect(html.match(/class="gl-day[ "]/g)?.length).toBe(31 + 4)
    expect(html).toContain(`aria-label="${formatDay('2026-10-04')}" aria-pressed="false" disabled=""`)
  })

  it('logged days: phases, predictions, bleeding marks, today, highlights in the bar', () => {
    const html = calendar(fewLogs())
    const t = text(html)
    expectNoJunk(html)
    expect(html).toContain('gl-tone--pink')
    expect(html).toContain('is-predicted')
    expect(html).toContain('gl-day__drop')
    expect(html).toContain('aria-current="date"')
    expect(t).toContain('Mood swings: minimal')
    expect(t).toContain('Edit')
    expect(t).toContain('Follicular phase')
  })

  it('several months: no junk', () => {
    expectNoJunk(calendar(monthsOfLogs('2026-09-10'), '2026-09-10', new Date(2026, 8, 10, 12)))
  })
})

describe('Gloss stats', () => {
  it('no logs: one friendly empty state, no switch', () => {
    for (const v of VIEWS) {
      const html = stats([], v)
      expectNoJunk(html)
      expect(text(html)).toContain('Nothing to count yet')
      expect(html).not.toContain('gl-switch')
    }
  })

  it('every view, every data level: switch pinned, one view pressed, footer, no junk', () => {
    const sets = [fewLogs(), [day('2026-09-28', 'medium'), day('2026-10-01')], [day(TODAY)], monthsOfLogs(TODAY)]
    for (const logs of sets) {
      for (const v of VIEWS) {
        const html = stats(logs, v)
        expectNoJunk(html)
        expect(html).toContain('class="gl-switch"')
        expect(html.match(/gl-switch__opt is-on/g)).toHaveLength(1)
        expect(text(html)).toContain('not a diagnosis')
      }
    }
  })

  it('a few logs: what is missing and what unlocks it', () => {
    const o = text(stats(fewLogs(), 'overview'))
    expect(o).toContain('No big finding yet')
    expect(o).toContain('You’re on a 9-day check-in streak, your best yet.')
    expect(o).toContain('Typical cycle')
    expect(o).toContain('Not yet')

    const m = stats(fewLogs(), 'moods')
    expect(text(m)).toContain('days 4–10 are underway')
    expect(text(m)).toContain('A pattern needs 2 compared cycles; you have 0.')
    expect(m).toContain('<table class="gl-heat"')

    const b = text(stats(fewLogs(), 'body'))
    expect(b).toContain('your next one completes your first full cycle')
    expect(b).toContain('Sleep, energy and cravings')

    const h = text(stats(fewLogs(), 'habits'))
    expect(h).toContain('Current streak: 9 days')
    expect(h).toContain('Check-in rate')
  })

  it('two scattered logs: the unlock checklist', () => {
    const t = text(stats([day('2026-09-28', 'medium'), day('2026-10-01')], 'overview'))
    expect(t).toContain('1 of 5 unlocked')
    expect(t).toMatch(/Done:\s+Log a period/)
    expect(t).toMatch(/To do:\s+Finish one full cycle/)
  })

  it('first check-in today: rate counts from tomorrow, no zeros', () => {
    const t = text(stats([day(TODAY)], 'habits'))
    expect(t).toContain('Counts from tomorrow.')
    expect(text(stats([day(TODAY)], 'body'))).toContain('No period logged yet')
  })

  it('several months: headline, all moods, heat table, cycle chart, body, habits', () => {
    const logs = monthsOfLogs('2026-09-10')
    const o = stats(logs, 'overview', '2026-09-10')
    const ot = text(o)
    expect(ot).toContain('Irritable / angry')
    expect(ot).toContain('tends to run higher the week before your period')
    expect(ot).toContain('+3.0')
    expect(ot).toContain('held in 4 of 4 cycles')
    expect(ot).toContain('Regular')
    expect(ot).toContain('See all moods')
    expect(ot).not.toContain('No big finding yet')

    const m = stats(logs, 'moods', '2026-09-10')
    const mt = text(m)
    expect(mt).not.toContain('early look')
    // All moods (avg) + one row per mood.
    expect(m.match(/class="gl-db(?: gl-db--total)?"/g)).toHaveLength(MOOD_ITEMS.length + 1)
    expect(mt).toContain('All moods (avg)')
    expect(mt).toContain('From 4 cycles')
    expect(mt).toContain('Period by period (5)')
    for (const item of MOOD_ITEMS) expect(mt).toContain(item.label)

    const b = stats(logs, 'body', '2026-09-10')
    const bt = text(b)
    expect(bt).toContain('Cycle by cycle')
    expect(b.match(/class="gl-history__row"/g)).toHaveLength(4)
    expect(bt).toContain('dashed line is your typical 28 days')
    expect(bt).toContain('Cramps')
    expect(b).toContain('gl-heat gl-heat--body')

    const h = text(stats(logs, 'habits', '2026-09-10'))
    expect(h).toContain('Filled in later')
    expect(h).toContain('Longest streak')
  })

  it('one compared cycle: an early look', () => {
    // Two periods 28 days apart; the second has both windows logged.
    const logs: DayLog[] = []
    for (let d = '2026-08-01'; d <= '2026-09-10'; d = addDays(d, 1)) {
      const a = diffDays('2026-08-01', d)
      const b = diffDays('2026-08-29', d)
      logs.push(day(d, (a >= 0 && a < 4) || (b >= 0 && b < 4) ? 'medium' : 'none'))
    }
    const html = stats(logs, 'moods', '2026-09-10')
    expectNoJunk(html)
    expect(text(html)).toContain('early look')
  })
})

describe('Gloss display preferences', () => {
  const settingsHtml = () => renderToStaticMarkup(<SettingsScreen settings={SETTINGS} pets={[]} today={TODAY} onChanged={asyncNoop} />)
  const screens = () => {
    const logs = monthsOfLogs('2026-09-10')
    return [
      home(logs, '2026-09-10'),
      home([]),
      calendar(logs, '2026-09-10', new Date(2026, 8, 10, 12)),
      ...VIEWS.map((v) => stats(logs, v, '2026-09-10')),
      settingsHtml(),
      renderToStaticMarkup(<CheckinSheet date={TODAY} today={TODAY} moodTracking="advanced" blocking={false} onClose={noop} onSaved={asyncNoop} />),
      renderToStaticMarkup(<Nav tab="home" onChange={noop} todayLogged={false} onCheckin={noop} />),
    ]
  }
  /** The colour picker's buttons, in order, as [class, pressed, label]. */
  const swatches = (html: string) =>
    [...html.matchAll(/<button type="button" class="gl-swatch gl-swatch--(\w+)( is-on)?" aria-pressed="(true|false)">(?:(?!<\/button>).)*?class="gl-swatch__label">([^<]+)</g)].map(
      (m) => [m[1], m[3] === 'true', m[4]] as const,
    )

  afterEach(() => {
    pixelLabelsPref.set('on')
    colourwayPref.set('silver')
  })

  it('defaults: pixel labels on, Silver; no stickers or chrome ornaments anywhere', () => {
    expect(pixelLabelsPref.get()).toBe('on')
    expect(colourwayPref.get()).toBe('silver')
    for (const html of screens()) expect(html).not.toMatch(/gl-sticker|gl-charm|gl-streak__charm|gl-scard__charm/)
    // The wordmark glint, the quote's sticky note and the LOGGED stamp stay.
    const h = home(fewLogs())
    expect(h).toContain('gl-wordmark__glint')
    expect(h).toContain('class="gl-sticky"')
    expect(h).toContain('class="gl-stamp"')
  })

  it('settings: one switch (pixel labels) with its current state; no stickers switch', () => {
    let html = settingsHtml()
    expect(html.match(/role="switch"/g)).toHaveLength(1)
    expect(html).not.toContain('Stickers')
    expect(html).toMatch(/role="switch" aria-checked="true"[^>]*>(?:(?!<\/button>).)*Pixel labels/)
    pixelLabelsPref.set('off')
    html = settingsHtml()
    expect(html).toMatch(/role="switch" aria-checked="false"[^>]*>(?:(?!<\/button>).)*Pixel labels/)
  })

  it('colour picker: five labelled swatches, the current one pressed', () => {
    for (const c of COLOURWAYS) {
      colourwayPref.set(c.key)
      const html = settingsHtml()
      const list = swatches(html)
      expect(list.map(([key]) => key)).toEqual(['silver', 'onyx', 'cobalt', 'cherry', 'gold'])
      expect(list.map(([, , label]) => label)).toEqual(['Silver', 'Onyx', 'Cobalt', 'Cherry', 'Gold'])
      expect(list.filter(([, pressed]) => pressed)).toEqual([[c.key, true, c.label]])
      expect(html).toMatch(/role="group" aria-labelledby="[^"]+"[^>]*>(?:(?!<\/div>).)*Colour/)
    }
  })

  it('every colourway renders every screen without error', () => {
    for (const c of COLOURWAYS) {
      colourwayPref.set(c.key)
      expect(colourwayPref.get()).toBe(c.key)
      for (const html of screens()) expectNoJunk(html)
    }
  })

  it('heat cells carry the ramp position and the Silver fallback colour', () => {
    const html = stats(monthsOfLogs('2026-09-10'), 'moods', '2026-09-10')
    expect(html).toMatch(/class="gl-heat__val" style="--heat-rgb:rgb\(\d+, \d+, \d+\);--heat-at:[\d.]+%"/)
  })
})

describe('Gloss colourway preference', () => {
  // The test environment is node: stand-ins for the bits of the DOM and storage it touches.
  function fakeDom() {
    const meta = { content: '#f2f3f6', setAttribute(name: string, value: string) { if (name === 'content') this.content = value } }
    const dataset: Record<string, string> = {}
    vi.stubGlobal('document', { documentElement: { dataset }, querySelector: (sel: string) => (sel === 'meta[name="theme-color"]' ? meta : null) })
    return { meta, dataset }
  }
  function fakeStorage(initial: Record<string, string> = {}) {
    const store = new Map(Object.entries(initial))
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) })
    return store
  }

  afterEach(() => {
    colourwayPref.set('silver')
    vi.unstubAllGlobals()
  })

  it('applies to <html> and theme-color on load and on every change, no reload', () => {
    const { meta, dataset } = fakeDom()
    const store = fakeStorage()
    applyColourway()
    expect(dataset.glColour).toBe('silver')
    expect(meta.content).toBe('#efeef2')
    colourwayPref.set('onyx')
    expect(dataset.glColour).toBe('onyx')
    expect(meta.content).toBe('#0e0e11')
    expect(store.get('burn-book:gloss-colourway')).toBe('onyx')
    for (const c of COLOURWAYS) {
      colourwayPref.set(c.key)
      expect(dataset.glColour).toBe(c.key)
      expect(meta.content).toBe(themeColorFor(c.key))
    }
  })

  it('unknown stored values fall back to Silver', () => {
    fakeStorage({ 'burn-book:gloss-colourway': 'champagne' })
    expect(createPref('burn-book:gloss-colourway', COLOURWAYS, DEFAULT_COLOURWAY).get()).toBe('silver')
    fakeStorage({ 'burn-book:gloss-colourway': 'gold' })
    expect(createPref('burn-book:gloss-colourway', COLOURWAYS, DEFAULT_COLOURWAY).get()).toBe('gold')
  })
})

describe('Gloss check-in, nav and settings', () => {
  it('blocking check-in: no close control, explains why', () => {
    const html = renderToStaticMarkup(<CheckinSheet date={TODAY} today={TODAY} moodTracking="advanced" blocking onClose={noop} onSaved={asyncNoop} />)
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

  it('blocking backfill explains the missed day', () => {
    const t = text(renderToStaticMarkup(<CheckinSheet date="2026-10-02" today={TODAY} moodTracking="advanced" blocking onClose={noop} onSaved={asyncNoop} />))
    expect(t).toContain('You missed this day.')
    expect(t).toContain('Yesterday — ')
  })

  it('voluntary check-in: closable', () => {
    const html = renderToStaticMarkup(<CheckinSheet date="2026-10-01" today={TODAY} moodTracking="advanced" blocking={false} onClose={noop} onSaved={asyncNoop} />)
    expectNoJunk(html)
    expect(html).toContain('aria-label="Close"')
    expect(text(html)).not.toContain('Time for tonight')
  })

  it('nav: four labelled destinations and the Check in orb', () => {
    const open = renderToStaticMarkup(<Nav tab="stats" onChange={noop} todayLogged={false} onCheckin={noop} />)
    for (const label of ['Home', 'Calendar', 'Stats', 'Settings']) expect(text(open)).toContain(label)
    expect(open.match(/aria-current="page"/g)).toHaveLength(1)
    expect(open).toContain('aria-label="Check in for today"')
    const done = renderToStaticMarkup(<Nav tab="home" onChange={noop} todayLogged onCheckin={noop} />)
    expect(done).toContain('Edit today')
    expect(done).toContain('gl-nav__orb is-done')
  })

  it('settings: every skin listed with one marked, privacy note, data actions', () => {
    const html = renderToStaticMarkup(<SettingsScreen settings={SETTINGS} pets={[]} today={TODAY} onChanged={asyncNoop} />)
    const t = text(html)
    expectNoJunk(html)
    for (const s of SKINS) {
      expect(t).toContain(s.label)
      expect(t).toContain(s.description)
    }
    // One theme pressed (plus one colourway swatch and the mood-tracking level).
    expect(html.match(/class="gl-row gl-row--button gl-skin is-on" aria-pressed="true"/g)).toHaveLength(1)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(3)
    expect(t).toContain('(in use)')
    expect(t).toContain('never sent anywhere')
    expect(t).toContain('Export backup')
    expect(t).toContain('Export spreadsheet')
    expect(t).toContain('Import backup…')
    expect(html).toContain('value="20:00"')
    expect(html).toContain('value="28"')
  })
})
