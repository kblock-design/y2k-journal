import type { PetHealth, PetStage, PetStatus } from '../logic/pet'
import { plural } from './format'

// Placeholder art. Replace the contents of this component to change how the pet looks;
// nothing else in the app depends on its markup.

const STAGE_ART: Record<PetStage, string> = {
  egg: '🥚',
  baby: '🐣',
  teen: '🐤',
  adult: '🐥',
}

const HEALTH_BADGE: Record<PetHealth, string | null> = {
  happy: null,
  sad: '💧',
  sick: '🤒',
  critical: '🚨',
  dead: null,
}

const HEALTH_LABEL: Record<PetHealth, string> = {
  happy: 'Happy',
  sad: 'Sad',
  sick: 'Sick',
  critical: 'Critical',
  dead: 'Gone',
}

interface Props {
  status: PetStatus
  name: string
}

export function PetView({ status, name }: Props) {
  const art = status.health === 'dead' ? '👻' : STAGE_ART[status.stage]
  const badge = HEALTH_BADGE[status.health]
  return (
    <section
      className={`pet pet--${status.health} pet--${status.stage}`}
      aria-label={`${name}, ${HEALTH_LABEL[status.health].toLowerCase()} ${status.stage}`}
    >
      <div className="pet__stage">
        <span className="pet__art" aria-hidden="true">
          {art}
        </span>
        {badge && (
          <span className="pet__badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </div>
      <div className="pet__body">
        <h2 className="pet__name">{name}</h2>
        <p className="pet__stats">
          {HEALTH_LABEL[status.health]} · {plural(status.streak, 'day')} streak · {plural(status.ageDays, 'day')} old
        </p>
        <p className="pet__message">{status.message}</p>
      </div>
    </section>
  )
}
