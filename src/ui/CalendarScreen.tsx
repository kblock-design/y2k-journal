import { useMemo, useState } from 'react'
import { canLog } from '../logic/checkin'
import { phaseOn } from '../logic/cycle'
import type { Phase } from '../logic/cycle'
import { fromISODate, toISODate } from '../logic/dates'
import type { DayLog, ISODate, Settings } from '../types'
import { MOOD_ITEMS, PHYSICAL_SYMPTOMS, RATING_LABELS } from '../types'
import { capitalize, formatDay, formatMonth, PHASE_LABELS } from './format'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const PHASES: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']

interface Props {
  logs: DayLog[]
  settings: Settings
  today: ISODate
  now: Date
  onEdit: (date: ISODate) => void
}

interface Cell {
  date: ISODate
  day: number
  phase: Phase | null
  log: DayLog | undefined
}

export function CalendarScreen({ logs, settings, today, now, onEdit }: Props) {
  const [month, setMonth] = useState(() => {
    const d = fromISODate(today)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState<ISODate>(today)

  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs])

  const { leading, cells } = useMemo(() => {
    const first = new Date(month.year, month.month, 1, 12)
    const count = new Date(month.year, month.month + 1, 0, 12).getDate()
    const out: Cell[] = []
    for (let day = 1; day <= count; day++) {
      const date = toISODate(new Date(month.year, month.month, day, 12))
      out.push({ date, day, phase: phaseOn(logs, date, settings, today), log: byDate.get(date) })
    }
    return { leading: first.getDay(), cells: out }
  }, [month, logs, settings, today, byDate])

  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1, 12)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const selectedLog = byDate.get(selected)

  return (
    <div className="screen screen--calendar">
      <header className="cal-header">
        <button type="button" className="btn btn--icon" aria-label="Previous month" onClick={() => shift(-1)}>
          ‹
        </button>
        <h2 className="cal-header__title" aria-live="polite">
          {formatMonth(month.year, month.month)}
        </h2>
        <button type="button" className="btn btn--icon" aria-label="Next month" onClick={() => shift(1)}>
          ›
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
          const predicted = c.date > today
          const flow = c.log?.flow ?? 'none'
          const bleeding = flow === 'light' || flow === 'medium' || flow === 'heavy'
          const interactive = canLog(c.date, now, settings)
          const classes = [
            'cal-day',
            c.phase ? `cal-day--${c.phase}` : 'cal-day--no-phase',
            predicted ? 'is-predicted' : 'is-actual',
            c.date === today ? 'is-today' : '',
            c.date === selected ? 'is-selected' : '',
            c.log ? 'is-logged' : '',
            bleeding ? 'is-bleeding' : '',
            flow === 'spotting' ? 'is-spotting' : '',
            c.log ? `cal-day--flow-${flow}` : '',
          ]
            .filter(Boolean)
            .join(' ')
          const label = [
            formatDay(c.date),
            c.phase ? `${PHASE_LABELS[c.phase]}${predicted ? ' (predicted)' : ''}` : null,
            flow !== 'none' ? `${capitalize(flow)} flow` : null,
            c.log ? 'logged' : null,
          ]
            .filter(Boolean)
            .join(', ')
          return (
            <button
              key={c.date}
              type="button"
              className={classes}
              aria-label={label}
              aria-current={c.date === today ? 'date' : undefined}
              aria-pressed={c.date === selected}
              disabled={!interactive}
              onClick={() => setSelected(c.date)}
            >
              <span className="cal-day__num">{c.day}</span>
              <span className="cal-day__marks" aria-hidden="true">
                {(bleeding || flow === 'spotting') && <span className="cal-day__flow" />}
                {c.log && <span className="cal-day__dot" />}
              </span>
            </button>
          )
        })}
      </div>

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

      <section className="card day-detail" aria-live="polite">
        <div className="day-detail__head">
          <h3 className="day-detail__title">{formatDay(selected)}</h3>
          <button type="button" className="btn btn--secondary" onClick={() => onEdit(selected)}>
            {selectedLog ? 'Edit' : 'Add entry'}
          </button>
        </div>
        {selectedLog ? <DaySummary log={selectedLog} /> : <p className="hint">Nothing logged for this day.</p>}
      </section>
    </div>
  )
}

function DaySummary({ log }: { log: DayLog }) {
  const physical = PHYSICAL_SYMPTOMS.filter((s) => log.physical.includes(s.key)).map((s) => s.label)
  const rows: [key: string, label: string, value: string, extraClass?: string][] = [
    ['flow', 'Bleeding', capitalize(log.flow)],
    ...MOOD_ITEMS.map(
      (m): [string, string, string, string] => [
        m.key,
        m.label,
        RATING_LABELS[log.moods[m.key]],
        `summary__row--rating-${log.moods[m.key]}`,
      ],
    ),
    ['physical', 'Body', physical.length ? physical.join(', ') : 'Nothing'],
    ['sleep', 'Sleep', capitalize(log.sleep)],
    ['energy', 'Energy', capitalize(log.energy)],
    ['cravings', 'Cravings', capitalize(log.cravings)],
  ]
  const saved = new Date(log.loggedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <>
      <dl className="summary">
        {rows.map(([key, label, value, extra]) => (
          <div key={key} className={`summary__row${extra ? ` ${extra}` : ''}`}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="summary__meta">
        Saved {saved}
        {log.backfilled ? ' (filled in later)' : ''}
      </p>
    </>
  )
}
