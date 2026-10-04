import { useState } from 'react'
import { useCycleStatus } from '../../core/stats'
import { diffDays } from '../../logic/dates'
import { stageForAge } from '../../logic/pet'
import type { PetStatus } from '../../logic/pet'
import type { DayLog, ISODate, Pet, Settings } from '../../types'
import { ErrorBoundary } from './ErrorBoundary'
import { formatLongDate, PHASE_LABELS, plural } from '../../core/format'
import { HatchForm } from './HatchForm'
import { PetSprite } from './pet'
import { PetView } from './PetView'
import { PixelIcon } from './PixelIcon'
import { RhinestoneRow } from './stickers'
import { ThemedSticker } from './ThemedSticker'
import { Window } from './Window'
import { dailyFact, dailyQuote } from '../../core/daily'
import './quote.css'

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
        <p className="hint hint--desktop">
          Moving from another phone?{' '}
          <button type="button" className="btn btn--link btn--inline" onClick={props.onOpenSettings}>
            Import a backup in Settings
          </button>
        </p>
      </div>
    )
  }

  const quote = dailyQuote(props.today)

  return (
    <div className="screen screen--home">
      <ErrorBoundary label="Cycle info">
        <CycleCard settings={props.settings} logs={props.logs} today={props.today} />
      </ErrorBoundary>

      <section className={`checkin-card${todayLogged ? ' checkin-card--done' : ''}`}>
        {todayLogged ? (
          <div className="checkin-card__panel">
            <p className="checkin-card__done">✓ Today’s check-in is done</p>
            <button type="button" className="btn btn--secondary btn--small" onClick={onCheckin}>
              Edit today
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--primary btn--block btn--big btn--start" onClick={onCheckin}>
            <span className="btn--start__icon" aria-hidden="true">
              <PixelIcon name="heart" scale={3} />
            </span>
            <span className="btn--start__label">Check in</span>
            <span className="btn--start__sparkle btn--start__sparkle--a" aria-hidden="true" />
            <span className="btn--start__sparkle btn--start__sparkle--b" aria-hidden="true" />
          </button>
        )}
      </section>

      <figure className="note">
        <span className="note__tape" aria-hidden="true" />
        <blockquote className="quote">{quote.text}</blockquote>
        <figcaption className="quote__by">{quote.by}</figcaption>
        <span className="note__sticker" aria-hidden="true">
          <ThemedSticker name="lips" size={44} rotate={14} />
        </span>
      </figure>

      <div className="home__pet">
        {currentPet && petStatus ? (
          <PetView status={petStatus} name={currentPet.name} />
        ) : (
          <Memorial pets={pets} onHatch={onHatch} />
        )}
      </div>

      <Window
        as="aside"
        tone="chrome"
        icon="info"
        title="Did you know?"
        className="fact-dialog"
        tilt={1.2}
        stickers={[{ name: 'cherry', corner: 'bl', size: 38, rotate: -14 }]}
      >
        <div className="fact-dialog__row">
          <PixelIcon name="info" scale={3} className="fact-dialog__icon" />
          <p className="fact">
            <span className="fact__label">Fun fact</span>
            {dailyFact(props.today)}
          </p>
        </div>
        <div className="fact-dialog__actions" aria-hidden="true">
          <span className="fake-btn">OK</span>
        </div>
      </Window>
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

  const stage = stageForAge(last.diedOn ? diffDays(last.bornOn, last.diedOn) : 0)

  return (
    <Window
      tone="chrome"
      icon="tomb"
      title="memorial.txt"
      className="memorial"
      status="R.I.P. ♥ gone but not forgotten"
      stickers={[{ name: 'flower', corner: 'tr', size: 42, rotate: 12 }]}
    >
      <div className="memorial__art" aria-hidden="true">
        <PetSprite stage={stage} health="dead" size={84} />
      </div>
      <h2 className="memorial__name">In memory of {last.name}</h2>
      <p className="memorial__dates">
        {formatLongDate(last.bornOn)} – {last.diedOn ? formatLongDate(last.diedOn) : '?'}
      </p>
      <p className="memorial__note">Check-ins still count while you decide.</p>
      <button type="button" className="btn btn--secondary btn--block" onClick={() => setHatching(true)}>
        Hatch a new one
      </button>
    </Window>
  )
}

function CycleCard({ settings, logs, today }: { settings: Settings; logs: DayLog[]; today: ISODate }) {
  const status = useCycleStatus(logs, today, settings)

  if (status.cycleDay === null) {
    return (
      <Window
        icon="heart"
        title="my_cycle.exe"
        className="cycle cycle--empty"
        menu={['File', 'Edit', 'View', 'Help']}
        status="Waiting for your first period…"
        stickers={[{ name: 'gem', corner: 'br', size: 42, rotate: 14 }]}
      >
        <h2 className="cycle__title">Your cycle</h2>
        <p className="cycle__empty">
          No period logged yet. When it starts, pick a flow in your check-in and predictions will
          appear here.
        </p>
      </Window>
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
    <Window
      icon="heart"
      title="my_cycle.exe"
      className={`cycle${status.phase ? ` cycle--${status.phase}` : ''}`}
      menu={['File', 'Edit', 'View', 'Help']}
      status={`Cycle length: ${status.cycleLength} days`}
      tilt={-0.6}
      stickers={[{ name: 'gem', corner: 'br', size: 42, rotate: 14 }]}
    >
      <div className="cycle__head">
        <h2 className="cycle__day">
          <span className="cycle__day-label">Day</span> <span className="cycle__day-num">{status.cycleDay}</span>
        </h2>
        {status.usingDefault && (
          <span className="tag tag--estimate" title={`Based on a ${status.cycleLength}-day cycle`}>
            estimate
          </span>
        )}
      </div>
      <RhinestoneRow count={9} className="cycle__gems" />
      {status.phase && (
        <p className={`cycle__phase cycle__phase--${status.phase}`}>
          <span className={`phase-swatch phase-swatch--${status.phase}`} aria-hidden="true" />
          {PHASE_LABELS[status.phase]} phase
        </p>
      )}
      {nextLine && <p className={`cycle__next${days !== null && days < 0 ? ' is-late' : ''}`}>{nextLine}</p>}
    </Window>
  )
}
