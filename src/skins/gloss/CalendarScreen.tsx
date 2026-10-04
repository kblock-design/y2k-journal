import { useId, useState } from 'react'
import { formatDay, PHASE_LABELS } from '../../core/format'
import { describeLog, logHighlights, PHASES, useCalendar, WEEKDAYS } from '../../core/useCalendar'
import type { CalendarCell } from '../../core/useCalendar'
import type { Phase } from '../../logic/cycle'
import type { DayLog, ISODate, Settings } from '../../types'
import { Icon } from './icons'
import { PHASE_TONE } from './tones'

interface Props {
  logs: DayLog[]
  settings: Settings
  today: ISODate
  now: Date
  onOpenDay: (date: ISODate) => void
}

export function CalendarScreen({ logs, settings, today, now, onOpenDay }: Props) {
  const cal = useCalendar({ logs, settings, today, now })
  const [keyOpen, setKeyOpen] = useState(false)
  const keyId = useId()
  const monthId = useId()
  const selectedCell = cal.cells.find((c) => c.date === cal.selected)

  return (
    <div className="gl-screen gl-cal">
      <header className="gl-head">
        <h1 className="gl-title">Calendar</h1>
        <button
          type="button"
          className={`gl-keybtn${keyOpen ? ' is-on' : ''}`}
          aria-expanded={keyOpen}
          aria-controls={keyId}
          onClick={() => setKeyOpen((o) => !o)}
        >
          <Icon name="key" size={18} />
          Key
        </button>
      </header>

      <section className="gl-card gl-cal__card" aria-labelledby={monthId}>
        <div className="gl-cal__nav">
          <button type="button" className="gl-iconbtn" aria-label="Previous month" onClick={cal.prevMonth}>
            <Icon name="chevron-left" size={22} />
          </button>
          <h2 id={monthId} className="gl-cal__month" aria-live="polite">
            {cal.monthTitle}
          </h2>
          <button type="button" className="gl-iconbtn" aria-label="Next month" onClick={cal.nextMonth}>
            <Icon name="chevron-right" size={22} />
          </button>
        </div>

        <div className="gl-cal__grid">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="gl-cal__wd" aria-hidden="true">
              {w}
            </span>
          ))}
          {Array.from({ length: cal.leading }, (_, i) => (
            <span key={`pad-${i}`} className="gl-day gl-day--pad" aria-hidden="true" />
          ))}
          {cal.cells.map((c) => (
            <DayCell key={c.date} c={c} onSelect={cal.select} />
          ))}
        </div>

        <div id={keyId} className="gl-cal__key" hidden={!keyOpen}>
          <ul className="gl-legend">
            {PHASES.map((p) => (
              <li key={p}>
                <span className={`gl-legend__sw gl-tone--${PHASE_TONE[p]}`} aria-hidden="true" />
                {PHASE_LABELS[p]}
              </li>
            ))}
            <li>
              <span className="gl-legend__sw gl-legend__sw--predicted gl-tone--pink" aria-hidden="true" />
              Predicted (lighter, dashed)
            </li>
            <li>
              <span className="gl-legend__mark" aria-hidden="true">
                <span className="gl-drop" />
              </span>
              Bleeding
            </li>
            <li>
              <span className="gl-legend__mark" aria-hidden="true">
                <span className="gl-drop gl-drop--spot" />
              </span>
              Spotting
            </li>
            <li>
              <span className="gl-legend__mark" aria-hidden="true">
                <span className="gl-logdot" />
              </span>
              Checked in
            </li>
            <li>
              <span className="gl-legend__mark" aria-hidden="true">
                <span className="gl-legend__today">4</span>
              </span>
              Today
            </li>
          </ul>
          <p className="gl-legend__note">Phases are estimates from your logged periods.</p>
        </div>
      </section>

      <DayBar
        date={cal.selected}
        today={today}
        log={cal.selectedLog}
        phase={selectedCell?.phase ?? null}
        predicted={selectedCell?.predicted ?? false}
        onOpen={() => onOpenDay(cal.selected)}
      />
    </div>
  )
}

function DayCell({ c, onSelect }: { c: CalendarCell; onSelect: (d: ISODate) => void }) {
  const cls = [
    'gl-day',
    c.phase ? `gl-tone--${PHASE_TONE[c.phase]}` : 'gl-day--none',
    c.phase && c.predicted ? 'is-predicted' : '',
    c.isToday ? 'is-today' : '',
    c.isSelected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      className={cls}
      aria-label={c.label}
      aria-current={c.isToday ? 'date' : undefined}
      aria-pressed={c.isSelected}
      disabled={!c.canLog}
      onClick={() => onSelect(c.date)}
    >
      <span className="gl-day__num">{c.day}</span>
      {(c.bleeding || c.spotting) && <span className={`gl-drop gl-day__drop${c.spotting ? ' gl-drop--spot' : ''}`} />}
      {c.log && <span className="gl-logdot gl-day__dot" />}
    </button>
  )
}

/**
 * The selected day, pinned just above the navigation. Tapping it expands upward to the whole
 * entry; no backdrop, so the calendar stays usable underneath.
 */
function DayBar(props: { date: ISODate; today: ISODate; log: DayLog | undefined; phase: Phase | null; predicted: boolean; onOpen: () => void }) {
  const { date, today, log, phase, predicted, onOpen } = props
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const highlights = log ? logHighlights(log) : []
  const summary = !log ? 'Nothing logged' : highlights.length === 0 ? 'Nothing to report' : highlights.map((h) => h.text).join(' · ')

  return (
    <section className={`gl-daybar${open ? ' is-open' : ''}`} aria-label="Selected day">
      <div className="gl-daybar__inner">
        <div id={panelId} className="gl-daybar__panel" hidden={!open}>
          {phase && (
            <p className="gl-daybar__phase">
              <span className={`gl-dot gl-tone--${PHASE_TONE[phase]}`} aria-hidden="true" />
              {PHASE_LABELS[phase]} phase{predicted ? ' (predicted)' : ''}
            </p>
          )}
          {log ? <DayDetail log={log} /> : <p className="gl-daybar__empty">Nothing logged for this day yet.</p>}
        </div>
        <div className="gl-daybar__row">
          <button type="button" className="gl-daybar__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
            <span className="gl-daybar__text">
              <span className="gl-daybar__date">{date === today ? `Today · ${formatDay(date)}` : formatDay(date)}</span>
              <span className="gl-daybar__sum" aria-live="polite">
                {summary}
              </span>
            </span>
            <span className="gl-daybar__chev" aria-hidden="true">
              <Icon name="chevron-up" size={18} />
            </span>
          </button>
          <button type="button" className="gl-gel gl-gel--sm" onClick={onOpen}>
            {log ? 'Edit' : 'Add entry'}
          </button>
        </div>
      </div>
    </section>
  )
}

function DayDetail({ log }: { log: DayLog }) {
  const { rows, savedAt, backfilled } = describeLog(log)
  return (
    <>
      <dl className="gl-detail">
        {rows.map((r) => (
          <div key={r.key} className="gl-detail__row">
            <dt>{r.label}</dt>
            <dd>
              {r.rating !== undefined && (
                <span className="gl-meter" aria-hidden="true">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <span key={n} className={n <= r.rating! ? 'is-on' : ''} />
                  ))}
                </span>
              )}
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="gl-detail__meta">
        Saved {savedAt}
        {backfilled ? ' · filled in later' : ''}
      </p>
    </>
  )
}
