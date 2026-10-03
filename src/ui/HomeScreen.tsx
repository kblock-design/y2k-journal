import { useMemo, useState } from 'react'
import { cycleStatus } from '../logic/cycle'
import type { PetStatus } from '../logic/pet'
import type { DayLog, ISODate, Pet, Settings } from '../types'
import { ErrorBoundary } from './ErrorBoundary'
import { formatLongDate, PHASE_LABELS, plural } from './format'
import { HatchForm } from './HatchForm'
import { PetView } from './PetView'
import { dailyFact, dailyQuote } from './daily'

interface Props {
  settings: Settings
  logs: DayLog[]
  pets: Pet[]
  currentPet: Pet | undefined
  petStatus: PetStatus | null
  today: ISODate
  todayLogged: boolean
  onCheckin: () => void
  onHatch: (name: string) => Promise<void>
  onOpenSettings: () => void
}

export function HomeScreen(props: Props) {
  const { pets, currentPet, petStatus, todayLogged, onCheckin, onHatch } = props

  if (pets.length === 0) {
    return (
      <div className="screen screen--home screen--first-run">
        <HatchForm
          title="Hatch your pet"
          intro="Your pet stays healthy when you check in every night. Skip, and it gets sick."
          onHatch={onHatch}
        />
        <p className="hint">
          Moving from another phone?{' '}
          <button type="button" className="btn btn--link btn--inline" onClick={props.onOpenSettings}>
            Import a backup in Settings
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="screen screen--home">
      <ErrorBoundary label="Cycle info">
        <CycleCard settings={props.settings} logs={props.logs} today={props.today} />
      </ErrorBoundary>

      <section className={`card checkin-card${todayLogged ? ' checkin-card--done' : ''}`}>
        {todayLogged ? (
          <>
            <p className="checkin-card__done">✓ Today’s check-in is done</p>
            <button type="button" className="btn btn--link" onClick={onCheckin}>
              Edit today
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--primary btn--block btn--big" onClick={onCheckin}>
            Check in
          </button>
        )}
      </section>

      <blockquote className="card quote">{dailyQuote(props.today)}</blockquote>

      {currentPet && petStatus ? (
        <PetView status={petStatus} name={currentPet.name} />
      ) : (
        <Memorial pets={pets} onHatch={onHatch} />
      )}

      <p className="card fact">
        <span className="fact__label">Fun fact</span>
        {dailyFact(props.today)}
      </p>
    </div>
  )
}

function Memorial({ pets, onHatch }: { pets: Pet[]; onHatch: (name: string) => Promise<void> }) {
  const [hatching, setHatching] = useState(false)
  const last = pets[pets.length - 1]

  if (hatching) {
    return (
      <HatchForm
        title="Hatch a new pet"
        intro="A fresh start. Check in every night to keep this one healthy."
        onHatch={onHatch}
        onCancel={() => setHatching(false)}
      />
    )
  }

  return (
    <section className="card memorial">
      <div className="memorial__art" aria-hidden="true">
        🪦
      </div>
      <h2 className="memorial__name">In memory of {last.name}</h2>
      <p className="memorial__dates">
        {formatLongDate(last.bornOn)} – {last.diedOn ? formatLongDate(last.diedOn) : '?'}
      </p>
      <p className="memorial__note">Check-ins still count while you decide.</p>
      <button type="button" className="btn btn--secondary btn--block" onClick={() => setHatching(true)}>
        Hatch a new one
      </button>
    </section>
  )
}

function CycleCard({ settings, logs, today }: { settings: Settings; logs: DayLog[]; today: ISODate }) {
  const status = useMemo(() => cycleStatus(logs, today, settings), [logs, today, settings])

  if (status.cycleDay === null) {
    return (
      <section className="card cycle cycle--empty">
        <h2 className="cycle__title">Your cycle</h2>
        <p className="cycle__empty">
          No period logged yet. When it starts, pick a flow in your check-in and predictions will
          appear here.
        </p>
      </section>
    )
  }

  const days = status.daysUntilNextPeriod
  let nextLine: string | null = null
  if (days !== null) {
    if (days > 1) nextLine = `Next period in ${days} days`
    else if (days === 1) nextLine = 'Next period expected tomorrow'
    else if (days === 0) nextLine = 'Period expected today'
    else nextLine = `${plural(-days, 'day')} late`
  }

  return (
    <section className={`card cycle${status.phase ? ` cycle--${status.phase}` : ''}`}>
      <div className="cycle__head">
        <h2 className="cycle__day">Day {status.cycleDay}</h2>
        {status.usingDefault && (
          <span className="tag tag--estimate" title={`Based on a ${status.cycleLength}-day cycle`}>
            estimate
          </span>
        )}
      </div>
      {status.phase && (
        <p className="cycle__phase">
          <span className={`phase-swatch phase-swatch--${status.phase}`} aria-hidden="true" />
          {PHASE_LABELS[status.phase]} phase
        </p>
      )}
      {nextLine && <p className={`cycle__next${days !== null && days < 0 ? ' is-late' : ''}`}>{nextLine}</p>}
    </section>
  )
}
