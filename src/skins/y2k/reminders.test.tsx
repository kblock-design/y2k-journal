import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { ALARM_COPY, alarmShortcutPref, REMINDER_SETUP_STEPS } from '../../core/reminders'
import type { Settings } from '../../types'
import { AlarmPrompt } from './AlarmPrompt'
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

/** The Reminders window's markup (its <section>). */
function remindersWindow(html: string): string {
  const start = html.lastIndexOf('<section', html.indexOf('>Reminders</span>'))
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</section>', start))
}

describe('Y2K settings: Reminders window', () => {
  afterEach(() => alarmShortcutPref.set('off'))

  it('a collapsible window after Check-in, closed by default, its state in the title bar', () => {
    const html = settingsHtml()
    const t = text(html)
    expect(t.indexOf('Mood tracking')).toBeLessThan(t.indexOf('Reminders'))
    expect(t.indexOf('Reminders')).toBeLessThan(t.indexOf('Your data'))
    const w = remindersWindow(html)
    expect(w).toMatch(/^<section class="win win--chrome win--collapsible win--collapsed settings-group reminders">/)
    expect(w).toMatch(/<h2 class="win__title"><button type="button" class="win__toggle" aria-expanded="false" aria-controls="([^"]+)">/)
    const bodyId = w.match(/aria-controls="([^"]+)"/)![1]
    expect(w).toContain(`<div id="${bodyId}" class="win__body" hidden="">`)
    expect(text(w)).toContain('— Off')
  })

  it('inside: explanation, numbered setup steps, then the switch and the Test button', () => {
    const w = remindersWindow(settingsHtml())
    const wt = text(w)
    expect(wt).toContain(ALARM_COPY.intro)
    expect(wt).toContain(ALARM_COPY.setup)
    expect(w.match(/class="setup-steps__step"/g)).toHaveLength(REMINDER_SETUP_STEPS.length)
    for (const step of REMINDER_SETUP_STEPS) expect(wt).toContain(step)
    expect(wt.lastIndexOf(REMINDER_SETUP_STEPS[3])).toBeLessThan(wt.indexOf(ALARM_COPY.switchLabel))
    expect(w).toMatch(/<button type="button" class="btn btn--secondary btn--block">Test the shortcut<\/button>/)
    expect(wt).not.toMatch(/alarm/i)
  })

  it('switch: off by default, on with the preference (and the title bar says so)', () => {
    let w = remindersWindow(settingsHtml())
    expect(w).toMatch(/role="switch" aria-checked="false"[^>]*>(?:(?!<\/button>).)*Tell your phone when you’ve checked in/)
    expect(w).toContain('class="switch"')
    alarmShortcutPref.set('on')
    w = remindersWindow(settingsHtml())
    expect(w).toMatch(/role="switch" aria-checked="true"/)
    expect(w).toContain('class="switch is-on"')
    expect(text(w)).toContain('— Phase Done on')
  })
})

describe('Y2K after-save prompt', () => {
  it('a little pop-up window: non-modal dialog, question, primary then secondary button', () => {
    const html = prompt()
    expect(html).toMatch(/^<div class="alarm-prompt" role="dialog" aria-modal="false" aria-labelledby="[^"]+" tabindex="-1">/)
    expect(html).toContain('class="win win--hot alarm-prompt__win"')
    const id = html.match(/aria-labelledby="([^"]+)"/)![1]
    expect(html).toContain(`<p id="${id}" class="alarm-prompt__text">Saved. Tell your phone you’ve checked in?</p>`)
    const buttons = [...html.matchAll(/<button type="button" class="([^"]+)">([^<]+)<\/button>/g)].map((m) => [m[1], m[2]])
    expect(buttons).toEqual([
      ['btn btn--primary', 'Yes, run shortcut'],
      ['btn btn--secondary', 'Not now'],
    ])
    expect(text(html)).not.toMatch(/alarm/i)
  })
})
