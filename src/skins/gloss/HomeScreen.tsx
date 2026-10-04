import { useMemo } from 'react'
import { dailyFact, dailyQuote } from '../../core/daily'
import { ErrorBoundary } from '../../core/ErrorBoundary'
import { formatDay, PHASE_LABELS, plural } from '../../core/format'
import { useCycleStatus, useStreaks } from '../../core/stats'
import type { DayLog, ISODate, Settings } from '../../types'
import { CycleDisc } from './CycleDisc'
import { lastSevenDays, nextPeriodLine, streakLine } from './home'
import { Icon } from './icons'
import { currentCyclePhases, discGeometry, estimatedCyclePhases, lcdDigits, phaseRuns } from './ring'
import { PHASE_TONE } from './tones'
import { HoloChip, Kicker, Lcd, SectionError, Stamp, Wordmark } from './ui'

interface Props {
  logs: DayLog[]
  settings: Settings
  today: ISODate
  todayLogged: boolean
  noLogsYet: boolean
  onCheckin: () => void
  onOpenSettings: () => void
}

export function HomeScreen(props: Props) {
  const { logs, settings, today, todayLogged, noLogsYet, onCheckin } = props
  return (
    <div className="gl-screen gl-home">
      <div className="gl-home__sphere" aria-hidden="true" />
      <header className="gl-home__top">
        <Wordmark />
        <span className="gl-datepill">{formatDay(today)}</span>
      </header>
      <h1 className="visually-hidden">Today</h1>

      {noLogsYet && <Welcome onOpenSettings={props.onOpenSettings} />}

      <ErrorBoundary label="Cycle" fallback={(e, retry) => <SectionError title="Your cycle didn’t load" error={e} onRetry={retry} />}>
        <CycleHero logs={logs} settings={settings} today={today} />
      </ErrorBoundary>

      <CheckinAction todayLogged={todayLogged} onCheckin={onCheckin} />

      {!noLogsYet && (
        <ErrorBoundary label="Streak" fallback={(e, retry) => <SectionError title="Your streak didn’t load" error={e} onRetry={retry} />}>
          <StreakCard logs={logs} settings={settings} today={today} />
        </ErrorBoundary>
      )}

      <QuoteNote today={today} />
      <FactCard today={today} />
    </div>
  )
}

function Welcome({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <section className="gl-card gl-welcome" aria-labelledby="gl-welcome-title">
      <Kicker>New journal</Kicker>
      <h2 id="gl-welcome-title" className="gl-welcome__title">
        Welcome to Gloss
      </h2>
      <p className="gl-welcome__text">
        Check in each evening and Gloss learns your rhythm: your cycle, your moods and how they move together. It all
        stays on this phone.
      </p>
      <p className="gl-welcome__text gl-welcome__text--small">
        Moving from another phone?{' '}
        <button type="button" className="gl-link" onClick={onOpenSettings}>
          Import a backup in Settings
        </button>
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Cycle disc hero
// ---------------------------------------------------------------------------

function CycleHero({ logs, settings, today }: { logs: DayLog[]; settings: Settings; today: ISODate }) {
  const status = useCycleStatus(logs, today, settings)
  const { cycleDay, cycleLength } = status
  const dayPhases = useMemo(
    () => (cycleDay === null ? [] : currentCyclePhases(logs, settings, today, cycleDay, cycleLength)),
    [logs, settings, today, cycleDay, cycleLength],
  )
  const geo = discGeometry(dayPhases, cycleDay, cycleLength)
  if (cycleDay === null || !geo) return <EmptyHero settings={settings} />

  const runs = phaseRuns(dayPhases).filter((r) => r.phase !== null)
  const days = status.daysUntilNextPeriod
  const next = nextPeriodLine(days, status.nextPeriod)
  const phase = status.phase
  const late = days !== null && days < 0

  return (
    <section className="gl-card gl-hero" aria-labelledby="gl-hero-title">
      <h2 id="gl-hero-title" className="visually-hidden">
        Your cycle
      </h2>
      <CycleDisc geo={geo}>
        <Lcd
          size="xl"
          label="Day"
          value={lcdDigits(cycleDay)}
          spoken={`Day ${cycleDay} of ${status.usingDefault ? 'an estimated' : 'about'} ${cycleLength}`}
          className="gl-hero__lcd"
        />
      </CycleDisc>

      <div className="gl-hero__meta">
        {phase && (
          <p className={`gl-phase-pill gl-tone--${PHASE_TONE[phase]}`}>
            <span className="gl-dot" aria-hidden="true" />
            {PHASE_LABELS[phase]} phase
          </p>
        )}
        {next && (
          <p className={`gl-next${late ? ' is-late' : ''}`}>
            <Icon name="drop" size={18} />
            <span>{next}</span>
            {status.usingDefault && <HoloChip title={`Based on a ${cycleLength}-day cycle until you’ve logged a full one`}>estimate</HoloChip>}
          </p>
        )}
      </div>

      <hr className="gl-hairline" />

      <ul className="gl-disc-key" aria-label="Phases this cycle">
        {runs.map((r) =>
          r.phase ? (
            <li key={r.startDay} className="gl-disc-key__item">
              <span className={`gl-dot gl-tone--${PHASE_TONE[r.phase]}`} aria-hidden="true" />
              <span className="gl-disc-key__name">{PHASE_LABELS[r.phase]}</span>
              <span className="gl-disc-key__days">
                {r.days === 1 ? `day ${r.startDay}` : `days ${r.startDay}–${r.startDay + r.days - 1}`}
              </span>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  )
}

function EmptyHero({ settings }: { settings: Settings }) {
  const preview = discGeometry(
    estimatedCyclePhases(settings.defaultCycleLength, settings.defaultPeriodLength),
    1,
    settings.defaultCycleLength,
  )
  return (
    <section className="gl-card gl-hero gl-hero--empty" aria-labelledby="gl-hero-title">
      {preview && (
        <CycleDisc geo={preview} showToday={false}>
          <Lcd size="xl" label="Day" value="--" className="gl-hero__lcd" />
        </CycleDisc>
      )}
      <div className="gl-hero__meta">
        <h2 id="gl-hero-title" className="gl-hero__empty-title">
          No period logged yet
        </h2>
        <p className="gl-hero__note">When it starts, choose a flow in your check-in and the disc fills in from there.</p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Check-in action
// ---------------------------------------------------------------------------

function CheckinAction({ todayLogged, onCheckin }: { todayLogged: boolean; onCheckin: () => void }) {
  if (todayLogged) {
    return (
      <section className="gl-card gl-done" aria-labelledby="gl-done-title">
        <h2 id="gl-done-title" className="gl-done__head">
          <Stamp word="LOGGED" label="Logged" />
        </h2>
        <button type="button" className="gl-btn gl-btn--chrome gl-btn--sm gl-done__edit" onClick={onCheckin}>
          Edit today
        </button>
        <p className="gl-done__text">Today’s check-in is done. See you tomorrow evening.</p>
      </section>
    )
  }
  return (
    <button type="button" className="gl-gel gl-gel--hero" onClick={onCheckin}>
      <span className="gl-gel__bead" aria-hidden="true">
        <Icon name="plus" size={22} />
      </span>
      <span className="gl-gel__stack">
        <span>Check in</span>
        <span className="gl-gel__sub">About a minute</span>
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

function StreakCard({ logs, settings, today }: { logs: DayLog[]; settings: Settings; today: ISODate }) {
  const s = useStreaks(logs, today, settings)
  const week = useMemo(() => lastSevenDays(logs, today), [logs, today])
  const note = streakLine(s.current, s.loggedToday, s.longest.isCurrent)

  return (
    <section className="gl-card gl-streak" aria-labelledby="gl-streak-title">
      <Kicker as="h2" id="gl-streak-title">
        Streak
      </Kicker>
      <div className="gl-streak__row">
        <Lcd size="lg" value={lcdDigits(s.current)} unit={s.current === 1 ? 'day' : 'days'} spoken={`Current streak: ${plural(s.current, 'day')}`} />
        <div className="gl-streak__text">
          <p className="gl-streak__note">{note}</p>
          <p className="gl-streak__sub">
            Best {plural(s.longest.days, 'day')} · {s.daysLogged} logged
          </p>
        </div>
      </div>
      <ol className="gl-week" aria-label="Last seven days">
        {week.map((d) => (
          <li key={d.date} className={`gl-week__day${d.logged ? ' is-logged' : ''}${d.isToday ? ' is-today' : ''}`}>
            <span className="gl-week__letter" aria-hidden="true">
              {d.letter}
            </span>
            <span className="gl-week__pip" aria-hidden="true" />
            <span className="visually-hidden">
              {formatDay(d.date)}: {d.logged ? 'checked in' : d.isToday ? 'not yet' : 'no check-in'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Daily cards
// ---------------------------------------------------------------------------

/** The daily quote on a blush sticky note held by a strip of tape. */
function QuoteNote({ today }: { today: ISODate }) {
  const q = dailyQuote(today)
  return (
    <figure className="gl-sticky">
      <span className="gl-sticky__tape" aria-hidden="true" />
      <Kicker>Today’s quote</Kicker>
      <blockquote className="gl-sticky__text">“{q.text}”</blockquote>
      <figcaption className="gl-sticky__by">— {q.by}</figcaption>
    </figure>
  )
}

function FactCard({ today }: { today: ISODate }) {
  return (
    <aside className="gl-card gl-fact" aria-labelledby="gl-fact-title">
      <Kicker as="h2" id="gl-fact-title">
        Did you know?
      </Kicker>
      <p className="gl-fact__text">{dailyFact(today)}</p>
    </aside>
  )
}
