import { useState } from 'react'
import { describeLog, logHighlights, PHASES, useCalendar, WEEKDAYS } from '../../core/useCalendar'
import type { DayLog, ISODate, Settings } from '../../types'
import { formatDay, PHASE_LABELS } from '../../core/format'
import { Window } from './Window'
import './daybar.css'

interface Props {
  logs: DayLog[]
  settings: Settings
  today: ISODate
  now: Date
  onEdit: (date: ISODate) => void
}

export function CalendarScreen({ logs, settings, today, now, onEdit }: Props) {
  const { monthTitle, leading, cells, prevMonth, nextMonth, selected, select, selectedLog } = useCalendar({
    logs,
    settings,
    today,
    now,
  })
  const [expanded, setExpanded] = useState(false)

  // The day at a glance: only what was logged as something other than the default.
  const highlights = selectedLog ? logHighlights(selectedLog) : []
  const glance = !selectedLog
    ? 'Nothing logged'
    : highlights.length === 0
      ? 'Nothing to report'
      : highlights
          .slice(0, 3)
          .map((h) => h.text)
          .join(' · ') + (highlights.length > 3 ? ` · +${highlights.length - 3} more` : '')

  return (
    <div className="screen screen--calendar">
      <Window
        tone="chrome"
        icon="calendar"
        title="calendar - Paint"
        className="cal-window"
        bodyClassName="cal-window__body"
        menu={['File', 'Edit', 'View', 'Image', 'Colors', 'Help']}
        status="For Help, tap a day"
        stickers={[
          { name: 'cherry', corner: 'tl', size: 42, rotate: -14 },
        ]}
      >
        <header className="cal-header">
          <button type="button" className="btn btn--icon btn--arrow" aria-label="Previous month" onClick={prevMonth}>
            <span className="arrow arrow--left" aria-hidden="true" />
          </button>
          <h2 className="cal-header__title" aria-live="polite">
            {monthTitle}
          </h2>
          <button type="button" className="btn btn--icon btn--arrow" aria-label="Next month" onClick={nextMonth}>
            <span className="arrow arrow--right" aria-hidden="true" />
          </button>
        </header>

        <div className="cal-grid">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="cal-weekday" aria-hidden="true">
              {w}
            </div>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <div key={`pad-${i}`} className="cal-day cal-day--pad" aria-hidden="true" />
          ))}
          {cells.map((c) => {
            const { flow, bleeding, predicted } = c
            const classes = [
              'cal-day',
              c.phase ? `cal-day--${c.phase}` : 'cal-day--no-phase',
              predicted ? 'is-predicted' : 'is-actual',
              c.isToday ? 'is-today' : '',
              c.isSelected ? 'is-selected' : '',
              c.log ? 'is-logged' : '',
              bleeding ? 'is-bleeding' : '',
              c.spotting ? 'is-spotting' : '',
              c.log ? `cal-day--flow-${flow}` : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={c.date}
                type="button"
                className={classes}
                aria-label={c.label}
                aria-current={c.isToday ? 'date' : undefined}
                aria-pressed={c.isSelected}
                disabled={!c.canLog}
                onClick={() => select(c.date)}
              >
                <span className="cal-day__num">{c.day}</span>
                <span className="cal-day__marks" aria-hidden="true">
                  {(bleeding || c.spotting) && <span className="cal-day__flow" />}
                  {c.log && <span className="cal-day__dot" />}
                </span>
              </button>
            )
          })}
        </div>

        <details className="cal-key">
          <summary className="cal-key__summary">Key</summary>
        <ul className="cal-legend">
          {PHASES.map((p) => (
            <li key={p} className="cal-legend__item">
              <span className={`phase-swatch phase-swatch--${p}`} aria-hidden="true" />
              {PHASE_LABELS[p]}
            </li>
          ))}
          <li className="cal-legend__item">
            <span className="phase-swatch phase-swatch--predicted" aria-hidden="true" />
            Predicted
          </li>
          <li className="cal-legend__item">
            <span className="cal-legend__flow" aria-hidden="true" />
            Bleeding
          </li>
          <li className="cal-legend__item">
            <span className="cal-legend__dot" aria-hidden="true" />
            Logged
          </li>
        </ul>
        </details>
      </Window>

      {/* Pinned above the tab bar so tapping a day always shows its summary without scrolling. */}
      <section className={`daybar${expanded && selectedLog ? ' is-open' : ''}`} aria-live="polite" aria-label="Selected day">
        <div className="daybar__row">
          <button
            type="button"
            className="daybar__toggle"
            aria-expanded={expanded && !!selectedLog}
            aria-controls="daybar-full"
            disabled={!selectedLog}
            onClick={() => setExpanded((open) => !open)}
          >
            <span className="daybar__date">{formatDay(selected)}</span>
            <span className="daybar__glance">{glance}</span>
          </button>
          <button type="button" className="btn btn--secondary daybar__edit" onClick={() => onEdit(selected)}>
            {selectedLog ? 'Edit' : 'Add'}
          </button>
        </div>
        {expanded && selectedLog && (
          <div className="daybar__full" id="daybar-full">
            <DaySummary log={selectedLog} />
          </div>
        )}
      </section>
    </div>
  )
}

function DaySummary({ log }: { log: DayLog }) {
  const { rows, savedAt, backfilled } = describeLog(log)
  return (
    <>
      <dl className="summary">
        {rows.map(({ key, label, value, rating }) => (
          <div key={key} className={`summary__row${rating ? ` summary__row--rating-${rating}` : ''}`}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="summary__meta">
        Saved {savedAt}
        {backfilled ? ' (filled in later)' : ''}
      </p>
    </>
  )
}
