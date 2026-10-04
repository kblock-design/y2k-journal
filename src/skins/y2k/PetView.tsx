import type { PetHealth, PetStatus } from '../../logic/pet'
import { plural } from '../../core/format'
import { PetDevice } from './pet'
import './pet/pet.css'

// The home-screen pet: a keychain virtual-pet toy (src/skins/y2k/pet/Device.tsx) with a pixel
// speech bubble and a name tag beside it. Sprites live in src/skins/y2k/pet/sprites.ts.

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
  const label = HEALTH_LABEL[status.health]
  return (
    <section
      className={`tama tama--${status.health} tama--${status.stage}`}
      aria-label={`${name}, ${label.toLowerCase()} ${status.stage}`}
    >
      <div className="tama__scene">
        <PetDevice status={status} />
        <div className="tama__side">
          <p className="tama__bubble">
            <svg className="tama__bubble-tail" width="12" height="9" viewBox="0 0 4 3" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
              <path className="tama__bubble-tail-ink" d="M2 0h1v1h-1zM1 1h1v1h-1zM0 2h3v1h-3z" />
              <path className="tama__bubble-tail-fill" d="M3 0h1v3h-1zM2 1h1v1h-1z" />
            </svg>
            {status.message}
          </p>
          <div className="tama__tag">
            <h2 className="tama__name">{name}</h2>
            <dl className="tama__stats">
              <div>
                <dt>Status</dt>
                <dd className="tama__status">{label}</dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd>{plural(status.streak, 'day')}</dd>
              </div>
              <div>
                <dt>Age</dt>
                <dd>{plural(status.ageDays, 'day')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
