import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { ALARM_COPY, alarmShortcutPref, REMINDER_SETUP_STEPS } from '../../core/reminders'
import type { Settings } from '../../types'
import { AlarmPrompt } from './AlarmPrompt'
import { COLOURWAYS, colourwayPref, DEFAULT_COLOURWAY } from './prefs'
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

describe('Phase settings: Reminders', () => {
  afterEach(() => {
    alarmShortcutPref.set('off')
    colourwayPref.set(DEFAULT_COLOURWAY)
  })

  it('sits after Check-in: explanation, "How to set up" (collapsed), switch, Test button', () => {
    const html = settingsHtml()
    const t = text(html)
    expect(t.indexOf('Mood tracking')).toBeLessThan(t.indexOf('Reminders'))
    expect(t.indexOf('Reminders')).toBeLessThan(t.indexOf('Appearance'))
    const g = remindersGroup(html)
    const gt = text(g)
    expect(gt).toContain(ALARM_COPY.intro)
    expect(gt.indexOf(ALARM_COPY.setup)).toBeLessThan(gt.indexOf(ALARM_COPY.switchLabel))
    expect(gt.indexOf(ALARM_COPY.switchLabel)).toBeLessThan(gt.lastIndexOf(ALARM_COPY.test))
    expect(gt).not.toMatch(/alarm/i)
    // Expander: a real button controlling the hidden numbered list.
    const expander = g.match(/<button type="button" class="ph-row ph-row--button ph-expander" aria-expanded="false" aria-controls="([^"]+)">/)
    expect(expander).not.toBeNull()
    expect(g).toContain(`<ol id="${expander![1]}" class="ph-setup" hidden="">`)
    expect(g.match(/class="ph-setup__step"/g)).toHaveLength(REMINDER_SETUP_STEPS.length)
    for (const step of REMINDER_SETUP_STEPS) expect(gt).toContain(step)
    // Test button: a full-height row (≥ 44px via .ph-row).
    expect(g).toMatch(/<button type="button" class="ph-row ph-row--button">(?:(?!<\/button>).)*Test the shortcut/)
  })

  it('switch: off by default, on when the preference is on', () => {
    let g = remindersGroup(settingsHtml())
    expect(g).toMatch(/role="switch" aria-checked="false"[^>]*>(?:(?!<\/button>).)*Tell your phone when you’ve checked in/)
    expect(g).toContain('class="ph-switch"')
    alarmShortcutPref.set('on')
    g = remindersGroup(settingsHtml())
    expect(g).toMatch(/role="switch" aria-checked="true"/)
    expect(g).toContain('class="ph-switch is-on"')
  })

  it('renders in every colourway', () => {
    for (const c of COLOURWAYS) {
      colourwayPref.set(c.key)
      expect(text(remindersGroup(settingsHtml()))).toContain(ALARM_COPY.switchLabel)
    }
  })
})

describe('Phase after-save prompt', () => {
  it('non-modal dialog with the question and two buttons, primary first', () => {
    const html = prompt()
    expect(html).toMatch(/^<div class="ph-alarm" role="dialog" aria-modal="false" aria-labelledby="[^"]+" tabindex="-1">/)
    const id = html.match(/aria-labelledby="([^"]+)"/)![1]
    expect(html).toContain(`<p id="${id}" class="ph-alarm__text">Saved. Tell your phone you’ve checked in?</p>`)
    const buttons = [...html.matchAll(/<button type="button" class="([^"]+)">([^<]+)<\/button>/g)].map((m) => [m[1], m[2]])
    expect(buttons).toEqual([
      ['ph-btn ph-btn--primary ph-btn--sm', 'Yes, run shortcut'],
      ['ph-btn ph-btn--outline ph-btn--sm', 'Not now'],
    ])
    expect(text(html)).not.toMatch(/alarm/i)
  })
})
