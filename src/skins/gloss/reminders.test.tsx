import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { ALARM_COPY, alarmShortcutPref, REMINDER_SETUP_STEPS } from '../../core/reminders'
import type { Settings } from '../../types'
import { AlarmPrompt } from './AlarmPrompt'
import { colourwayPref, COLOURWAYS, pixelLabelsPref } from './prefs'
import { SettingsScreen } from './SettingsScreen'

const SETTINGS: Settings = { reminderTime: '20:00', defaultCycleLength: 28, defaultPeriodLength: 5, startedOn: '2026-01-01', moodTracking: 'advanced' }
const TODAY = '2026-10-06'

const settingsHtml = () => renderToStaticMarkup(<SettingsScreen settings={SETTINGS} pets={[]} today={TODAY} onChanged={async () => {}} />)
const prompt = () => renderToStaticMarkup(<AlarmPrompt date={TODAY} onDismiss={() => {}} />)

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

/** The Reminders group's markup (from its heading to the next group). */
function remindersGroup(html: string): string {
  const start = html.indexOf('>Reminders</h2>')
  expect(start).toBeGreaterThan(-1)
  const end = html.indexOf('<section', start)
  return html.slice(start, end === -1 ? undefined : end)
}

describe('Gloss settings: Reminders', () => {
  afterEach(() => {
    alarmShortcutPref.set('off')
    colourwayPref.set('silver')
    pixelLabelsPref.set('on')
  })

  it('sits after Check-in: explanation, "How to set up" (collapsed), switch, Test button', () => {
    const html = settingsHtml()
    const t = text(html)
    expect(t.indexOf('Mood tracking')).toBeLessThan(t.indexOf('Reminders'))
    expect(t.indexOf('Reminders')).toBeLessThan(t.indexOf('Theme'))
    const g = remindersGroup(html)
    const gt = text(g)
    expect(gt).toContain(ALARM_COPY.intro)
    expect(gt.indexOf(ALARM_COPY.setup)).toBeLessThan(gt.indexOf(ALARM_COPY.switchLabel))
    expect(gt.indexOf(ALARM_COPY.switchLabel)).toBeLessThan(gt.lastIndexOf(ALARM_COPY.test))
    expect(gt).not.toMatch(/alarm/i)
    const expander = g.match(/<button type="button" class="gl-row gl-row--button gl-expander" aria-expanded="false" aria-controls="([^"]+)">/)
    expect(expander).not.toBeNull()
    expect(g).toContain(`<ol id="${expander![1]}" class="gl-setup" hidden="">`)
    expect(g.match(/class="gl-setup__step"/g)).toHaveLength(REMINDER_SETUP_STEPS.length)
    for (const step of REMINDER_SETUP_STEPS) expect(gt).toContain(step)
    expect(g).toMatch(/<button type="button" class="gl-row gl-row--button">(?:(?!<\/button>).)*Test the shortcut/)
  })

  it('switch: the same Gloss switch as Pixel labels, off by default, on with the preference', () => {
    let g = remindersGroup(settingsHtml())
    expect(g).toMatch(/role="switch" aria-checked="false"[^>]*>(?:(?!<\/button>).)*Tell your phone when you’ve checked in/)
    expect(g).toContain('class="gl-switch-ctl"')
    alarmShortcutPref.set('on')
    g = remindersGroup(settingsHtml())
    expect(g).toMatch(/role="switch" aria-checked="true"/)
    expect(g).toContain('class="gl-switch-ctl is-on"')
    // Independent of the display switch.
    expect(pixelLabelsPref.get()).toBe('on')
  })

  it('renders in every colourway', () => {
    for (const c of COLOURWAYS) {
      colourwayPref.set(c.key)
      expect(text(remindersGroup(settingsHtml()))).toContain(ALARM_COPY.switchLabel)
    }
  })
})

describe('Gloss after-save prompt', () => {
  it('non-modal dialog with the question, gel primary then chrome "Not now"', () => {
    const html = prompt()
    expect(html).toMatch(/^<div class="gl-alarm" role="dialog" aria-modal="false" aria-labelledby="[^"]+" tabindex="-1">/)
    const id = html.match(/aria-labelledby="([^"]+)"/)![1]
    expect(html).toContain(`<p id="${id}" class="gl-alarm__text">Saved. Tell your phone you’ve checked in?</p>`)
    const buttons = [...html.matchAll(/<button type="button" class="([^"]+)">([^<]+)<\/button>/g)].map((m) => [m[1], m[2]])
    expect(buttons).toEqual([
      ['gl-gel gl-gel--sm', 'Yes, run shortcut'],
      ['gl-btn gl-btn--chrome gl-btn--sm', 'Not now'],
    ])
    expect(text(html)).not.toMatch(/alarm/i)
  })
})
