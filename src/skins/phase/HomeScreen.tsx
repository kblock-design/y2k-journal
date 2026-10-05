import { useMemo } from 'react'
import { dailyFact, dailyQuote } from '../../core/daily'
import { ErrorBoundary } from '../../core/ErrorBoundary'
import { formatDay, PHASE_LABELS, plural } from '../../core/format'
import { useCycleStatus, useStreaks } from '../../core/stats'
import type { DayLog, ISODate, Settings } from '../../types'
import { CycleRing } from './CycleRing'
import { Icon } from './icons'
import { currentCyclePhases, estimatedCyclePhases, phaseRuns, ringGeometry } from './ring'
import { Shape } from './shapes'
import type { ShapeKind, Tone } from './shapes'
import { PHASE_TONE } from './tones'
import { SectionError, Wordmark } from './ui'

interface Props {
  logs: DayLog[]
  settings: Settings
  today: ISODate
  now: Date
  todayLogged: boolean
  noLogsYet: boolean
  onCheckin: () => void
  onOpenSettings: () => void
}

function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 5) return 'Hello, night owl'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Hello, night owl'
}

export function HomeScreen(props: Props) {
  const { today, todayLogged, noLogsYet, onCheckin } = props
  return (
    <div className="ph-screen ph-home">
      <header className="ph-home__top">
        <Wordmark />
        <span className="ph-datepill">{formatDay(today)}</span>
      </header>
      <h1 className="ph-home__hello">{greeting(props.now)}</h1>

      {noLogsYet && <Welcome onOpenSettings={props.onOpenSettings} />}

      <ErrorBoundary label="Cycle" fallback={(e, retry) => <SectionError title="Your cycle didn’t load" error={e} onRetry={retry} />}>
        <CycleHero logs={props.logs} settings={props.settings} today={today} />
      </ErrorBoundary>

      <CheckinAction todayLogged={todayLogged} onCheckin={onCheckin} />

      {!noLogsYet && (
        <ErrorBoundary label="Streak" fallback={(e, retry) => <SectionError title="Your streak didn’t load" error={e} onRetry={retry} />}>
          <Rhythm logs={props.logs} settings={props.settings} today={today} />
        </ErrorBoundary>
      )}

      <QuoteCard today={today} />
      <FactCard today={today} />
    </div>
  )
}

function Welcome({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <section className="ph-card ph-welcome" aria-labelledby="ph-welcome-title">
      <div className="ph-welcome__shapes" aria-hidden="true">
        <Shape kind="star" tone="blue" rotate={-8} />
        <Shape kind="clover" tone="green" />
        <Shape kind="heart" tone="pink" rotate={8} />
      </div>
      <h2 id="ph-welcome-title" className="ph-welcome__title">
        Welcome to Phase
      </h2>
      <p className="ph-welcome__text">
        Check in each evening and Phase learns your rhythm: your cycle, your moods and how they move together.
        Everything stays on this phone.
      </p>
      <p className="ph-welcome__text ph-welcome__text--small">
        Moving from another phone?{' '}
        <button type="button" className="ph-link" onClick={onOpenSettings}>
          Import a backup in Settings
        </button>
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Cycle ring hero
// ---------------------------------------------------------------------------

function nextPeriodLine(days: number | null, nextPeriod: ISODate | null): string | null {
  if (days === null) return null
  if (days > 1) return `Next period in ${days} days${nextPeriod ? ` · ${formatDay(nextPeriod)}` : ''}`
  if (days === 1) return 'Next period expected tomorrow'
  if (days === 0) return 'Period expected today'
  return `Period ${plural(-days, 'day')} late`
}

function CycleHero({ logs, settings, today }: { logs: DayLog[]; settings: Settings; today: ISODate }) {
  const status = useCycleStatus(logs, today, settings)
  const { cycleDay, cycleLength } = status
  const dayPhases = useMemo(
    () => (cycleDay === null ? [] : currentCyclePhases(logs, settings, today, cycleDay, cycleLength)),
    [logs, settings, today, cycleDay, cycleLength],
  )
  const geo = ringGeometry(dayPhases, cycleDay, cycleLength)

  if (cycleDay === null || !geo) return <EmptyHero settings={settings} />

  const runs = phaseRuns(dayPhases)
  const days = status.daysUntilNextPeriod
  const next = nextPeriodLine(days, status.nextPeriod)
  const phase = status.phase
  const late = days !== null && days < 0

  return (
    <section className={`ph-hero${late ? ' is-late' : ''}`} aria-labelledby="ph-hero-title">
      <h2 id="ph-hero-title" className="visually-hidden">
        Your cycle
      </h2>
      <div className={`ph-ring ph-tone--${phase ? PHASE_TONE[phase] : 'pink'}`}>
        <div className="ph-ring__orb" aria-hidden="true" />
        <CycleRing geo={geo} />
        <div className="ph-ring__centre">
          <p className="ph-ring__day">
            <span className="ph-ring__label">Day</span>{' '}
            <span className="ph-ring__num">{cycleDay}</span>
            <span className="visually-hidden">
              {' '}
              of {status.usingDefault ? 'an estimated' : 'about'} {cycleLength}
            </span>
          </p>
          {phase && (
            <p className={`ph-phase-pill ph-phase-pill--light ph-tone--${PHASE_TONE[phase]}`}>
              <span className="ph-dot" aria-hidden="true" />
              {PHASE_LABELS[phase]}
            </p>
          )}
        </div>
      </div>

      <ul className="ph-ring-key" aria-label="Phases this cycle">
        {runs.map((r) =>
          r.phase ? (
            <li key={r.startDay} className="ph-ring-key__item">
              <span className={`ph-dot ph-tone--${PHASE_TONE[r.phase]}`} aria-hidden="true" />
              <span className="ph-ring-key__name">{PHASE_LABELS[r.phase]}</span>
              <span className="ph-ring-key__days">
                {r.days === 1 ? `day ${r.startDay}` : `days ${r.startDay}–${r.startDay + r.days - 1}`}
              </span>
            </li>
          ) : null,
        )}
      </ul>

      {next && (
        <p className={`ph-next${late ? ' is-late' : ''}`}>
          <Icon name="drop" size={18} />
          <span>{next}</span>
          {status.usingDefault && (
            <span className="ph-chip ph-chip--quiet" title={`Based on a ${cycleLength}-day cycle until you’ve logged a full one`}>
              estimate
            </span>
          )}
        </p>
      )}
    </section>
  )
}

function EmptyHero({ settings }: { settings: Settings }) {
  const preview = ringGeometry(
    estimatedCyclePhases(settings.defaultCycleLength, settings.defaultPeriodLength),
    1,
    settings.defaultCycleLength,
  )
  return (
    <section className="ph-hero ph-hero--empty" aria-labelledby="ph-hero-title">
      <div className="ph-ring ph-tone--pink">
        <div className="ph-ring__orb" aria-hidden="true" />
        {preview && <CycleRing geo={preview} showToday={false} />}
        <div className="ph-ring__centre">
          <h2 id="ph-hero-title" className="ph-ring__empty">
            No period logged yet
          </h2>
        </div>
      </div>
      <p className="ph-hero__note ph-hero__note--lead">
        When your period starts, pick a flow in your check-in. Your cycle ring fills in from there.
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Check-in call to action
// ---------------------------------------------------------------------------

function CheckinAction({ todayLogged, onCheckin }: { todayLogged: boolean; onCheckin: () => void }) {
  if (todayLogged) {
    return (
      <section className="ph-done" aria-label="Today’s check-in">
        <span className="ph-done__tick" aria-hidden="true">
          <Icon name="check" size={22} />
        </span>
        <p className="ph-done__text">
          <strong>Today’s check-in is done</strong>
          <span>Nice. See you tomorrow evening.</span>
        </p>
        <button type="button" className="ph-btn ph-btn--outline ph-btn--sm" onClick={onCheckin}>
          Edit today
        </button>
      </section>
    )
  }
  return (
    <button type="button" className="ph-btn ph-btn--primary ph-btn--hero" onClick={onCheckin}>
      <span className="ph-btn__bubble" aria-hidden="true">
        <Icon name="plus" size={22} />
      </span>
      <span>Check in</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Streak shapes
// ---------------------------------------------------------------------------

function Rhythm({ logs, settings, today }: { logs: DayLog[]; settings: Settings; today: ISODate }) {
  const s = useStreaks(logs, today, settings)
  const status = useCycleStatus(logs, today, settings)
  const items: { kind: ShapeKind; tone: Tone; rotate: number; label: string; value: number; spoken: string }[] = [
    { kind: 'star', tone: 'yellow', rotate: 0, label: 'streak', value: s.current, spoken: `Current streak: ${plural(s.current, 'day')}` },
    {
      kind: 'clover',
      tone: 'green',
      rotate: 0,
      label: 'best',
      value: s.longest.days,
      spoken: `Longest streak: ${plural(s.longest.days, 'day')}`,
    },
    { kind: 'heart', tone: 'pink', rotate: -6, label: 'logged', value: s.daysLogged, spoken: `Days logged: ${s.daysLogged}` },
    {
      kind: 'plus',
      tone: 'blue',
      rotate: 8,
      label: 'cycle',
      value: status.cycleLength,
      spoken: `Cycle length: ${status.cycleLength} days${status.usingDefault ? ' (estimate)' : ''}`,
    },
  ]

  let note: string
  if (s.current === 0) note = 'Check in tonight to start a fresh streak.'
  else if (!s.loggedToday) note = `Check in tonight to make it ${s.current + 1} in a row.`
  else if (s.longest.isCurrent && s.current > 1) note = `${s.current} days in a row, your best run yet.`
  else note = `${plural(s.current, 'day')} in a row, today included.`

  return (
    <section className="ph-rhythm" aria-labelledby="ph-rhythm-title">
      <h2 id="ph-rhythm-title" className="ph-h2">
        Your rhythm
      </h2>
      <ul className="ph-shapes">
        {items.map((it) => (
          <li key={it.label} className={`ph-shapes__item ph-shapes__item--${it.kind} ph-tone--${it.tone}`}>
            <Shape kind={it.kind} tone={it.tone} rotate={it.rotate} />
            <span className="ph-shapes__text" aria-hidden="true">
              <span className="ph-shapes__label">{it.label}</span>
              <span className="ph-shapes__num">{it.value}</span>
            </span>
            <span className="visually-hidden">{it.spoken}</span>
          </li>
        ))}
      </ul>
      <p className="ph-rhythm__note">{note}</p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Daily cards
// ---------------------------------------------------------------------------

function QuoteCard({ today }: { today: ISODate }) {
  const q = dailyQuote(today)
  return (
    <figure className="ph-card ph-quote">
      <Shape kind="heart" tone="pink" rotate={14} className="ph-quote__shape" />
      <p className="ph-kicker">Today’s quote</p>
      <blockquote className="ph-quote__text">“{q.text}”</blockquote>
      <figcaption className="ph-quote__by">{q.by}</figcaption>
    </figure>
  )
}

function FactCard({ today }: { today: ISODate }) {
  return (
    <aside className="ph-card ph-fact" aria-labelledby="ph-fact-title">
      <span className="ph-fact__badge" aria-hidden="true">
        <Shape kind="clover" tone="yellow" />
        <span className="ph-fact__q">?</span>
      </span>
      <div className="ph-fact__body">
        <h2 id="ph-fact-title" className="ph-kicker">
          Did you know?
        </h2>
        <p className="ph-fact__text">{dailyFact(today)}</p>
      </div>
    </aside>
  )
}
